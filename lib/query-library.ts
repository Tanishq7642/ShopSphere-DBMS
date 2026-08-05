// ============================================================================
// ShopSphere-DBMS · lib/query-library.ts
// The curated "Query Library" loaded by the SQL playground. Mirrors the full
// showcase in sql/05_analytics.sql - every major SQL concept, one click away.
// ============================================================================

export interface LibraryQuery {
  id: string
  category: string
  title: string
  description: string
  sql: string
}

export const queryLibrary: LibraryQuery[] = [
  // ------------------------------------------------------------------ BASICS
  {
    id: "basics-select",
    category: "1 · Fundamentals",
    title: "SELECT · the top 10 products by price",
    description: "Column aliases, ORDER BY and LIMIT.",
    sql: "SELECT product_id, product_name AS name, price, cogs,\n       price - cogs AS gross_margin\nFROM products\nORDER BY price DESC\nLIMIT 10;",
  },
  {
    id: "basics-distinct",
    category: "1 · Fundamentals",
    title: "SELECT DISTINCT · customer states",
    description: "Unique values in a column.",
    sql: "SELECT DISTINCT state FROM customers ORDER BY state;",
  },
  // --------------------------------------------------------------- FILTERING
  {
    id: "filter-range",
    category: "2 · Filtering",
    title: "BETWEEN + ILIKE · mid-range products",
    description: "Range and case-insensitive pattern matching.",
    sql: "SELECT product_id, product_name, price\nFROM products\nWHERE price BETWEEN 50 AND 100\n  AND product_name ILIKE '%pro%'\nORDER BY price;",
  },
  {
    id: "filter-null",
    category: "2 · Filtering",
    title: "IS NULL · shipments with no return yet",
    description: "NULL handling on real data.",
    sql: "SELECT order_id, shipping_date, delivery_status\nFROM shippings\nWHERE return_date IS NULL\nORDER BY shipping_date\nLIMIT 10;",
  },
  // ------------------------------------------------------------------ JOINS
  {
    id: "join-inner",
    category: "3 · Joins",
    title: "INNER JOIN · orders with customer & product",
    description: "The classic 3-table join.",
    sql: "SELECT o.order_id, o.order_date,\n       c.first_name || ' ' || c.last_name AS customer,\n       p.product_name, o.order_status\nFROM orders o\nJOIN customers c ON c.customer_id = o.customer_id\nJOIN products p  ON p.product_id  = o.product_id\nORDER BY o.order_date DESC\nLIMIT 10;",
  },
  {
    id: "join-left",
    category: "3 · Joins",
    title: "LEFT JOIN · products never ordered",
    description: "Keep every product, even with zero sales.",
    sql: "SELECT p.product_name, COUNT(oi.order_item_id) AS times_ordered\nFROM products p\nLEFT JOIN order_items oi ON oi.product_id = p.product_id\nGROUP BY p.product_name\nORDER BY times_ordered\nLIMIT 10;",
  },
  {
    id: "join-self",
    category: "3 · Joins",
    title: "SELF JOIN · products sharing a price",
    description: "A table joined to itself (pairwise analysis).",
    sql: "SELECT a.product_name AS product_a, b.product_name AS product_b, a.price\nFROM products a\nJOIN products b ON a.price = b.price AND a.product_id < b.product_id\nLIMIT 10;",
  },
  {
    id: "join-full",
    category: "3 · Joins",
    title: "FULL OUTER JOIN · customer ↔ order coverage",
    description: "Customers with no orders AND orders without customers.",
    sql: "SELECT c.customer_id, c.first_name, o.order_id\nFROM customers c\nFULL OUTER JOIN orders o ON o.customer_id = c.customer_id\nWHERE o.order_id IS NULL OR c.customer_id IS NULL\nLIMIT 10;",
  },
  // ------------------------------------------------------------- AGGREGATION
  {
    id: "agg-kpis",
    category: "4 · Aggregation",
    title: "Aggregate KPIs · order book overview",
    description: "COUNT, COUNT(DISTINCT), AVG, MIN, MAX, SUM.",
    sql: "SELECT COUNT(*) AS total_order_lines,\n       COUNT(DISTINCT o.customer_id) AS unique_customers,\n       ROUND(AVG(oi.total_price), 2) AS avg_line_value,\n       MIN(oi.total_price) AS smallest_line,\n       MAX(oi.total_price) AS largest_line,\n       SUM(oi.total_price) AS grand_total\nFROM order_items oi\nJOIN orders o ON o.order_id = oi.order_id;",
  },
  {
    id: "agg-having",
    category: "4 · Aggregation",
    title: "GROUP BY + HAVING · categories above average",
    description: "Filter groups after aggregation.",
    sql: "SELECT cat.category_name, SUM(oi.total_price) AS revenue\nFROM category cat\nJOIN products pr ON pr.category_id = cat.category_id\nJOIN order_items oi ON oi.product_id = pr.product_id\nGROUP BY cat.category_name\nHAVING SUM(oi.total_price) > (SELECT AVG(revenue) FROM (\n    SELECT SUM(oi2.total_price) AS revenue\n    FROM order_items oi2 JOIN products pr2 ON pr2.product_id = oi2.product_id\n    GROUP BY pr2.category_id) x)\nORDER BY revenue DESC;",
  },
  // -------------------------------------------------------------- SUBQUERIES
  {
    id: "sub-scalar",
    category: "5 · Subqueries",
    title: "Scalar subquery · price vs the average",
    description: "A subquery returning a single value.",
    sql: "SELECT product_name, price,\n       (SELECT ROUND(AVG(price), 2) FROM products) AS avg_price,\n       ROUND(price / (SELECT AVG(price) FROM products), 2) AS price_index\nFROM products\nORDER BY price DESC\nLIMIT 5;",
  },
  {
    id: "sub-correlated",
    category: "5 · Subqueries",
    title: "Correlated subquery · priciest product per category",
    description: "The inner query runs once per outer row.",
    sql: "SELECT cat.category_name, p.product_name, p.price\nFROM products p\nJOIN category cat ON cat.category_id = p.category_id\nWHERE p.price = (\n    SELECT MAX(price) FROM products p2 WHERE p2.category_id = p.category_id\n)\nORDER BY cat.category_name;",
  },
  {
    id: "sub-exists",
    category: "5 · Subqueries",
    title: "EXISTS · customers with orders this year",
    description: "Semi-join: existence test with early exit.",
    sql: "SELECT c.customer_id, c.first_name || ' ' || c.last_name AS name\nFROM customers c\nWHERE EXISTS (\n    SELECT 1 FROM orders o\n    WHERE o.customer_id = c.customer_id\n      AND o.order_date >= date_trunc('year', CURRENT_DATE)\n);",
  },
  // -------------------------------------------------------------------- CTEs
  {
    id: "cte-chain",
    category: "6 · CTEs",
    title: "Chained CTE · category revenue pipeline",
    description: "Break a complex query into readable steps.",
    sql: "WITH completed_sales AS (\n    SELECT oi.order_id, oi.product_id, oi.quantity, oi.total_price, o.order_date\n    FROM order_items oi\n    JOIN orders o   ON o.order_id = oi.order_id\n    JOIN payments p ON p.order_id = o.order_id AND p.payment_status = 'Completed'\n),\ncategory_of AS (\n    SELECT pr.product_id, cat.category_name\n    FROM products pr JOIN category cat ON cat.category_id = pr.category_id\n)\nSELECT co.category_name,\n       COUNT(DISTINCT cs.order_id) AS orders,\n       SUM(cs.quantity) AS units,\n       SUM(cs.total_price) AS revenue\nFROM completed_sales cs\nJOIN category_of co ON co.product_id = cs.product_id\nGROUP BY co.category_name\nORDER BY revenue DESC;",
  },
  {
    id: "cte-recursive-calendar",
    category: "6 · CTEs",
    title: "RECURSIVE CTE · 10-day rolling calendar",
    description: "Self-referencing CTE - a date series in pure SQL.",
    sql: "WITH RECURSIVE calendar AS (\n    SELECT CURRENT_DATE - 9 AS day\n    UNION ALL\n    SELECT day + 1 FROM calendar WHERE day < CURRENT_DATE\n)\nSELECT day, to_char(day, 'Day') AS weekday FROM calendar;",
  },
  {
    id: "cte-recursive-fib",
    category: "6 · CTEs",
    title: "RECURSIVE CTE · Fibonacci numbers",
    description: "Recursion isn't just for trees.",
    sql: "WITH RECURSIVE fib(a, b, n) AS (\n    SELECT 0::BIGINT, 1::BIGINT, 1\n    UNION ALL\n    SELECT b, a + b, n + 1 FROM fib WHERE n < 10\n)\nSELECT n, a AS fibonacci FROM fib;",
  },
  // -------------------------------------------------------- WINDOW FUNCTIONS
  {
    id: "window-rank",
    category: "7 · Window functions",
    title: "ROW_NUMBER / RANK / DENSE_RANK",
    description: "Ranking within each category.",
    sql: "SELECT cat.category_name, p.product_name, p.price,\n       ROW_NUMBER() OVER (PARTITION BY cat.category_id ORDER BY p.price DESC) AS row_num,\n       RANK()       OVER (PARTITION BY cat.category_id ORDER BY p.price DESC) AS price_rank,\n       DENSE_RANK() OVER (PARTITION BY cat.category_id ORDER BY p.price DESC) AS dense_rank\nFROM products p\nJOIN category cat ON cat.category_id = p.category_id\nORDER BY cat.category_name, p.price DESC\nLIMIT 15;",
  },
  {
    id: "window-running-total",
    category: "7 · Window functions",
    title: "Running total · cumulative revenue",
    description: "SUM OVER with a framing clause.",
    sql: "SELECT order_date, revenue,\n       SUM(revenue) OVER (ORDER BY order_date\n           ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS running_total\nFROM v_revenue_daily\nORDER BY order_date;",
  },
  {
    id: "window-moving-avg",
    category: "7 · Window functions",
    title: "Moving average · 7-day revenue smooth",
    description: "A rolling window of 7 rows.",
    sql: "SELECT order_date, revenue,\n       ROUND(AVG(revenue) OVER (ORDER BY order_date\n           ROWS BETWEEN 6 PRECEDING AND CURRENT ROW), 2) AS moving_avg_7d\nFROM v_revenue_daily\nORDER BY order_date;",
  },
  {
    id: "window-lag",
    category: "7 · Window functions",
    title: "LAG / LEAD · day-over-day change",
    description: "Peek at previous/next rows.",
    sql: "SELECT order_date, revenue,\n       LAG(revenue) OVER (ORDER BY order_date) AS prev_day,\n       revenue - LAG(revenue) OVER (ORDER BY order_date) AS day_delta,\n       LEAD(revenue) OVER (ORDER BY order_date) AS next_day\nFROM v_revenue_daily\nORDER BY order_date;",
  },
  {
    id: "window-ntile",
    category: "7 · Window functions",
    title: "NTILE · customer value quartiles",
    description: "Split rows into buckets.",
    sql: "SELECT quartile, COUNT(*) AS customers, SUM(lifetime_value) AS total_value\nFROM (\n    SELECT lifetime_value,\n           NTILE(4) OVER (ORDER BY lifetime_value) AS quartile\n    FROM v_customer_lifetime_value\n) t\nGROUP BY quartile ORDER BY quartile;",
  },
  // ----------------------------------------------------------- SET OPERATORS
  {
    id: "set-union",
    category: "8 · Set operations",
    title: "UNION · products + sellers in one list",
    description: "Stack distinct values from two queries.",
    sql: "SELECT product_name AS name FROM products\nUNION\nSELECT seller_name FROM sellers\nORDER BY name\nLIMIT 10;",
  },
  {
    id: "set-except",
    category: "8 · Set operations",
    title: "EXCEPT · products never ordered",
    description: "Rows in the first set but not the second.",
    sql: "SELECT product_id FROM products\nEXCEPT\nSELECT product_id FROM order_items\nORDER BY product_id\nLIMIT 10;",
  },
  {
    id: "set-intersect",
    category: "8 · Set operations",
    title: "INTERSECT · states with customers & orders",
    description: "Rows present in both sets.",
    sql: "SELECT state FROM customers\nINTERSECT\nSELECT c.state FROM orders o JOIN customers c ON c.customer_id = o.customer_id;",
  },
  // ----------------------------------------------------- CASE / NULL / CAST
  {
    id: "case-buckets",
    category: "9 · CASE & NULL",
    title: "CASE · price-band histogram",
    description: "Bucket products into business segments.",
    sql: "SELECT CASE\n           WHEN price < 50   THEN 'budget (<50)'\n           WHEN price < 150  THEN 'mid (50-150)'\n           WHEN price < 300  THEN 'premium (150-300)'\n           ELSE 'luxury (300+)'\n       END AS price_band,\n       COUNT(*) AS products, ROUND(AVG(price), 2) AS avg_price\nFROM products\nGROUP BY 1\nORDER BY MIN(price);",
  },
  {
    id: "null-coalesce",
    category: "9 · CASE & NULL",
    title: "COALESCE · seller name display",
    description: "Fall back to a default when a value is empty.",
    sql: "SELECT seller_id, seller_name,\n       COALESCE(NULLIF(seller_name, ''), 'Unnamed seller') AS display_name\nFROM sellers\nLIMIT 10;",
  },
  // -------------------------------------------------------------- STRING/DATE
  {
    id: "string-fns",
    category: "10 · String & date",
    title: "String functions on product names",
    description: "UPPER, LENGTH, LEFT, RIGHT, POSITION, SPLIT_PART.",
    sql: "SELECT product_name,\n       UPPER(product_name)    AS upper_name,\n       LENGTH(product_name)   AS name_length,\n       LEFT(product_name, 5)  AS first_five,\n       RIGHT(product_name, 3) AS last_three,\n       SPLIT_PART(product_name, '_', 1) AS first_segment\nFROM products\nLIMIT 5;",
  },
  {
    id: "date-fns",
    category: "10 · String & date",
    title: "Date parts · EXTRACT + AGE",
    description: "Pull year, month, weekday and age out of dates.",
    sql: "SELECT order_id, order_date,\n       EXTRACT(YEAR FROM order_date)  AS yr,\n       EXTRACT(MONTH FROM order_date) AS mth,\n       EXTRACT(DOW FROM order_date)   AS day_of_week,\n       AGE(CURRENT_DATE, order_date)  AS order_age\nFROM orders\nORDER BY order_date DESC\nLIMIT 5;",
  },
  // -------------------------------------------------------------- GROUPING SETS
  {
    id: "rollup",
    category: "11 · GROUPING SETS",
    title: "ROLLUP · category × status subtotals",
    description: "Hierarchical subtotals + grand total in one query.",
    sql: "SELECT cat.category_name, o.order_status,\n       COUNT(DISTINCT o.order_id) AS orders\nFROM orders o\nJOIN products pr ON pr.product_id = o.product_id\nJOIN category cat ON cat.category_id = pr.category_id\nGROUP BY ROLLUP (cat.category_name, o.order_status)\nORDER BY cat.category_name, o.order_status;",
  },
  {
    id: "cube",
    category: "11 · GROUPING SETS",
    title: "CUBE · state × status geography cube",
    description: "Every combination of grouping columns.",
    sql: "SELECT COALESCE(c.state, '(all states)') AS state,\n       COALESCE(o.order_status::text, '(all statuses)') AS status,\n       COUNT(*) AS orders\nFROM orders o\nJOIN customers c ON c.customer_id = o.customer_id\nGROUP BY CUBE (c.state, o.order_status)\nORDER BY state, status\nLIMIT 30;",
  },
  // --------------------------------------------------------------- PIVOT / FTS
  {
    id: "pivot-filter",
    category: "12 · Pivot & search",
    title: "PIVOT via FILTER · payment mode matrix",
    description: "A portable crosstab with conditional aggregation.",
    sql: "SELECT payment_mode,\n       COUNT(*) FILTER (WHERE payment_status = 'Completed') AS completed,\n       COUNT(*) FILTER (WHERE payment_status = 'Pending')   AS pending,\n       COUNT(*) FILTER (WHERE payment_status = 'Failed')    AS failed\nFROM payments\nGROUP BY payment_mode\nORDER BY completed DESC;",
  },
  {
    id: "fts",
    category: "12 · Pivot & search",
    title: "Full-text search · ranked product matches",
    description: "tsvector / plainto_tsquery / ts_rank.",
    sql: "SELECT product_name, price,\n       ts_rank(to_tsvector('english', product_name),\n               plainto_tsquery('english', 'pro')) AS relevance\nFROM products\nWHERE to_tsvector('english', product_name) @@ plainto_tsquery('english', 'pro')\nORDER BY relevance DESC\nLIMIT 10;",
  },
  // ------------------------------------------------------------- DATA QUALITY
  {
    id: "dq-orphans",
    category: "13 · Data quality",
    title: "FK integrity · orphan rows",
    description: "Every foreign key checked in one query.",
    sql: "SELECT 'order_items w/o order' AS check_name, COUNT(*) AS violations FROM order_items oi\n    WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.order_id = oi.order_id)\nUNION ALL\nSELECT 'orders w/o customer', COUNT(*) FROM orders o\n    WHERE NOT EXISTS (SELECT 1 FROM customers c WHERE c.customer_id = o.customer_id)\nUNION ALL\nSELECT 'products w/o category', COUNT(*) FROM products pr\n    WHERE NOT EXISTS (SELECT 1 FROM category c WHERE c.category_id = pr.category_id);",
  },
  {
    id: "dq-money",
    category: "13 · Data quality",
    title: "Money check · total = qty × unit price",
    description: "Find arithmetic inconsistencies in order lines.",
    sql: "SELECT order_item_id, order_id, quantity, price_per_unit, total_price\nFROM order_items\nWHERE ABS(total_price - (quantity * price_per_unit)) > 0.01\nLIMIT 10;",
  },
  {
    id: "dq-margin",
    category: "13 · Data quality",
    title: "Margin red flags · products sold below cost",
    description: "Price < COGS - a business anomaly the audit catches.",
    sql: "SELECT product_name, price, cogs, price - cogs AS margin\nFROM products\nWHERE price < cogs\nORDER BY margin\nLIMIT 10;",
  },
]
