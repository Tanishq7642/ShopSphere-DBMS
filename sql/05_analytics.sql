-- ============================================================================
-- ShopSphere-DBMS · 05_analytics.sql
-- ----------------------------------------------------------------------------
-- THE SQL SKILL SHOWCASE.
--
-- Every major SQL concept is demonstrated with a REAL, runnable query against
-- the ShopSphere dataset. This file doubles as the "Query Library" that the
-- web SQL playground loads, so each query is written to teach something.
--
--   §1  Fundamentals        §8  Set operations
--   §2  Filtering           §9  CASE / NULL handling / casting
--   §3  Joins               §10 String functions
--   §4  Aggregation         §11 Date functions
--   §5  Subqueries          §12 Grouping sets / rollup / cube
--   §6  CTEs (incl. recursive) §13 Pivots
--   §7  Window functions    §14 Full-text search
--                            §15 Transactions
--                            §16 Performance analysis
--                            §17 Data-quality checks
-- ============================================================================

BEGIN;

-- ============================================================================
-- §1  FUNDAMENTALS
-- ============================================================================

-- 1.1  SELECT with column aliases
SELECT product_id, product_name AS name, price, cogs, price - cogs AS gross_margin
FROM products
ORDER BY price DESC
LIMIT 5;

-- 1.2  SELECT DISTINCT
SELECT DISTINCT state FROM customers ORDER BY state;

-- ============================================================================
-- §2  FILTERING
-- ============================================================================

-- 2.1  Range + pattern matching
SELECT product_id, product_name, price
FROM products
WHERE price BETWEEN 50 AND 100
  AND product_name ILIKE '%pro%'
ORDER BY price;

-- 2.2  IN with a subquery (products that have NEVER been ordered)
SELECT product_id, product_name
FROM products
WHERE product_id NOT IN (SELECT DISTINCT product_id FROM order_items);

-- 2.3  IS NULL / IS NOT NULL (returns pending)
SELECT order_id, return_date
FROM shippings
WHERE return_date IS NULL;

-- ============================================================================
-- §3  JOINS
-- ============================================================================

-- 3.1  INNER JOIN - orders with their customer & product
SELECT o.order_id, o.order_date, c.first_name || ' ' || c.last_name AS customer,
       p.product_name, o.order_status
FROM orders o
JOIN customers c ON c.customer_id = o.customer_id
JOIN products p  ON p.product_id  = o.product_id
LIMIT 5;

-- 3.2  LEFT JOIN - every product with its sales (0 sales still listed)
SELECT p.product_name, COUNT(oi.order_item_id) AS times_ordered
FROM products p
LEFT JOIN order_items oi ON oi.product_id = p.product_id
GROUP BY p.product_name
ORDER BY times_ordered;

-- 3.3  FULL OUTER JOIN - customers who never ordered AND orders with missing
--      customer references (integrity check in disguise)
SELECT c.customer_id, c.first_name, o.order_id
FROM customers c
FULL OUTER JOIN orders o ON o.customer_id = c.customer_id
WHERE o.order_id IS NULL OR c.customer_id IS NULL
LIMIT 10;

-- 3.4  SELF-JOIN - products that share the same price (pairs of competitors)
SELECT a.product_name AS product_a, b.product_name AS product_b, a.price
FROM products a
JOIN products b ON a.price = b.price AND a.product_id < b.product_id
LIMIT 10;

-- 3.5  CROSS JOIN - every category × every warehouse (planning matrix)
SELECT cat.category_name, w.warehouse_id
FROM category cat
CROSS JOIN (SELECT DISTINCT warehouse_id FROM inventory) w
ORDER BY cat.category_name, w.warehouse_id;

-- ============================================================================
-- §4  AGGREGATION
-- ============================================================================

-- 4.1  Aggregate functions without GROUP BY (table-level KPIs)
SELECT COUNT(*)                    AS total_order_lines,
       COUNT(DISTINCT o.customer_id) AS unique_customers,
       AVG(oi.total_price)           AS avg_line_value,
       MIN(oi.total_price)           AS smallest_line,
       MAX(oi.total_price)           AS largest_line,
       SUM(oi.total_price)           AS grand_total
FROM order_items oi
JOIN orders o ON o.order_id = oi.order_id;

-- 4.2  GROUP BY + HAVING - categories with revenue above the average category
SELECT cat.category_name, SUM(oi.total_price) AS revenue
FROM category cat
JOIN products pr ON pr.category_id = cat.category_id
JOIN order_items oi ON oi.product_id = pr.product_id
GROUP BY cat.category_name
HAVING SUM(oi.total_price) > (SELECT AVG(revenue) FROM
        (SELECT SUM(oi2.total_price) AS revenue
           FROM order_items oi2
           JOIN products pr2 ON pr2.product_id = oi2.product_id
          GROUP BY pr2.category_id) x)
ORDER BY revenue DESC;

-- 4.3  GROUP BY ROLLUP in one query (see §12 for the full spread)
SELECT to_char(order_date, 'YYYY-MM') AS month,
       COUNT(DISTINCT order_id) AS orders
FROM orders
GROUP BY ROLLUP (to_char(order_date, 'YYYY-MM'))
ORDER BY month;

-- ============================================================================
-- §5  SUBQUERIES
-- ============================================================================

-- 5.1  Scalar subquery - top-priced product vs the average
SELECT product_name, price,
       (SELECT ROUND(AVG(price), 2) FROM products) AS avg_price,
       ROUND(price / (SELECT AVG(price) FROM products), 2) AS price_index
FROM products
ORDER BY price DESC
LIMIT 5;

-- 5.2  Correlated subquery - the most expensive product in each category
SELECT cat.category_name, p.product_name, p.price
FROM products p
JOIN category cat ON cat.category_id = p.category_id
WHERE p.price = (
    SELECT MAX(price) FROM products p2 WHERE p2.category_id = p.category_id
)
ORDER BY cat.category_name;

-- 5.3  EXISTS - customers who placed an order this year
SELECT c.customer_id, c.first_name || ' ' || c.last_name AS name
FROM customers c
WHERE EXISTS (
    SELECT 1 FROM orders o
    WHERE o.customer_id = c.customer_id
      AND o.order_date >= date_trunc('year', CURRENT_DATE)
);

-- ============================================================================
-- §6  CTEs (Common Table Expressions)
-- ============================================================================

-- 6.1  Multi-step analytics in one readable query
WITH completed_sales AS (
    SELECT oi.order_id, oi.product_id, oi.quantity, oi.total_price, o.order_date
    FROM order_items oi
    JOIN orders o   ON o.order_id = oi.order_id
    JOIN payments p ON p.order_id = o.order_id AND p.payment_status = 'Completed'
),
category_of AS (
    SELECT pr.product_id, cat.category_name
    FROM products pr JOIN category cat ON cat.category_id = pr.category_id
)
SELECT co.category_name,
       COUNT(DISTINCT cs.order_id) AS orders,
       SUM(cs.quantity)            AS units,
       SUM(cs.total_price)         AS revenue
FROM completed_sales cs
JOIN category_of co ON co.product_id = cs.product_id
GROUP BY co.category_name
ORDER BY revenue DESC;

-- 6.2  RECURSIVE CTE - a 10-day rolling date calendar (pairs with numbers table)
WITH RECURSIVE calendar AS (
    SELECT CURRENT_DATE - 9 AS day
    UNION ALL
    SELECT day + 1 FROM calendar WHERE day < CURRENT_DATE
)
SELECT day, to_char(day, 'Day') AS weekday
FROM calendar;

-- 6.3  Recursive CTE - Fibonacci sequence (pure SQL!)
WITH RECURSIVE fib(a, b, n) AS (
    SELECT 0::BIGINT, 1::BIGINT, 1
    UNION ALL
    SELECT b, a + b, n + 1 FROM fib WHERE n < 10
)
SELECT n, a AS fibonacci FROM fib;

-- ============================================================================
-- §7  WINDOW FUNCTIONS   (the "analytics" superpower)
-- ============================================================================

-- 7.1  ROW_NUMBER / RANK / DENSE_RANK - position products by price per category
SELECT cat.category_name, p.product_name, p.price,
       ROW_NUMBER() OVER (PARTITION BY cat.category_id ORDER BY p.price DESC) AS row_num,
       RANK()        OVER (PARTITION BY cat.category_id ORDER BY p.price DESC) AS price_rank,
       DENSE_RANK()  OVER (PARTITION BY cat.category_id ORDER BY p.price DESC) AS dense_rank
FROM products p
JOIN category cat ON cat.category_id = p.category_id
ORDER BY cat.category_name, p.price DESC
LIMIT 15;

-- 7.2  Running total of revenue by date (cumulative sum)
SELECT order_date,
       revenue,
       SUM(revenue) OVER (ORDER BY order_date
           ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS running_total
FROM v_revenue_daily
ORDER BY order_date;

-- 7.3  Moving average (7-day) - smooths the daily revenue series
SELECT order_date, revenue,
       ROUND(AVG(revenue) OVER (ORDER BY order_date
           ROWS BETWEEN 6 PRECEDING AND CURRENT ROW), 2) AS moving_avg_7d
FROM v_revenue_daily
ORDER BY order_date;

-- 7.4  LAG / LEAD - day-over-day revenue change
SELECT order_date, revenue,
       LAG(revenue) OVER (ORDER BY order_date) AS prev_day,
       revenue - LAG(revenue) OVER (ORDER BY order_date) AS day_delta,
       LEAD(revenue) OVER (ORDER BY order_date) AS next_day
FROM v_revenue_daily
ORDER BY order_date;

-- 7.5  FIRST_VALUE / LAST_VALUE - most & least recent order per customer
SELECT customer_id,
       order_id,
       order_date,
       FIRST_VALUE(order_id) OVER (PARTITION BY customer_id ORDER BY order_date DESC) AS newest_order,
       LAST_VALUE(order_id)  OVER (PARTITION BY customer_id ORDER BY order_date
           ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS oldest_order
FROM orders
ORDER BY customer_id, order_date DESC
LIMIT 12;

-- 7.6  NTILE - split customers into 4 value quartiles
SELECT quartile, COUNT(*) AS customers, SUM(lifetime_value) AS total_value
FROM (
    SELECT lifetime_value,
           NTILE(4) OVER (ORDER BY lifetime_value) AS quartile
    FROM v_customer_lifetime_value
) t
GROUP BY quartile ORDER BY quartile;

-- 7.7  Window on window: % contribution of each product to its category
SELECT cat.category_name, p.product_name,
       SUM(oi.total_price) AS product_revenue,
       SUM(SUM(oi.total_price)) OVER (PARTITION BY cat.category_id) AS category_revenue,
       ROUND(100.0 * SUM(oi.total_price) /
             NULLIF(SUM(SUM(oi.total_price)) OVER (PARTITION BY cat.category_id), 0), 2)
           AS pct_of_category
FROM order_items oi
JOIN products p  ON p.product_id  = oi.product_id
JOIN category cat ON cat.category_id = p.category_id
GROUP BY cat.category_id, cat.category_name, p.product_name
ORDER BY cat.category_name, product_revenue DESC
LIMIT 15;

-- ============================================================================
-- §8  SET OPERATIONS
-- ============================================================================

-- 8.1  UNION - combine distinct values from two columns into one list
SELECT product_name AS name FROM products
UNION
SELECT seller_name FROM sellers
ORDER BY name
LIMIT 10;

-- 8.2  INTERSECT - states that have both customers AND orders (obviously all,
--      but demonstrates the operator on real data)
SELECT state FROM customers
INTERSECT
SELECT c.state FROM orders o JOIN customers c ON c.customer_id = o.customer_id;

-- 8.3  EXCEPT - products that are in the catalog but were never ordered
SELECT product_id FROM products
EXCEPT
SELECT product_id FROM order_items
ORDER BY product_id
LIMIT 10;

-- ============================================================================
-- §9  CASE / NULL HANDLING / CASTING
-- ============================================================================

-- 9.1  CASE-driven order lifecycle buckets
SELECT order_status,
       COUNT(*) AS orders,
       SUM(CASE WHEN order_status = 'Delivered' THEN 1 ELSE 0 END) AS delivered_count
FROM orders
GROUP BY order_status
ORDER BY orders DESC;

-- 9.2  COALESCE / NULLIF / CAST
SELECT seller_id, seller_name,
       COALESCE(NULLIF(seller_name, ''), 'Unnamed seller') AS display_name,
       CAST(REPLACE(seller_name, '-', ' ') AS VARCHAR(50)) AS cleaned_name
FROM sellers
LIMIT 5;

-- 9.3  A mini price-bucket histogram with CASE
SELECT CASE
           WHEN price < 50              THEN 'budget (<50)'
           WHEN price < 150             THEN 'mid (50-150)'
           WHEN price < 300             THEN 'premium (150-300)'
           ELSE 'luxury (300+)'
       END AS price_band,
       COUNT(*) AS products,
       ROUND(AVG(price), 2) AS avg_price
FROM products
GROUP BY 1
ORDER BY MIN(price);

-- ============================================================================
-- §10 STRING FUNCTIONS
-- ============================================================================

SELECT product_name,
       UPPER(product_name) AS upper_name,
       LENGTH(product_name) AS name_length,
       LEFT(product_name, 5) AS first_five,
       RIGHT(product_name, 3) AS last_three,        POSITION('_' IN product_name) AS first_underscore_pos,
        SPLIT_PART(product_name, '_', 1) AS first_segment
FROM products
LIMIT 5;

-- ============================================================================
-- §11 DATE FUNCTIONS
-- ============================================================================

-- 11.1  EXTRACT parts of the date
SELECT order_id, order_date,
       EXTRACT(YEAR FROM order_date)  AS yr,
       EXTRACT(MONTH FROM order_date) AS mth,
       EXTRACT(DOW FROM order_date)   AS day_of_week,
       AGE(CURRENT_DATE, order_date)  AS order_age
FROM orders
ORDER BY order_date DESC
LIMIT 5;

-- 11.2  DATE_TRUNC + TO_CHAR - revenue by week
SELECT to_char(date_trunc('week', order_date), 'YYYY-MM-DD') AS week_start,
       SUM(total_price) AS revenue
FROM order_items oi
JOIN orders o ON o.order_id = oi.order_id
GROUP BY 1
ORDER BY 1;

-- ============================================================================
-- §12 GROUPING SETS / ROLLUP / CUBE
-- ============================================================================

-- 12.1  ROLLUP - category + status subtotals with grand total
SELECT cat.category_name,
       o.order_status,
       COUNT(DISTINCT o.order_id) AS orders
FROM orders o
JOIN products pr ON pr.product_id = o.product_id
JOIN category cat ON cat.category_id = pr.category_id
GROUP BY ROLLUP (cat.category_name, o.order_status)
ORDER BY cat.category_name, o.order_status;

-- 12.2  CUBE - every combination of state × status (customer geography cube)
SELECT COALESCE(c.state, '(all states)') AS state,
       COALESCE(o.order_status::text, '(all statuses)') AS status,
       COUNT(*) AS orders
FROM orders o
JOIN customers c ON c.customer_id = o.customer_id
GROUP BY CUBE (c.state, o.order_status)
ORDER BY state, status
LIMIT 30;

-- ============================================================================
-- §13 PIVOTS
-- ============================================================================

-- 13.1  Portable pivot with FILTER: payment status matrix per mode
SELECT payment_mode,
       COUNT(*) FILTER (WHERE payment_status = 'Completed') AS completed,
       COUNT(*) FILTER (WHERE payment_status = 'Pending')   AS pending,
       COUNT(*) FILTER (WHERE payment_status = 'Failed')    AS failed
FROM payments
GROUP BY payment_mode
ORDER BY completed DESC;

-- 13.2  Status "crosstab": order status × month (without the tablefunc ext.)
SELECT to_char(order_date, 'YYYY-MM') AS month,
       COUNT(*) FILTER (WHERE order_status = 'Pending')   AS pending,
       COUNT(*) FILTER (WHERE order_status = 'Shipped')   AS shipped,
       COUNT(*) FILTER (WHERE order_status = 'Delivered') AS delivered,
       COUNT(*) FILTER (WHERE order_status = 'Cancelled') AS cancelled
FROM orders
GROUP BY 1
ORDER BY 1;

-- ============================================================================
-- §14 FULL-TEXT SEARCH  (requires the GIN index - see README)
-- ============================================================================

-- Create a search vector column & index (indexed once for speed)
CREATE INDEX IF NOT EXISTS idx_products_fts
    ON products USING GIN (to_tsvector('english', product_name));

-- 14.1  Ranked full-text match on the product catalog
-- (a full word matches the tokenized lexemes - try 'pro' for a prefix demo)
SELECT product_name, price,
       ts_rank(to_tsvector('english', product_name),
               plainto_tsquery('english', 'product')) AS relevance
FROM products
WHERE to_tsvector('english', product_name) @@ plainto_tsquery('english', 'product')
ORDER BY relevance DESC
LIMIT 10;

-- ============================================================================
-- §15 TRANSACTIONS  (illustrative - uncomment & run in psql interactively)
-- ============================================================================
-- BEGIN;
--   SAVEPOINT before_order;
--   SELECT * FROM add_order(9001, 1, 1, 1, 'Pending');
--   ROLLBACK TO SAVEPOINT before_order;   -- undo just the order, keep tx open
--   SELECT * FROM add_customer('Test', 'User', 'Delhi', 'Street 1');
-- COMMIT;

-- ============================================================================
-- §16 PERFORMANCE ANALYSIS
-- ============================================================================

-- 16.1  EXPLAIN ANALYZE - see the plan + real timings (run in psql)
-- EXPLAIN ANALYZE SELECT * FROM v_order_details WHERE customer_state = 'India';

-- 16.2  Which indexes exist and are they being used?
SELECT schemaname, relname AS table_name, indexrelname AS index_name
FROM pg_stat_user_indexes
WHERE idx_scan > 0
ORDER BY idx_scan DESC
LIMIT 10;

-- 16.3  Find hot tables by rows read (tuning candidates)
SELECT relname, seq_scan, idx_scan, n_live_tup
FROM pg_stat_user_tables
ORDER BY n_live_tup DESC
LIMIT 10;

-- 16.4  Show query plan for the flagship view WITHOUT executing it
-- EXPLAIN (FORMAT JSON) SELECT * FROM v_revenue_daily;

-- ============================================================================
-- §17 DATA-QUALITY CHECKS  (a mini data-engineering audit)
-- ============================================================================

-- 17.1  Orphaned rows - every FK should be satisfied
SELECT 'orders w/o customer' AS check_name, COUNT(*) AS violations FROM orders o
    WHERE NOT EXISTS (SELECT 1 FROM customers c WHERE c.customer_id = o.customer_id)
UNION ALL
SELECT 'order_items w/o order', COUNT(*) FROM order_items oi
    WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.order_id = oi.order_id)
UNION ALL
SELECT 'products w/o category', COUNT(*) FROM products pr
    WHERE NOT EXISTS (SELECT 1 FROM category c WHERE c.category_id = pr.category_id);

-- 17.2  Money sanity: line total must equal qty × unit price
SELECT order_item_id, quantity, price_per_unit, total_price
FROM order_items
WHERE ABS(total_price - (quantity * price_per_unit)) > 0.01;

-- 17.3  Products sold below cost (margin red flag)
SELECT product_name, price, cogs, price - cogs AS margin
FROM products
WHERE price < cogs;

-- 17.4  Duplicate email-less customers (same name + state = suspicious)
SELECT first_name, last_name, state, COUNT(*) AS dupes
FROM customers
GROUP BY first_name, last_name, state
HAVING COUNT(*) > 1
ORDER BY dupes DESC;

-- 17.5  Orders shipped but never paid (business rule breach)
SELECT o.order_id, o.order_date, o.order_status
FROM orders o
WHERE o.order_status IN ('Shipped', 'Delivered')
  AND NOT EXISTS (SELECT 1 FROM payments p
                   WHERE p.order_id = o.order_id AND p.payment_status = 'Completed');

-- ============================================================================
-- BONUS · The numbers table + recursive CTE (used by demo queries)
-- ============================================================================
INSERT INTO numbers (n)
SELECT generate_series(1, 1000)
ON CONFLICT (n) DO NOTHING;

SELECT n, n * n AS square FROM numbers WHERE n <= 10 ORDER BY n;

COMMIT;
