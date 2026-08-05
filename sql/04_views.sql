-- ============================================================================
-- ShopSphere-DBMS · 04_views.sql
-- ----------------------------------------------------------------------------
-- The ANALYTICAL LAYER. Views encapsulate the complex joins so that dashboards
-- and the query playground can SELECT from them as if they were tables.
--
--   Regular views  = live, always-current, no storage overhead
--   Materialized view = precomputed snapshot for expensive aggregations
--                       (mv_daily_revenue), refreshed on demand.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1 · The complete order picture (7-way join, no filters)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_order_details AS
SELECT o.order_id,
       o.order_date,
       o.order_status,
       c.customer_id,
       c.first_name || ' ' || c.last_name        AS customer_name,
       c.state                                    AS customer_state,
       s.seller_id,
       s.seller_name,
       pr.product_id,
       pr.product_name,
       cat.category_name,
       oi.quantity,
       oi.price_per_unit,
       oi.total_price,
       p.payment_status,
       p.payment_mode,
       sh.delivery_status
FROM orders o
JOIN customers   c   ON c.customer_id   = o.customer_id
JOIN sellers     s   ON s.seller_id     = o.seller_id
JOIN products    pr  ON pr.product_id   = o.product_id
JOIN category    cat ON cat.category_id = pr.category_id
JOIN order_items oi  ON oi.order_id     = o.order_id
LEFT JOIN payments  p  ON p.order_id    = o.order_id
LEFT JOIN shippings sh ON sh.order_id   = o.order_id;

-- ---------------------------------------------------------------------------
-- 2 · Top products by completed revenue
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_top_products AS
SELECT pr.product_id,
       pr.product_name,
       cat.category_name,
       COUNT(DISTINCT o.order_id)                AS order_count,
       SUM(oi.quantity)                          AS units_sold,
       SUM(oi.total_price)                       AS revenue,
       ROUND(AVG(oi.price_per_unit), 2)          AS avg_selling_price,
       ROW_NUMBER() OVER (ORDER BY SUM(oi.total_price) DESC) AS rank
FROM products pr
JOIN category    cat ON cat.category_id = pr.category_id
JOIN order_items oi  ON oi.product_id   = pr.product_id
JOIN orders      o   ON o.order_id      = oi.order_id
JOIN payments    p   ON p.order_id      = o.order_id AND p.payment_status = 'Completed'
GROUP BY pr.product_id, pr.product_name, cat.category_name;

-- ---------------------------------------------------------------------------
-- 3 · Daily revenue series (the dashboard trend chart)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_revenue_daily AS
SELECT o.order_date,
       COUNT(DISTINCT o.order_id)                AS orders,
       COUNT(DISTINCT o.customer_id)             AS customers,
       COALESCE(SUM(oi.total_price), 0)          AS revenue,
       COALESCE(SUM(oi.quantity), 0)             AS units
FROM orders o
JOIN order_items oi ON oi.order_id = o.order_id
JOIN payments p     ON p.order_id  = o.order_id AND p.payment_status = 'Completed'
GROUP BY o.order_date;

-- ---------------------------------------------------------------------------
-- 4 · Monthly revenue + growth (window functions on the daily series)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_revenue_monthly AS
SELECT to_char(month_start, 'YYYY-MM') AS month_key,
       month_start,
       revenue,
       LAG(revenue) OVER (ORDER BY month_start) AS prev_month_revenue,
       ROUND(
           100.0 * (revenue - LAG(revenue) OVER (ORDER BY month_start))
           / NULLIF(LAG(revenue) OVER (ORDER BY month_start), 0), 2
       ) AS growth_pct
FROM (
    SELECT date_trunc('month', order_date) AS month_start,
           SUM(total_price) AS revenue
    FROM order_items oi
    JOIN orders o ON o.order_id = oi.order_id
    JOIN payments p ON p.order_id = o.order_id AND p.payment_status = 'Completed'
    GROUP BY date_trunc('month', order_date)
) monthly;

-- ---------------------------------------------------------------------------
-- 5 · Customer lifetime value (RFM-flavoured)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_customer_lifetime_value AS
SELECT c.customer_id,
       c.first_name || ' ' || c.last_name AS customer_name,
       c.state,
       COUNT(DISTINCT o.order_id)                         AS order_count,
       COALESCE(SUM(oi.total_price), 0)                   AS lifetime_value,
       MAX(o.order_date)                                  AS last_order_date,
       ROUND(AVG(oi.total_price), 2)                      AS avg_order_value,
       NTILE(4) OVER (ORDER BY COALESCE(SUM(oi.total_price), 0)) AS value_quartile
FROM customers c
LEFT JOIN orders o      ON o.customer_id = c.customer_id
LEFT JOIN order_items oi ON oi.order_id  = o.order_id
LEFT JOIN payments p    ON p.order_id    = o.order_id AND p.payment_status = 'Completed'
GROUP BY c.customer_id, c.first_name, c.last_name, c.state;

-- ---------------------------------------------------------------------------
-- 6 · Inventory status with reorder flags (CASE-driven business logic)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_inventory_status AS
SELECT i.inventory_id,
       i.product_id,
       pr.product_name,
       cat.category_name,
       i.stock,
       i.warehouse_id,
       i.last_stock_date,
       CASE
           WHEN i.stock = 0               THEN 'OUT OF STOCK'
           WHEN i.stock <= 10             THEN 'CRITICAL - reorder now'
           WHEN i.stock <= 30             THEN 'LOW - plan reorder'
           ELSE 'HEALTHY'
       END AS stock_level,
       RANK() OVER (PARTITION BY i.warehouse_id ORDER BY i.stock) AS warehouse_stock_rank
FROM inventory i
JOIN products pr ON pr.product_id = i.product_id
JOIN category cat ON cat.category_id = pr.category_id;

-- ---------------------------------------------------------------------------
-- 7 · Seller performance
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_seller_performance AS
SELECT s.seller_id,
       s.seller_name,
       COUNT(DISTINCT o.order_id)                       AS orders,
       COALESCE(SUM(oi.total_price), 0)                 AS revenue,
       COALESCE(ROUND(AVG(oi.total_price), 2), 0)       AS avg_order_value,
       DENSE_RANK() OVER (ORDER BY COALESCE(SUM(oi.total_price), 0) DESC) AS revenue_rank
FROM sellers s
LEFT JOIN orders o      ON o.seller_id = s.seller_id
LEFT JOIN order_items oi ON oi.order_id = o.order_id
LEFT JOIN payments p    ON p.order_id  = o.order_id AND p.payment_status = 'Completed'
GROUP BY s.seller_id, s.seller_name;

-- ---------------------------------------------------------------------------
-- 8 · Category revenue share
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_category_sales AS
SELECT cat.category_id,
       cat.category_name,
       COUNT(DISTINCT o.order_id)                    AS orders,
       SUM(oi.quantity)                              AS units_sold,
       SUM(oi.total_price)                           AS revenue,
       ROUND(100.0 * SUM(oi.total_price) / SUM(SUM(oi.total_price)) OVER (), 2) AS revenue_share_pct
FROM category cat
JOIN products pr  ON pr.category_id = cat.category_id
JOIN order_items oi ON oi.product_id = pr.product_id
JOIN orders o     ON o.order_id    = oi.order_id
JOIN payments p   ON p.order_id    = o.order_id AND p.payment_status = 'Completed'
GROUP BY cat.category_id, cat.category_name;

-- ---------------------------------------------------------------------------
-- 9 · Payment summary (mode × status matrix via FILTER - a portable pivot)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_payment_summary AS
SELECT p.payment_mode,
       COUNT(*)                                    AS payments,
       COUNT(*) FILTER (WHERE p.payment_status = 'Completed') AS completed,
       COUNT(*) FILTER (WHERE p.payment_status = 'Failed')    AS failed,
       COALESCE(SUM(oi.total_price), 0)            AS volume
FROM payments p
JOIN orders o ON o.order_id = p.order_id
JOIN order_items oi ON oi.order_id = o.order_id
GROUP BY p.payment_mode;

-- ---------------------------------------------------------------------------
-- 10 · MATERIALIZED VIEW: precomputed daily revenue (refresh via function)
-- ---------------------------------------------------------------------------
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_daily_revenue AS
SELECT order_date,
       orders,
       revenue
FROM v_revenue_daily
WITH DATA;

CREATE UNIQUE INDEX IF NOT EXISTS uq_mv_daily_revenue ON mv_daily_revenue(order_date);

-- Refreshing wrapper used by maintenance scripts and the dashboard
CREATE OR REPLACE FUNCTION refresh_mv_daily_revenue()
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_revenue;
END $$;

COMMIT;
