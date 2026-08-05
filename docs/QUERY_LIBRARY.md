# Query Library — how to use & extend it

The **40-query SQL showcase** lives in two places that stay in sync:

| Location | Purpose |
|---|---|
| `sql/05_analytics.sql` | the authoritative, annotated source — run it with psql |
| `lib/query-library.ts` | the same queries surfaced in the web **SQL Playground** |

## Run everything from the terminal

```bash
psql -U postgres -d ecommerce_db -f sql/05_analytics.sql
```

## Explore one skill at a time in the browser

1. Open **http://localhost:3000/admin/database**
2. Click any entry in the left **Query Library** — it loads into the editor
3. Hit **Execute** — results render with pagination and **CSV export**

## Structure of a library entry

```ts
{
  id: "window-running-total",           // unique id
  category: "7 · Window functions",     // groups the sidebar
  title: "Running total · cumulative revenue",
  description: "SUM OVER with a framing clause.",
  sql: "SELECT order_date, revenue, ...",
}
```

## Extending the library

1. Add or edit the query in `sql/05_analytics.sql` (keep it runnable + commented).
2. Mirror it in `lib/query-library.ts` so it appears in the playground.
3. `pnpm typecheck` and re-run `psql -f sql/05_analytics.sql` to confirm.

> 💡 Tip: the SQL playground only allows **read-only** statements. Data
> modifications are exercised through the Python CLI (`scripts/db_cli.py`)
> which calls the stored procedures.

## Skills covered (one query per skill)

Joins (inner/left/full/self/cross) · aggregation & HAVING · scalar, correlated
& EXISTS subqueries · chained & recursive CTEs · ROW_NUMBER/RANK/DENSE_RANK ·
NTILE quartiles · LAG/LEAD · running totals · moving averages · UNION /
INTERSECT / EXCEPT · CASE buckets · COALESCE/NULLIF · string functions · date
parts · ROLLUP / CUBE · FILTER pivots · full-text search · EXPLAIN · FK
integrity audits · money-consistency checks · margin red-flag detection
