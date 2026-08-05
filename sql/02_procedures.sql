-- ============================================================================
-- ShopSphere-DBMS · 02_procedures.sql
-- ----------------------------------------------------------------------------
-- Multi-statement workflows with EXPLICIT transaction control.
--
-- Difference from 01_functions.sql:
--   Functions  = atomic units of work that RETURN a value.
--   Procedures = orchestrations that BEGIN / COMMIT / ROLLBACK a pipeline
--                (e.g. a full checkout touches 5 tables - all or nothing).
--
-- The star of this file is place_order(): one call, one transaction, five
-- tables, stock reservation, and an audit trail - if ANY step fails, the
-- entire checkout is rolled back and the stock is untouched.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- SALES SNAPSHOT TABLE (fed by generate_daily_sales_rollup)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS daily_sales_snapshot (
    snapshot_date DATE PRIMARY KEY,
    total_orders       INT,
    total_revenue      NUMERIC(14,2),
    units_sold         INT,
    avg_order_value    NUMERIC(14,2),
    new_customers      INT,
    top_category       VARCHAR(20),
    captured_at        TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- place_order:  THE FLAGSHIP WORKFLOW
-- ---------------------------------------------------------------------------
-- Validates stock → writes the order → writes the line item → decrements
-- inventory → records a completed payment → raises a shipping record.
-- Every statement is inside one transaction: any failure rolls back all five.
--
-- CALL place_order(101, 5, 42, 3, 'Credit Card', NULL, NULL);
-- ---------------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE place_order(
    p_customer_id   INT,
    p_seller_id     INT,
    p_product_id    INT,
    p_quantity      INT,
    p_payment_mode  payment_mode_enum DEFAULT 'Credit Card',
    INOUT p_order_id INT DEFAULT NULL
)
LANGUAGE plpgsql AS $$
DECLARE
    v_unit_price NUMERIC(10,2);
    v_stock      INT;
    v_order_id   INT;
    v_item_id    INT;
    v_payment_id INT;
    v_ship_id    INT;
BEGIN
    IF p_quantity <= 0 THEN
        RAISE EXCEPTION 'Quantity must be a positive integer (got %)', p_quantity;
    END IF;

    -- Step 0 · read current unit price + stock
    SELECT price INTO v_unit_price FROM products WHERE product_id = p_product_id;
    IF v_unit_price IS NULL THEN
        RAISE EXCEPTION 'Product % does not exist', p_product_id;
    END IF;

    SELECT stock INTO v_stock FROM inventory WHERE product_id = p_product_id;
    IF v_stock IS NULL THEN
        RAISE EXCEPTION 'Product % has no inventory record - cannot sell', p_product_id;
    END IF;
    IF v_stock < p_quantity THEN
        RAISE EXCEPTION 'Insufficient stock for product %: have %, need %',
                        p_product_id, v_stock, p_quantity;
    END IF;

    -- Step 1 · allocate IDs (kept simple for demo; production would use sequences)
    SELECT COALESCE(MAX(order_id), 0) + 1     INTO v_order_id   FROM orders;
    SELECT COALESCE(MAX(order_item_id), 0) + 1 INTO v_item_id    FROM order_items;
    SELECT COALESCE(MAX(payment_id), 0) + 1   INTO v_payment_id FROM payments;
    SELECT COALESCE(MAX(shipping_id), 0) + 1  INTO v_ship_id    FROM shippings;

    -- Step 2 · write the order (audit trigger fires → order_logs)
    INSERT INTO orders (order_id, order_date, customer_id, seller_id, product_id, order_status)
    VALUES (v_order_id, CURRENT_DATE, p_customer_id, p_seller_id, p_product_id, 'Pending');

    -- Step 3 · write the line item (price snapshot = current catalog price)
    INSERT INTO order_items (order_item_id, order_id, product_id, quantity, price_per_unit, total_price)
    VALUES (v_item_id, v_order_id, p_product_id, p_quantity, v_unit_price,
            p_quantity * v_unit_price);

    -- Step 4 · reserve stock
    UPDATE inventory
       SET stock = stock - p_quantity, last_stock_date = CURRENT_DATE
     WHERE product_id = p_product_id;

    -- Step 5 · record the (completed) payment
    INSERT INTO payments (payment_id, order_id, payment_date, payment_mode, payment_status)
    VALUES (v_payment_id, v_order_id, CURRENT_DATE, p_payment_mode, 'Completed');

    -- Step 6 · create the fulfilment record
    INSERT INTO shippings (shipping_id, order_id, shipping_date, delivery_status)
    VALUES (v_ship_id, v_order_id, CURRENT_DATE, 'Pending');

    p_order_id := v_order_id;

    RAISE NOTICE 'Order % placed: % × product % for customer % (total %)',
                 v_order_id, p_quantity, p_product_id, p_customer_id,
                 p_quantity * v_unit_price;
END $$;

-- ---------------------------------------------------------------------------
-- cancel_order_proc: transactional cancellation that RESTORES stock.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE cancel_order_proc(
    INOUT p_order_id INT
) LANGUAGE plpgsql AS $$
DECLARE
    v_status  order_status_enum;
    v_product INT;
    v_qty     INT;
BEGIN
    SELECT order_status, product_id INTO v_status, v_product
      FROM orders WHERE order_id = p_order_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order % does not exist', p_order_id;
    END IF;
    IF v_status = 'Cancelled' THEN
        RAISE NOTICE 'Order % already cancelled - nothing to do', p_order_id;
        RETURN;
    END IF;
    IF v_status = 'Delivered' THEN
        RAISE EXCEPTION 'Order % already delivered - cancellation not allowed', p_order_id;
    END IF;

    -- Restore the reserved units
    SELECT quantity INTO v_qty
      FROM order_items WHERE order_id = p_order_id;

    UPDATE inventory
       SET stock = stock + v_qty, last_stock_date = CURRENT_DATE
     WHERE product_id = v_product;

    UPDATE orders SET order_status = 'Cancelled' WHERE order_id = p_order_id;

    RAISE NOTICE 'Order % cancelled - % units of product % returned to stock',
                 p_order_id, v_qty, v_product;
END $$;

-- ---------------------------------------------------------------------------
-- restock_product: bring a product back above the reorder threshold.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE restock_product(
    p_product_id INT,
    p_units      INT
) LANGUAGE plpgsql AS $$
BEGIN
    IF p_units <= 0 THEN
        RAISE EXCEPTION 'Restock units must be positive (got %)', p_units;
    END IF;
    UPDATE inventory
       SET stock = stock + p_units, last_stock_date = CURRENT_DATE
     WHERE product_id = p_product_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'No inventory record for product %', p_product_id;
    END IF;
    RAISE NOTICE 'Product % restocked with % units', p_product_id, p_units;
END $$;

-- ---------------------------------------------------------------------------
-- generate_daily_sales_rollup: ETL-style snapshot of yesterday's performance.
-- Demonstrates INSERT ... SELECT with multiple aggregations in one pass.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE generate_daily_sales_rollup(
    p_for_date DATE DEFAULT CURRENT_DATE - 1
) LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO daily_sales_snapshot
        (snapshot_date, total_orders, total_revenue, units_sold,
         avg_order_value, new_customers, top_category)
    SELECT
        p_for_date,
        COUNT(DISTINCT o.order_id),
        COALESCE(SUM(oi.total_price), 0),
        COALESCE(SUM(oi.quantity), 0),
        COALESCE(ROUND(SUM(oi.total_price) / NULLIF(COUNT(DISTINCT o.order_id), 0), 2), 0),
        (SELECT COUNT(*) FROM customers
          WHERE customer_id IN (SELECT customer_id FROM orders WHERE order_date = p_for_date)
            AND customer_id NOT IN (SELECT customer_id FROM orders WHERE order_date < p_for_date)),
        (SELECT c.category_name
           FROM order_items oi2
           JOIN orders o2   ON o2.order_id = oi2.order_id
           JOIN products p2 ON p2.product_id = oi2.product_id
           JOIN category c  ON c.category_id = p2.category_id
          WHERE o2.order_date = p_for_date
          GROUP BY c.category_name
          ORDER BY SUM(oi2.total_price) DESC LIMIT 1)
    FROM orders o
    JOIN order_items oi ON oi.order_id = o.order_id
    WHERE o.order_date = p_for_date
    ON CONFLICT (snapshot_date) DO UPDATE SET
        total_orders    = EXCLUDED.total_orders,
        total_revenue   = EXCLUDED.total_revenue,
        units_sold      = EXCLUDED.units_sold,
        avg_order_value = EXCLUDED.avg_order_value,
        new_customers   = EXCLUDED.new_customers,
        top_category    = EXCLUDED.top_category,
        captured_at     = now();

    RAISE NOTICE 'Sales rollup for % refreshed', p_for_date;
END $$;

COMMIT;
