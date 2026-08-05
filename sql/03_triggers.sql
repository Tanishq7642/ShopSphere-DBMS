-- ============================================================================
-- ShopSphere-DBMS · 03_triggers.sql
-- ----------------------------------------------------------------------------
-- Database-level automation. Triggers keep business rules inside the database
-- so that NO application (web app, CLI, or ad-hoc SQL) can bypass them.
--
--   1. trg_orders_audit          → every order mutation lands in order_logs
--   2. trg_customer_orders_audit → per-customer counters for loyalty analytics
--   3. trg_category_sales_audit  → category revenue ledger (the "data warehouse"
--                                   feed - mirrors a star-schema fact table)
--   4. trg_prevent_negative_stock→ hard guard: stock can never go below zero
--   5. trg_payment_completes_order → a completed payment auto-moves a Pending
--                                   order to Shipped (trigger chaining)
--
-- During bulk CSV loading these are temporarily disabled (see scripts/) for
-- performance and determinism, then re-enabled - a standard ETL practice.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- Trigger helper: write one row into order_logs
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION log_order_event()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO order_logs (order_id, action, old_status, new_status)
    VALUES (
        COALESCE(NEW.order_id, OLD.order_id),
        TG_OP,
        CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE OLD.order_status END,
        CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE NEW.order_status END
    );
    RETURN COALESCE(NEW, OLD);
END $$;

-- ---------------------------------------------------------------------------
-- 1 · Audit every order mutation
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_orders_audit ON orders;
CREATE TRIGGER trg_orders_audit
    AFTER INSERT OR UPDATE OR DELETE ON orders
    FOR EACH ROW EXECUTE FUNCTION log_order_event();

-- ---------------------------------------------------------------------------
-- 2 · Maintain per-customer order counters
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION maintain_customer_order_logs()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO customer_order_logs (customer_id, total_orders, last_order_date)
    VALUES (NEW.customer_id, 1, NEW.order_date)
    ON CONFLICT (customer_id) DO UPDATE SET
        total_orders    = customer_order_logs.total_orders + 1,
        last_order_date = GREATEST(customer_order_logs.last_order_date, NEW.order_date);
    RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_customer_orders_audit ON orders;
CREATE TRIGGER trg_customer_orders_audit
    AFTER INSERT ON orders
    FOR EACH ROW EXECUTE FUNCTION maintain_customer_order_logs();

-- ---------------------------------------------------------------------------
-- 3 · Feed the category-sales ledger from order_items changes
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION maintain_category_sales_ledger()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_category_id INT;
    v_quantity    INT;
    v_revenue     NUMERIC(12,2);
BEGIN
    SELECT category_id INTO v_category_id
      FROM products WHERE product_id = COALESCE(NEW.product_id, OLD.product_id);

    -- Delta approach: a DELETE subtracts, an INSERT adds, an UPDATE adjusts
    v_quantity := COALESCE(NEW.quantity, 0) - COALESCE(OLD.quantity, 0);
    v_revenue  := COALESCE(NEW.total_price, 0) - COALESCE(OLD.total_price, 0);

    IF v_quantity = 0 AND v_revenue = 0 THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    INSERT INTO category_sales_logs (category_id, product_id, quantity, revenue, sale_date)
    VALUES (v_category_id, COALESCE(NEW.product_id, OLD.product_id), v_quantity,
            v_revenue, CURRENT_DATE);

    RETURN COALESCE(NEW, OLD);
END $$;

DROP TRIGGER IF EXISTS trg_category_sales_audit ON order_items;
CREATE TRIGGER trg_category_sales_audit
    AFTER INSERT OR UPDATE OR DELETE ON order_items
    FOR EACH ROW EXECUTE FUNCTION maintain_category_sales_ledger();

-- ---------------------------------------------------------------------------
-- 4 · Hard guard: stock can never be negative
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION prevent_negative_stock()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.stock < 0 THEN
        RAISE EXCEPTION 'Stock for product % cannot go negative (attempted %)',
                        NEW.product_id, NEW.stock
            USING HINT = 'Run restock_product() first';
    END IF;
    RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_prevent_negative_stock ON inventory;
CREATE TRIGGER trg_prevent_negative_stock
    BEFORE INSERT OR UPDATE ON inventory
    FOR EACH ROW EXECUTE FUNCTION prevent_negative_stock();

-- ---------------------------------------------------------------------------
-- 5 · Trigger chaining: completed payment ⇒ Pending order becomes Shipped
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION payment_completes_order()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.payment_status = 'Completed' THEN
        UPDATE orders
           SET order_status = 'Shipped'
         WHERE order_id = NEW.order_id
           AND order_status = 'Pending';
    END IF;
    RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_payment_completes_order ON payments;
CREATE TRIGGER trg_payment_completes_order
    AFTER INSERT ON payments
    FOR EACH ROW EXECUTE FUNCTION payment_completes_order();

COMMIT;
