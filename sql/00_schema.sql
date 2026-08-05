-- ============================================================================
-- ShopSphere-DBMS · 00_schema.sql
-- ----------------------------------------------------------------------------
-- Complete DDL for the ShopSphere e-commerce database.
--
-- Design principles demonstrated here:
--   1. Normalization (3NF)  - every table stores one entity, no redundancy
--   2. Referential integrity - every FK enforces a real business relationship
--   3. Domain integrity      - CHECK constraints + ENUM types guard bad data
--   4. Performance           - indexes tuned to the queries that matter
--   5. Auditability          - log tables + triggers record every mutation
--
-- Run order:  00_schema.sql → 01_functions.sql → 02_procedures.sql
--             03_triggers.sql → 04_views.sql → 05_analytics.sql
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. DOMAIN TYPES (enums keep statuses honest & readable)
-- ---------------------------------------------------------------------------

-- Lifecycle of an order as it moves through the pipeline
CREATE TYPE order_status_enum  AS ENUM ('Pending', 'Shipped', 'Delivered', 'Cancelled');
-- 'Pending' exists in the shipped dataset (payments awaiting settlement)
CREATE TYPE payment_status_enum AS ENUM ('Completed', 'Pending', 'Failed');
CREATE TYPE payment_mode_enum   AS ENUM ('Credit Card', 'Gift Card', 'PayPal');
CREATE TYPE delivery_status_enum AS ENUM ('Pending', 'In Transit', 'Delivered');

-- ---------------------------------------------------------------------------
-- 2. BASE TABLES  (9 entities in 3NF)
-- ---------------------------------------------------------------------------

-- Catalog grouping: products belong to exactly one category
CREATE TABLE category (
    category_id   INT          PRIMARY KEY,
    category_name VARCHAR(20)  NOT NULL UNIQUE
);

COMMENT ON TABLE  category IS 'Product taxonomy - one-to-many parent of products';

-- Core product catalog. price/cogs are money (never floats), both non-negative.
-- NOTE: a hard CHECK (price >= cogs) was deliberately NOT added because the
-- shipped dataset contains legacy products priced below cost - which is exactly
-- the kind of problem a data-quality audit should surface (query 17.3).
CREATE TABLE products (
    product_id   INT           PRIMARY KEY,
    product_name VARCHAR(50)   NOT NULL UNIQUE,
    price        NUMERIC(10,2) NOT NULL CHECK (price >= 0),
    cogs         NUMERIC(10,2) NOT NULL CHECK (cogs >= 0),          -- cost of goods sold
    category_id  INT           NOT NULL,
    CONSTRAINT fk_products_category FOREIGN KEY (category_id)
        REFERENCES category(category_id) ON UPDATE CASCADE
);

COMMENT ON TABLE products IS 'Product catalog with cost-of-goods for margin analytics';

-- Customer master data
CREATE TABLE customers (
    customer_id INT          PRIMARY KEY,
    first_name  VARCHAR(20)  NOT NULL,
    last_name   VARCHAR(20)  NOT NULL,
    state       VARCHAR(100) NOT NULL DEFAULT 'Unknown',
    address     VARCHAR(255) NOT NULL DEFAULT 'Unknown',
    -- Derived, indexed column for fast lookups (demonstrates expression indexes)
    CONSTRAINT chk_customers_name CHECK (length(first_name) > 0 AND length(last_name) > 0)
);

-- Sellers / marketplace merchants
-- NOTE: seller_name is NOT unique on purpose - the real dataset contains
-- duplicate merchant names (different sellers can share a business name),
-- which is itself a data-quality finding surfaced by the analytics library.
CREATE TABLE sellers (
    seller_id   INT         PRIMARY KEY,
    seller_name VARCHAR(50) NOT NULL
);

-- Orders: the central transaction record. Tracks one product per order row.
CREATE TABLE orders (
    order_id     INT               PRIMARY KEY,
    order_date   DATE              NOT NULL DEFAULT CURRENT_DATE,
    customer_id  INT               NOT NULL,
    seller_id    INT               NOT NULL,
    product_id   INT               NOT NULL,
    order_status order_status_enum NOT NULL DEFAULT 'Pending',
    CONSTRAINT fk_orders_customers FOREIGN KEY (customer_id)
        REFERENCES customers(customer_id) ON UPDATE CASCADE,
    CONSTRAINT fk_orders_sellers   FOREIGN KEY (seller_id)
        REFERENCES sellers(seller_id)     ON UPDATE CASCADE,
    CONSTRAINT fk_orders_products  FOREIGN KEY (product_id)
        REFERENCES products(product_id)   ON UPDATE CASCADE,
    -- An order's date cannot be in the future
    CONSTRAINT chk_orders_date CHECK (order_date <= CURRENT_DATE)
);

-- Order line items: quantity * unit price = extended total
CREATE TABLE order_items (
    order_item_id  INT            PRIMARY KEY,
    order_id       INT            NOT NULL,
    product_id     INT            NOT NULL,
    quantity       INT            NOT NULL CHECK (quantity > 0),
    price_per_unit NUMERIC(10,2)  NOT NULL CHECK (price_per_unit >= 0),
    total_price    NUMERIC(12,2)  NOT NULL CHECK (total_price >= 0),
    CONSTRAINT fk_order_items_orders  FOREIGN KEY (order_id)
        REFERENCES orders(order_id)   ON UPDATE CASCADE,
    CONSTRAINT fk_order_items_products FOREIGN KEY (product_id)
        REFERENCES products(product_id) ON UPDATE CASCADE,
    -- One product appears once per order
    CONSTRAINT uq_order_items UNIQUE (order_id, product_id)
);

-- Inventory snapshot per product per warehouse
CREATE TABLE inventory (
    inventory_id    INT  PRIMARY KEY,
    product_id      INT  NOT NULL,
    stock           INT  NOT NULL DEFAULT 0 CHECK (stock >= 0),
    warehouse_id    INT  NOT NULL DEFAULT 1,
    last_stock_date DATE NOT NULL DEFAULT CURRENT_DATE,
    CONSTRAINT fk_inventory_products FOREIGN KEY (product_id)
        REFERENCES products(product_id) ON UPDATE CASCADE
);

-- Payments against an order (mode + status)
CREATE TABLE payments (
    payment_id     INT                PRIMARY KEY,
    order_id       INT                NOT NULL,
    payment_date   DATE               NOT NULL DEFAULT CURRENT_DATE,
    payment_mode   payment_mode_enum  NOT NULL DEFAULT 'Credit Card',
    payment_status payment_status_enum NOT NULL DEFAULT 'Completed',
    CONSTRAINT fk_payments_orders FOREIGN KEY (order_id)
        REFERENCES orders(order_id) ON UPDATE CASCADE
);

-- Shipping / fulfilment record per order
CREATE TABLE shippings (
    shipping_id     INT                  PRIMARY KEY,
    order_id        INT                  NOT NULL,
    shipping_date   DATE                 NOT NULL DEFAULT CURRENT_DATE,
    return_date     DATE                 NULL,          -- NULL until a return is processed
    delivery_status delivery_status_enum NOT NULL DEFAULT 'Pending',
    CONSTRAINT fk_shippings_orders FOREIGN KEY (order_id)
        REFERENCES orders(order_id) ON UPDATE CASCADE,
    -- A return can only happen after the order shipped
    CONSTRAINT chk_shippings_dates CHECK (return_date IS NULL OR return_date >= shipping_date)
);

-- ---------------------------------------------------------------------------
-- 3. AUDIT / LOG TABLES  (fed by triggers in 03_triggers.sql)
-- ---------------------------------------------------------------------------

-- Audit tables deliberately do NOT carry a FK back to their source table:
-- a DELETE audit row must survive even after the source row is gone.
CREATE TABLE order_logs (
    log_id      BIGSERIAL PRIMARY KEY,
    order_id    INT            NOT NULL,                 -- plain column, indexed below
    action      VARCHAR(20)    NOT NULL,                 -- INSERT / UPDATE / DELETE
    old_status  order_status_enum,
    new_status  order_status_enum,
    changed_at  TIMESTAMPTZ    NOT NULL DEFAULT now()
);

-- Per-customer order counters used by the "frequent buyer" analytics
CREATE TABLE customer_order_logs (
    customer_id    INT  NOT NULL REFERENCES customers(customer_id) ON DELETE CASCADE,
    total_orders   INT  NOT NULL DEFAULT 0,
    last_order_date DATE,
    PRIMARY KEY (customer_id)
);

-- Rolling category sales ledger (fed from order_items)
CREATE TABLE category_sales_logs (
    entry_id      BIGSERIAL    PRIMARY KEY,
    category_id   INT          NOT NULL REFERENCES category(category_id),
    product_id    INT          NOT NULL REFERENCES products(product_id),
    quantity      INT          NOT NULL,
    revenue       NUMERIC(12,2) NOT NULL,
    sale_date     DATE         NOT NULL DEFAULT CURRENT_DATE
);

-- ---------------------------------------------------------------------------
-- 4. INDEXES  (tuned for the analytics + playground queries)
-- ---------------------------------------------------------------------------

-- FK lookup indexes
CREATE INDEX idx_products_category   ON products(category_id);
CREATE INDEX idx_orders_customer     ON orders(customer_id);
CREATE INDEX idx_orders_seller       ON orders(seller_id);
CREATE INDEX idx_orders_product      ON orders(product_id);
CREATE INDEX idx_orders_date         ON orders(order_date DESC);
CREATE INDEX idx_order_items_order   ON order_items(order_id);
CREATE INDEX idx_order_items_product ON order_items(product_id);
CREATE INDEX idx_inventory_product   ON inventory(product_id);
CREATE INDEX idx_payments_order      ON payments(order_id);
CREATE INDEX idx_shippings_order     ON shippings(order_id);
CREATE INDEX idx_customers_state     ON customers(state);
CREATE INDEX idx_order_logs_order    ON order_logs(order_id);

-- Partial index: pending orders are the "hot" working set for fulfilment
CREATE INDEX idx_orders_pending
    ON orders(order_id)
    WHERE order_status = 'Pending';

-- Composite index for the most common analytics grouping (state × month)
CREATE INDEX idx_customers_state_name ON customers(state, first_name, last_name);

-- Expression index: case-insensitive product search
CREATE INDEX idx_products_name_lower ON products (LOWER(product_name));

-- ---------------------------------------------------------------------------
-- 5. GENERATED UTILITY TABLE (numbers series - powers the recursive-CTE demos)
-- ---------------------------------------------------------------------------
CREATE TABLE numbers (
    n INT PRIMARY KEY
);

COMMIT;
