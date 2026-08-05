// ============================================================================
// ShopSphere-DBMS · lib/quiz.ts
// The SQL Assessment engine: a graded challenge library plus the auto-grader.
//
// Grading model
// ------------
// Every challenge has a reference `solution` and a set of `expectedColumns`.
// When a learner submits, the grader runs BOTH their query and the reference
// against the live ecommerce_db, then compares:
//   1. column names   → as a case-insensitive SET (order/aliases may differ)
//   2. row content    → as an unordered MULTISET of normalized cells
// (numbers are rounded to 2dp, dates compared by day, strings trimmed)
//
// A correct answer must match BOTH. Any valid SQL that produces the same
// result set passes - e.g. a challenge solved with a correlated subquery can
// also be solved with a window function.
// ============================================================================

export type Difficulty = "Easy" | "Intermediate" | "Advanced"

export interface QuizChallenge {
  id: string
  title: string
  topic: string
  difficulty: Difficulty
  prompt: string
  /** Commented skeleton pre-filled into the editor. */
  starter: string
  hint: string
  /** Reference solution - runs against the live database. */
  solution: string
  /** Required output columns (case-insensitive set). */
  expectedColumns: string[]
}

export const quizChallenges: QuizChallenge[] = [
  // ---------------------------------------------------------------- 1 · JOINS
  {
    id: "join-orders",
    title: "The 3-table join",
    topic: "Joins",
    difficulty: "Easy",
    prompt:
      "List every order with the customer's FULL NAME and the product name. " +
      "Return columns `order_id`, `order_date`, `customer` and `product_name`, " +
      "ordered by `order_date` DESC. (Limit the result to 10 rows.)",
    starter: `-- Join orders → customers and orders → products.
-- Columns: order_id, order_date, customer (full name), product_name
-- Order by order_date DESC · LIMIT 10
SELECT`,
    hint:
      "Concatenate with the || operator: `c.first_name || ' ' || c.last_name AS customer`. " +
      "Alias it as `customer` - the grader checks column names.",
    solution: `SELECT o.order_id, o.order_date,
       c.first_name || ' ' || c.last_name AS customer,
       pr.product_name
FROM orders o
JOIN customers c ON c.customer_id = o.customer_id
JOIN products pr ON pr.product_id = o.product_id
ORDER BY o.order_date DESC
LIMIT 10;`,
    expectedColumns: ["order_id", "order_date", "customer", "product_name"],
  },
  // -------------------------------------------------------------- 2 · FILTERS
  {
    id: "filter-mid-range",
    title: "Range + pattern filter",
    topic: "Filtering",
    difficulty: "Easy",
    prompt:
      "Find products priced between 50 and 100 whose name contains the string " +
      "'pro' (case-insensitive). Return `product_id`, `product_name`, `price`, " +
      "ordered by `price` ascending.",
    starter: `-- WHERE price BETWEEN 50 AND 100 AND product_name ILIKE '%pro%'
-- Columns: product_id, product_name, price · ORDER BY price
SELECT`,
    hint: "`BETWEEN` is inclusive. Use `ILIKE` for case-insensitive pattern matching.",
    solution: `SELECT product_id, product_name, price
FROM products
WHERE price BETWEEN 50 AND 100
  AND product_name ILIKE '%pro%'
ORDER BY price;`,
    expectedColumns: ["product_id", "product_name", "price"],
  },
  // ----------------------------------------------------------- 3 · AGGREGATION
  {
    id: "agg-category-revenue",
    title: "GROUP BY + HAVING",
    topic: "Aggregation",
    difficulty: "Easy",
    prompt:
      "Total revenue per category (sum of `order_items.total_price`), showing only " +
      "categories with MORE THAN 25,000 in revenue. Return `category_name` and " +
      "`revenue`, ordered by `revenue` DESC.",
    starter: `-- Join category → products → order_items
-- GROUP BY category_name · HAVING SUM(total_price) > 25000
-- Columns: category_name, revenue · ORDER BY revenue DESC
SELECT`,
    hint:
      "`HAVING` filters groups AFTER aggregation - `WHERE` cannot reference `SUM(...)`. " +
      "Round with `ROUND(SUM(oi.total_price), 2)`.",
    solution: `SELECT cat.category_name, ROUND(SUM(oi.total_price), 2) AS revenue
FROM category cat
JOIN products pr ON pr.category_id = cat.category_id
JOIN order_items oi ON oi.product_id = pr.product_id
GROUP BY cat.category_name
HAVING SUM(oi.total_price) > 25000
ORDER BY revenue DESC;`,
    expectedColumns: ["category_name", "revenue"],
  },
  // ---------------------------------------------------------- 4 · SUBQUERIES
  {
    id: "sub-priciest",
    title: "Correlated subquery",
    topic: "Subqueries",
    difficulty: "Intermediate",
    prompt:
      "Find the most expensive product IN EACH category. Return `category_name`, " +
      "`product_name` and `price`. Any approach is fine (correlated subquery or a " +
      "window function) as long as the result matches.",
    starter: `-- The most expensive product in EACH category.
-- Hint: WHERE p.price = (SELECT MAX(price) FROM products p2 WHERE p2.category_id = p.category_id)
-- Columns: category_name, product_name, price
SELECT`,
    hint:
      "A correlated subquery re-runs per outer row. Join `products` to `category`, " +
      "then match `price` against the MAX within the same `category_id`.",
    solution: `SELECT cat.category_name, p.product_name, p.price
FROM products p
JOIN category cat ON cat.category_id = p.category_id
WHERE p.price = (
    SELECT MAX(price) FROM products p2 WHERE p2.category_id = p.category_id
)
ORDER BY cat.category_name;`,
    expectedColumns: ["category_name", "product_name", "price"],
  },
  // ----------------------------------------------------------------- 5 · CTEs
  {
    id: "cte-top-sellers",
    title: "Top sellers with a CTE",
    topic: "CTEs",
    difficulty: "Intermediate",
    prompt:
      "Using a COMMON TABLE EXPRESSION, compute each seller's revenue from orders " +
      "with a COMPLETED payment (join `sellers` → `orders` → `order_items` → `payments`), " +
      "then return the top 5 sellers. Columns: `seller_name`, `revenue`.",
    starter: `-- Top 5 sellers by COMPLETED-sale revenue, via a CTE.
-- Columns: seller_name, revenue · ORDER BY revenue DESC · LIMIT 5
WITH seller_revenue AS (
    -- SELECT s.seller_name, SUM(oi.total_price) AS revenue
    -- FROM sellers s
    -- JOIN orders o       ON o.seller_id  = s.seller_id
    -- JOIN order_items oi ON oi.order_id  = o.order_id
    -- JOIN payments p     ON p.order_id   = o.order_id AND p.payment_status = 'Completed'
    -- GROUP BY s.seller_id, s.seller_name
)
SELECT`,
    hint:
      "Filter to `payment_status = 'Completed'` INSIDE the CTE. Group by seller " +
      "and round the sum to 2dp in the outer query.",
    solution: `WITH seller_revenue AS (
    SELECT s.seller_id, s.seller_name, SUM(oi.total_price) AS revenue
    FROM sellers s
    JOIN orders o ON o.seller_id = s.seller_id
    JOIN order_items oi ON oi.order_id = o.order_id
    JOIN payments p ON p.order_id = o.order_id AND p.payment_status = 'Completed'
    GROUP BY s.seller_id, s.seller_name
)
SELECT seller_name, ROUND(revenue, 2) AS revenue
FROM seller_revenue
ORDER BY revenue DESC
LIMIT 5;`,
    expectedColumns: ["seller_name", "revenue"],
  },
  // ------------------------------------------------------ 6 · WINDOW FUNCTIONS
  {
    id: "window-running-total",
    title: "Running total",
    topic: "Window functions",
    difficulty: "Intermediate",
    prompt:
      "Compute a RUNNING TOTAL of revenue over time using the ready-made view " +
      "`v_revenue_daily` (columns `order_date`, `revenue`). Return `order_date`, " +
      "`revenue` and `running_total`, ordered by `order_date`.",
    starter: `-- Running total over v_revenue_daily.
-- Hint: SUM(revenue) OVER (ORDER BY order_date)
-- Columns: order_date, revenue, running_total
SELECT`,
    hint:
      "The default frame of `SUM(...) OVER (ORDER BY order_date)` is `ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW` - exactly a running total.",
    solution: `SELECT order_date, revenue,
       SUM(revenue) OVER (ORDER BY order_date) AS running_total
FROM v_revenue_daily
ORDER BY order_date;`,
    expectedColumns: ["order_date", "revenue", "running_total"],
  },
  {
    id: "window-rank",
    title: "RANK within a partition",
    topic: "Window functions",
    difficulty: "Advanced",
    prompt:
      "Rank every product by `price` DESC WITHIN ITS OWN CATEGORY using " +
      "`RANK() OVER (...)`. Return `category_name`, `product_name`, `price` and " +
      "`price_rank`, ordered by `category_name` then `price` DESC.",
    starter: `-- Rank products by price DESC within each category.
-- Hint: RANK() OVER (PARTITION BY cat.category_id ORDER BY p.price DESC) AS price_rank
-- Columns: category_name, product_name, price, price_rank
SELECT`,
    hint:
      "`RANK()` leaves gaps after ties (two products at the same price share a rank); " +
      "that is expected here.",
    solution: `SELECT cat.category_name, p.product_name, p.price,
       RANK() OVER (PARTITION BY cat.category_id ORDER BY p.price DESC) AS price_rank
FROM products p
JOIN category cat ON cat.category_id = p.category_id
ORDER BY cat.category_name, p.price DESC;`,
    expectedColumns: ["category_name", "product_name", "price", "price_rank"],
  },
  // -------------------------------------------------------- 8 · SET OPERATIONS
  {
    id: "set-except",
    title: "EXCEPT - never ordered",
    topic: "Set operations",
    difficulty: "Easy",
    prompt:
      "Which product IDs exist in `products` but were NEVER ordered? Use the set " +
      "operator `EXCEPT` (not a NOT IN / NOT EXISTS). Return a single column " +
      "`product_id`, ordered ascending.",
    starter: `-- Products that appear in products but NOT in order_items.
-- Columns: product_id · ORDER BY product_id
SELECT product_id FROM products
EXCEPT`,
    hint: "`EXCEPT` keeps rows in the first query that are absent from the second.",
    solution: `SELECT product_id FROM products
EXCEPT
SELECT product_id FROM order_items
ORDER BY product_id;`,
    expectedColumns: ["product_id"],
  },
  // --------------------------------------------------------------- 9 · CASE
  {
    id: "case-price-bands",
    title: "CASE price bands",
    topic: "CASE & NULL",
    difficulty: "Easy",
    prompt:
      "Bucket products into price bands with a `CASE` expression - 'budget (<50)', " +
      "'mid (50-150)', 'premium (150-300)' and 'luxury (300+)' - then aggregate. " +
      "Return `price_band`, `products` (the count) and `avg_price` (average price " +
      "rounded to 2 decimals).",
    starter: `-- Bucket with CASE ... WHEN price < 50 THEN 'budget (<50)' ...
-- GROUP BY the band · Columns: price_band, products, avg_price
SELECT`,
    hint:
      "`GROUP BY 1` groups by the first output column. Round with `ROUND(AVG(price), 2)`.",
    solution: `SELECT CASE
           WHEN price < 50   THEN 'budget (<50)'
           WHEN price < 150  THEN 'mid (50-150)'
           WHEN price < 300  THEN 'premium (150-300)'
           ELSE 'luxury (300+)'
       END AS price_band,
       COUNT(*) AS products,
       ROUND(AVG(price), 2) AS avg_price
FROM products
GROUP BY 1
ORDER BY MIN(price);`,
    expectedColumns: ["price_band", "products", "avg_price"],
  },
  // -------------------------------------------------------- 10 · STRING & DATE
  {
    id: "date-parts",
    title: "Date parts & formatting",
    topic: "String & date",
    difficulty: "Easy",
    prompt:
      "For the 5 most recent orders return the year and the weekday NAME of each " +
      "`order_date`. Columns: `order_id`, `order_date`, `yr` (the year as a number) " +
      "and `weekday` (the full weekday name, e.g. 'Monday').",
    starter: `-- EXTRACT(YEAR FROM order_date) AS yr
-- to_char(order_date, 'Day') AS weekday
-- Columns: order_id, order_date, yr, weekday · ORDER BY order_date DESC · LIMIT 5
SELECT`,
    hint:
      "`to_char(order_date, 'Day')` returns the padded weekday name; the grader trims " +
      "whitespace. `EXTRACT(YEAR FROM ...)` gives the numeric year.",
    solution: `SELECT order_id, order_date,
       EXTRACT(YEAR FROM order_date) AS yr,
       to_char(order_date, 'Day') AS weekday
FROM orders
ORDER BY order_date DESC
LIMIT 5;`,
    expectedColumns: ["order_id", "order_date", "yr", "weekday"],
  },
  // ---------------------------------------------------- 11 · GROUPING SETS
  {
    id: "rollup-status",
    title: "ROLLUP subtotals",
    topic: "Grouping sets",
    difficulty: "Advanced",
    prompt:
      "Count orders per category × order status and include ROLLUP subtotals. " +
      "Label every subtotal row '(all)' (e.g. `COALESCE(o.order_status::text, '(all)')`). " +
      "Columns: `category_name`, `status`, `orders`.",
    starter: `-- GROUP BY ROLLUP (cat.category_name, o.order_status)
-- Label rollup rows '(all)'. The enum must be cast: o.order_status::text
-- Columns: category_name, status, orders
SELECT`,
    hint:
      "`ROLLUP` emits subtotal rows with NULLs in the grouped columns - `COALESCE` them " +
      "to '(all)'. Join `orders` → `products` → `category` first.",
    solution: `SELECT COALESCE(cat.category_name, '(all)') AS category_name,
       COALESCE(o.order_status::text, '(all)') AS status,
       COUNT(DISTINCT o.order_id) AS orders
FROM orders o
JOIN products pr ON pr.product_id = o.product_id
JOIN category cat ON cat.category_id = pr.category_id
GROUP BY ROLLUP (cat.category_name, o.order_status)
ORDER BY category_name NULLS LAST, status NULLS LAST;`,
    expectedColumns: ["category_name", "status", "orders"],
  },
  // ----------------------------------------------------- 12 · FULL-TEXT SEARCH
  {
    id: "fts-search",
    title: "Full-text search",
    topic: "Pivot & search",
    difficulty: "Intermediate",
    prompt:
      "Full-text search: every product whose name matches the query 'product', with " +
      "a `ts_rank` relevance score. Columns: `product_name`, `relevance`, ordered by " +
      "`relevance` DESC then `product_name`. (No LIMIT - all matches.)",
    starter: `-- WHERE to_tsvector('english', product_name) @@ plainto_tsquery('english', 'product')
-- ts_rank(to_tsvector(...), plainto_tsquery(...)) AS relevance
-- Columns: product_name, relevance · ORDER BY relevance DESC, product_name
SELECT`,
    hint:
      "The match operator is `@@`. `plainto_tsquery('english', 'product')` turns the " +
      "phrase into a query; `ts_rank(...)` scores each row.",
    solution: `SELECT product_name,
       ts_rank(to_tsvector('english', product_name),
               plainto_tsquery('english', 'product')) AS relevance
FROM products
WHERE to_tsvector('english', product_name) @@ plainto_tsquery('english', 'product')
ORDER BY relevance DESC, product_name;`,
    expectedColumns: ["product_name", "relevance"],
  },
  // ------------------------------------------------------- 13 · DATA QUALITY
  {
    id: "dq-margin",
    title: "Margin red flags",
    topic: "Data quality",
    difficulty: "Easy",
    prompt:
      "The audit team needs every product currently sold BELOW COST (`price < cogs`). " +
      "Return `product_name`, `price`, `cogs` and `margin` (price - cogs), ordered by " +
      "`margin` ascending, limited to 10 rows.",
    starter: `-- WHERE price < cogs
-- Columns: product_name, price, cogs, margin (price - cogs)
-- ORDER BY margin · LIMIT 10
SELECT`,
    hint:
      "`margin` is just `price - cogs` - a negative margin means the product loses money.",
    solution: `SELECT product_name, price, cogs, price - cogs AS margin
FROM products
WHERE price < cogs
ORDER BY margin
LIMIT 10;`,
    expectedColumns: ["product_name", "price", "cogs", "margin"],
  },
]

// ============================================================================
// AUTO-GRADER
// ============================================================================

export interface QuizGrade {
  status: "correct" | "wrong"
  message: string
  columnsOk: boolean
  rowsOk: boolean
  expectedColumns: string[]
  actualColumns: string[]
  expectedRowCount: number
  actualRowCount: number
  missingColumns: string[]
  unexpectedColumns: string[]
  missingRows: number
  extraRows: number
}

/** Round a number to 2dp (normalizing -0) for comparison. */
function round2dp(value: number): string {
  const rounded = Math.round(value * 100) / 100
  return Object.is(rounded, -0) ? "0" : String(rounded)
}

/** Normalize a single cell so equivalent values compare equal:
 *  numbers → 2dp, dates → day granularity, strings → trimmed, NULL → "∅".
 *  Numeric strings (Prisma returns DECIMAL as "19.90") are parsed and rounded
 *  too, so `price::float8` (19.9) and `price` ("19.90") grade as equal. */
function normCell(value: unknown): string {
  if (value === null || value === undefined) return "∅"
  if (typeof value === "bigint") return value.toString()
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  if (typeof value === "number") return round2dp(value)
  if (typeof value === "object") return JSON.stringify(value)
  const str = String(value).trim()
  return /^-?\d+(\.\d+)?$/.test(str) ? round2dp(Number(str)) : str
}

/** Normalize one row into a comparable, order- and case-insensitive key.
 *  NOTE: Object.keys() collapses duplicate column names (e.g. selecting the
 *  same column twice) - the grader therefore compares by unique columns only,
 *  which keeps verdicts deterministic. */
function rowKey(row: Record<string, unknown>): string {
  return JSON.stringify(
    Object.keys(row)
      .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
      .map((k) => normCell(row[k]))
  )
}

export function gradeChallenge(
  challenge: QuizChallenge,
  actualRows: any[],
  expectedRows: any[]
): QuizGrade {
  const expectedColumns = challenge.expectedColumns.map((c) => c.toLowerCase())
  const actualColumns = Object.keys(actualRows[0] ?? {}).map((c) => c.toLowerCase())

  const missingColumns = expectedColumns.filter((c) => !actualColumns.includes(c))
  const unexpectedColumns = actualColumns.filter((c) => !expectedColumns.includes(c))
  const columnsOk = missingColumns.length === 0 && unexpectedColumns.length === 0

  // Multiset comparison (duplicates matter, order does not)
  const expectedKeys = expectedRows.map(rowKey).sort()
  const actualKeys = actualRows.map(rowKey).sort()
  const rowsOk = JSON.stringify(expectedKeys) === JSON.stringify(actualKeys)

  let missingRows = 0
  let extraRows = 0
  if (!rowsOk) {
    const expCounts = new Map<string, number>()
    const actCounts = new Map<string, number>()
    for (const k of expectedKeys) expCounts.set(k, (expCounts.get(k) ?? 0) + 1)
    for (const k of actualKeys) actCounts.set(k, (actCounts.get(k) ?? 0) + 1)
    for (const [k, n] of expCounts) missingRows += Math.max(0, n - (actCounts.get(k) ?? 0))
    for (const [k, n] of actCounts) extraRows += Math.max(0, n - (expCounts.get(k) ?? 0))
  }

  const expectedRowCount = expectedRows.length
  const actualRowCount = actualRows.length

  if (columnsOk && rowsOk) {
    return {
      status: "correct",
      message:
        "Correct! Your result set matches the reference exactly - same columns, " +
        "same rows, same values.",
      columnsOk: true,
      rowsOk: true,
      expectedColumns: challenge.expectedColumns,
      actualColumns,
      expectedRowCount,
      actualRowCount,
      missingColumns: [],
      unexpectedColumns: [],
      missingRows: 0,
      extraRows: 0,
    }
  }

  let message: string
  if (!columnsOk) {
    message = "Your result has different columns than the reference."
    if (missingColumns.length) {
      message += ` Missing: ${missingColumns.join(", ")}.`
    }
    if (unexpectedColumns.length) {
      message += ` Unexpected: ${unexpectedColumns.join(", ")}.`
    }
    message += " Check your SELECT list and column aliases."
  } else {
    message =
      `Same columns, but the data doesn't match: expected ${expectedRowCount} row(s), ` +
      `got ${actualRowCount}.`
    if (missingRows || extraRows) {
      message += ` ${missingRows} expected row(s) not found, ${extraRows} unexpected row(s).`
    }
    message += " Re-check your joins, filters and aggregates."
  }

  return {
    status: "wrong",
    message,
    columnsOk,
    rowsOk,
    expectedColumns: challenge.expectedColumns,
    actualColumns,
    expectedRowCount,
    actualRowCount,
    missingColumns,
    unexpectedColumns,
    missingRows,
    extraRows,
  }
}

export function difficultyColor(difficulty: Difficulty): string {
  switch (difficulty) {
    case "Easy":
      return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
    case "Intermediate":
      return "bg-amber-500/15 text-amber-400 border-amber-500/30"
    case "Advanced":
      return "bg-rose-500/15 text-rose-400 border-rose-500/30"
  }
}
