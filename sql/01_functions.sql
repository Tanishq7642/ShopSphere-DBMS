-- ============================================================================
-- ShopSphere-DBMS · 01_functions.sql
-- ----------------------------------------------------------------------------
-- Stored business logic. Functions = single logical units of work that
-- RETURN a value; multi-statement transactions live in 02_procedures.sql.
--
-- All functions are SECURITY DEFINER so the web app can run them with a
-- least-privilege role while the underlying logic keeps its privileges.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- MASTER-DATA FUNCTIONS
-- ---------------------------------------------------------------------------

-- Register a new customer. Returns the new customer_id.
CREATE OR REPLACE FUNCTION add_customer(
    p_first_name VARCHAR(20),
    p_last_name  VARCHAR(20),
    p_state      VARCHAR(100),
    p_address    VARCHAR(255) DEFAULT 'Unknown'
) RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_id INT;
BEGIN
    IF length(p_first_name) = 0 OR length(p_last_name) = 0 THEN
        RAISE EXCEPTION 'Customer must have a first and last name';
    END IF;

    SELECT COALESCE(MAX(customer_id), 0) + 1 INTO v_id FROM customers;
    INSERT INTO customers (customer_id, first_name, last_name, state, address)
    VALUES (v_id, p_first_name, p_last_name, p_state, p_address);
    RETURN v_id;
END $$;

-- Delete a customer (cascade-safe: only unused customers can be removed).
CREATE OR REPLACE FUNCTION remove_customer(p_customer_id INT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM orders WHERE customer_id = p_customer_id) THEN
        RAISE EXCEPTION 'Cannot remove customer %: they have order history', p_customer_id;
    END IF;
    DELETE FROM customers WHERE customer_id = p_customer_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Customer % does not exist', p_customer_id;
    END IF;
END $$;

CREATE OR REPLACE FUNCTION add_seller(p_seller_name VARCHAR(50))
RETURNS INT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_id INT;
BEGIN
    SELECT COALESCE(MAX(seller_id), 0) + 1 INTO v_id FROM sellers;
    INSERT INTO sellers (seller_id, seller_name) VALUES (v_id, p_seller_name);
    RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION remove_seller(p_seller_id INT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM orders WHERE seller_id = p_seller_id) THEN
        RAISE EXCEPTION 'Cannot remove seller %: they have order history', p_seller_id;
    END IF;
    DELETE FROM sellers WHERE seller_id = p_seller_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Seller % does not exist', p_seller_id;
    END IF;
END $$;

-- Add a product with its cost of goods sold. Margin sanity-checked.
CREATE OR REPLACE FUNCTION add_product(
    p_name       VARCHAR(50),
    p_price      NUMERIC(10,2),
    p_cogs       NUMERIC(10,2),
    p_category_id INT
) RETURNS INT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_id INT;
BEGIN
    IF p_price < 0 OR p_cogs < 0 THEN
        RAISE EXCEPTION 'Price and COGS must be non-negative';
    END IF;
    IF p_price < p_cogs THEN
        RAISE EXCEPTION 'Selling below cost is not allowed (price % < cogs %)', p_price, p_cogs;
    END IF;
    SELECT COALESCE(MAX(product_id), 0) + 1 INTO v_id FROM products;
    INSERT INTO products (product_id, product_name, price, cogs, category_id)
    VALUES (v_id, p_name, p_price, p_cogs, p_category_id);
    RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION remove_product(p_product_id INT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM order_items WHERE product_id = p_product_id) THEN
        RAISE EXCEPTION 'Cannot remove product %: referenced by order history', p_product_id;
    END IF;
    DELETE FROM products WHERE product_id = p_product_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Product % does not exist', p_product_id;
    END IF;
END $$;

CREATE OR REPLACE FUNCTION add_inventory(
    p_product_id INT,
    p_stock      INT,
    p_warehouse_id INT DEFAULT 1,
    p_stock_date DATE DEFAULT CURRENT_DATE
) RETURNS INT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_id INT;
BEGIN
    IF p_stock < 0 THEN
        RAISE EXCEPTION 'Stock cannot be negative';
    END IF;
    SELECT COALESCE(MAX(inventory_id), 0) + 1 INTO v_id FROM inventory;
    INSERT INTO inventory (inventory_id, product_id, stock, warehouse_id, last_stock_date)
    VALUES (v_id, p_product_id, p_stock, p_warehouse_id, p_stock_date);
    RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION remove_inventory(p_inventory_id INT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    DELETE FROM inventory WHERE inventory_id = p_inventory_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Inventory record % does not exist', p_inventory_id;
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- INVENTORY / STOCK FUNCTIONS
-- ---------------------------------------------------------------------------

-- Set a product's stock level (the trigger trg_prevent_negative_stock is the
-- final safety net; we also validate here for a clean error message).
CREATE OR REPLACE FUNCTION update_stock(p_product_id INT, p_new_stock INT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    IF p_new_stock < 0 THEN
        RAISE EXCEPTION 'Stock cannot be negative';
    END IF;
    UPDATE inventory
       SET stock = p_new_stock, last_stock_date = CURRENT_DATE
     WHERE product_id = p_product_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'No inventory record for product %', p_product_id;
    END IF;
END $$;

-- Stock level for a product (NULL-safe lookup)
CREATE OR REPLACE FUNCTION product_stock(p_product_id INT)
RETURNS TABLE(stock INT, warehouse_id INT, last_stock_date DATE)
LANGUAGE plpgsql STABLE AS $$
BEGIN
    RETURN QUERY
    SELECT i.stock, i.warehouse_id, i.last_stock_date
      FROM inventory i
     WHERE i.product_id = p_product_id;
END $$;

-- ---------------------------------------------------------------------------
-- ORDER FUNCTIONS
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION add_order(
    p_order_id   INT,
    p_customer_id INT,
    p_seller_id  INT,
    p_product_id INT,
    p_status     order_status_enum DEFAULT 'Pending',
    p_order_date DATE DEFAULT CURRENT_DATE
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    INSERT INTO orders (order_id, order_date, customer_id, seller_id, product_id, order_status)
    VALUES (p_order_id, p_order_date, p_customer_id, p_seller_id, p_product_id, p_status);
END $$;

CREATE OR REPLACE FUNCTION add_order_item(
    p_order_item_id INT,
    p_order_id      INT,
    p_product_id    INT,
    p_quantity      INT,
    p_price_per_unit NUMERIC(10,2)
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    IF p_quantity <= 0 THEN
        RAISE EXCEPTION 'Quantity must be positive';
    END IF;
    INSERT INTO order_items (order_item_id, order_id, product_id, quantity, price_per_unit, total_price)
    VALUES (p_order_item_id, p_order_id, p_product_id, p_quantity, p_price_per_unit,
            p_quantity * p_price_per_unit);
END $$;

-- Cancel an order - status flip only; the transactional variant with stock
-- restoration lives in 02_procedures.sql.
CREATE OR REPLACE FUNCTION cancel_order(p_order_id INT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    UPDATE orders SET order_status = 'Cancelled' WHERE order_id = p_order_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order % does not exist', p_order_id;
    END IF;
END $$;

-- Register a payment for an order (no ledger side effects).
CREATE OR REPLACE FUNCTION process_payment(
    p_payment_id   INT,
    p_order_id     INT,
    p_payment_date DATE DEFAULT CURRENT_DATE,
    p_mode         payment_mode_enum DEFAULT 'Credit Card',
    p_status       payment_status_enum DEFAULT 'Completed'
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    INSERT INTO payments (payment_id, order_id, payment_date, payment_mode, payment_status)
    VALUES (p_payment_id, p_order_id, p_payment_date, p_mode, p_status);
END $$;

CREATE OR REPLACE FUNCTION add_shipping(
    p_shipping_id  INT,
    p_order_id     INT,
    p_ship_date    DATE DEFAULT CURRENT_DATE,
    p_status       delivery_status_enum DEFAULT 'Pending',
    p_return_date  DATE DEFAULT NULL
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    IF p_return_date IS NOT NULL AND p_return_date < p_ship_date THEN
        RAISE EXCEPTION 'Return date cannot precede shipping date';
    END IF;
    INSERT INTO shippings (shipping_id, order_id, shipping_date, return_date, delivery_status)
    VALUES (p_shipping_id, p_order_id, p_ship_date, p_return_date, p_status);
END $$;

-- Mark a shipped order as returned
CREATE OR REPLACE FUNCTION return_product(p_order_id INT, p_return_date DATE DEFAULT CURRENT_DATE)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    UPDATE shippings
       SET return_date = p_return_date, delivery_status = 'Delivered'
     WHERE order_id = p_order_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'No shipping record for order %', p_order_id;
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- ANALYTICS FUNCTIONS  (used by the web dashboard + CLI)
-- ---------------------------------------------------------------------------

-- Every order for a customer, newest first
CREATE OR REPLACE FUNCTION show_customer_orders(p_customer_id INT)
RETURNS TABLE(order_id INT, order_date DATE, order_status order_status_enum,
              product_name VARCHAR(50), seller_name VARCHAR(50))
LANGUAGE plpgsql STABLE AS $$
BEGIN
    RETURN QUERY
    SELECT o.order_id, o.order_date, o.order_status, pr.product_name, s.seller_name
      FROM orders o
      JOIN products pr ON pr.product_id = o.product_id
      JOIN sellers  s  ON s.seller_id   = o.seller_id
     WHERE o.customer_id = p_customer_id
     ORDER BY o.order_date DESC;
END $$;

-- Orders + audit trail for a customer (proves the trigger pipeline works)
CREATE OR REPLACE FUNCTION show_customer_orders_with_log(p_customer_id INT)
RETURNS TABLE(order_id INT, order_date DATE, order_status order_status_enum,
              last_action VARCHAR(20), changed_at TIMESTAMPTZ)
LANGUAGE plpgsql STABLE AS $$
BEGIN
    RETURN QUERY
    SELECT o.order_id, o.order_date, o.order_status,
           ol.action, ol.changed_at
      FROM orders o
      LEFT JOIN LATERAL (
          SELECT action, changed_at
            FROM order_logs
           WHERE order_id = o.order_id
           ORDER BY changed_at DESC
           LIMIT 1
      ) ol ON TRUE
     WHERE o.customer_id = p_customer_id
     ORDER BY o.order_date DESC;
END $$;

-- Total revenue (completed payments) generated by a seller
CREATE OR REPLACE FUNCTION seller_revenue(p_seller_id INT)
RETURNS TABLE(seller_name VARCHAR(50), total_orders BIGINT,
              total_revenue NUMERIC(14,2), avg_order_value NUMERIC(14,2))
LANGUAGE plpgsql STABLE AS $$
BEGIN
    RETURN QUERY
    SELECT s.seller_name,
           COUNT(DISTINCT o.order_id)::BIGINT,
           COALESCE(SUM(oi.total_price), 0),
           COALESCE(ROUND(SUM(oi.total_price) / NULLIF(COUNT(DISTINCT o.order_id), 0), 2), 0)
      FROM sellers s
      JOIN orders o      ON o.seller_id = s.seller_id
      JOIN order_items oi ON oi.order_id = o.order_id
      JOIN payments p    ON p.order_id  = o.order_id AND p.payment_status = 'Completed'
     WHERE s.seller_id = p_seller_id
     GROUP BY s.seller_name;
END $$;

-- The single highest-grossing product by completed sales
CREATE OR REPLACE FUNCTION top_selling_product()
RETURNS TABLE(product_name VARCHAR(50), units_sold BIGINT, revenue NUMERIC(14,2))
LANGUAGE plpgsql STABLE AS $$
BEGIN
    RETURN QUERY
    SELECT pr.product_name, SUM(oi.quantity)::BIGINT, SUM(oi.total_price)
      FROM order_items oi
      JOIN orders o   ON o.order_id = oi.order_id
      JOIN payments p ON p.order_id = o.order_id AND p.payment_status = 'Completed'
      JOIN products pr ON pr.product_id = oi.product_id
     GROUP BY pr.product_name
     ORDER BY revenue DESC
     LIMIT 1;
END $$;

-- All products inside a category with current stock
CREATE OR REPLACE FUNCTION products_by_category(p_category_id INT)
RETURNS TABLE(product_id INT, product_name VARCHAR(50), price NUMERIC(10,2),
              stock INT, warehouse_id INT)
LANGUAGE plpgsql STABLE AS $$
BEGIN
    RETURN QUERY
    SELECT pr.product_id, pr.product_name, pr.price,
           i.stock, i.warehouse_id
      FROM products pr
      LEFT JOIN inventory i ON i.product_id = pr.product_id
     WHERE pr.category_id = p_category_id
     ORDER BY pr.product_name;
END $$;

-- Revenue grouped by category (overall)
CREATE OR REPLACE FUNCTION category_sales()
RETURNS TABLE(category_name VARCHAR(20), total_quantity BIGINT, total_revenue NUMERIC(14,2))
LANGUAGE plpgsql STABLE AS $$
BEGIN
    RETURN QUERY
    SELECT c.category_name, SUM(oi.quantity)::BIGINT, SUM(oi.total_price)
      FROM order_items oi
      JOIN products pr ON pr.product_id = oi.product_id
      JOIN category c  ON c.category_id = pr.category_id
      JOIN orders o    ON o.order_id    = oi.order_id
      JOIN payments p  ON p.order_id    = o.order_id AND p.payment_status = 'Completed'
     GROUP BY c.category_name
     ORDER BY total_revenue DESC;
END $$;

-- Orders whose payment is still missing (business rule: money must move)
CREATE OR REPLACE FUNCTION show_unpaid_orders()
RETURNS TABLE(order_id INT, order_date DATE, customer_id INT, order_status order_status_enum)
LANGUAGE plpgsql STABLE AS $$
BEGIN
    RETURN QUERY
    SELECT o.order_id, o.order_date, o.customer_id, o.order_status
      FROM orders o
     WHERE o.order_status <> 'Cancelled'
       AND NOT EXISTS (SELECT 1 FROM payments p WHERE p.order_id = o.order_id AND p.payment_status = 'Completed')
     ORDER BY o.order_date;
END $$;

-- Listing helpers (pageable views of the master data)
CREATE OR REPLACE FUNCTION list_customers()
RETURNS TABLE(customer_id INT, first_name VARCHAR(20), last_name VARCHAR(20),
              state VARCHAR(100), order_count BIGINT)
LANGUAGE plpgsql STABLE AS $$
BEGIN
    RETURN QUERY
    SELECT c.customer_id, c.first_name, c.last_name, c.state,
           COUNT(o.order_id)::BIGINT
      FROM customers c
      LEFT JOIN orders o ON o.customer_id = c.customer_id
     GROUP BY c.customer_id, c.first_name, c.last_name, c.state
     ORDER BY c.customer_id;
END $$;

CREATE OR REPLACE FUNCTION list_sellers()
RETURNS TABLE(seller_id INT, seller_name VARCHAR(50), order_count BIGINT)
LANGUAGE plpgsql STABLE AS $$
BEGIN
    RETURN QUERY
    SELECT s.seller_id, s.seller_name, COUNT(o.order_id)::BIGINT
      FROM sellers s
      LEFT JOIN orders o ON o.seller_id = s.seller_id
     GROUP BY s.seller_id, s.seller_name
     ORDER BY s.seller_id;
END $$;

CREATE OR REPLACE FUNCTION list_products()
RETURNS TABLE(product_id INT, product_name VARCHAR(50), price NUMERIC(10,2),
              cogs NUMERIC(10,2), category_name VARCHAR(20), stock BIGINT)
LANGUAGE plpgsql STABLE AS $$
BEGIN
    -- stock is AGGREGATED across warehouses: a product may live in several
    RETURN QUERY
    SELECT pr.product_id, pr.product_name, pr.price, pr.cogs,
           c.category_name, COALESCE(SUM(i.stock), 0)
      FROM products pr
      JOIN category c     ON c.category_id = pr.category_id
      LEFT JOIN inventory i ON i.product_id = pr.product_id
     GROUP BY pr.product_id, pr.product_name, pr.price, pr.cogs, c.category_name
     ORDER BY pr.product_id;
END $$;

COMMIT;
