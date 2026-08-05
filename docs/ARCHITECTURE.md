# Architecture

ShopSphere-DBMS is deliberately layered so the **database owns the business
logic** and every client is just a consumer of it.

```
┌────────────────────────────────────────────────────────────────────┐
│  CLIENTS                                                           │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────────────┐  │
│  │ Next.js web  │  │ Python CLI   │  │ psql / any SQL client   │  │
│  │ (Prisma ORM) │  │ (psycopg2)   │  │ (ad-hoc queries)        │  │
│  └──────┬───────┘  └──────┬───────┘  └────────────┬────────────┘  │
└─────────┼──────────────────┼───────────────────────┼───────────────┘
          │                  │                       │
┌─────────▼──────────────────▼───────────────────────▼───────────────┐
│  PostgreSQL 17 · ecommerce_db                                       │
│                                                                     │
│  ┌─────────────── VIEWS + MATERIALIZED VIEW (analytics) ─────────┐ │
│  │ v_order_details · v_top_products · v_revenue_daily ·          │ │
│  │ v_customer_lifetime_value · v_inventory_status ·              │ │
│  │ v_seller_performance · v_category_sales · v_payment_summary   │ │
│  │ mv_daily_revenue (refreshable)                                │ │
│  └───────────────────────────────────────────────────────────────┘ │
│  ┌─────────────── TRIGGERS (automation + integrity) ─────────────┐ │
│  │ trg_orders_audit · trg_customer_orders_audit                  │ │
│  │ trg_category_sales_audit · trg_prevent_negative_stock         │ │
│  │ trg_payment_completes_order (chaining)                        │ │
│  └───────────────────────────────────────────────────────────────┘ │
│  ┌─────────────── FUNCTIONS & PROCEDURES (business logic) ───────┐ │
│  │ 26 functions · place_order() 5-table transaction ·            │ │
│  │ cancel_order_proc() · restock_product() · sales rollup        │ │
│  └───────────────────────────────────────────────────────────────┘ │
│  ┌─────────────── 9 TABLES + AUDIT TABLES (3NF) ─────────────────┐ │
│  │ category · products · customers · sellers · orders ·          │ │
│  │ order_items · inventory · payments · shippings                │ │
│  └───────────────────────────────────────────────────────────────┘ │
│  INDEXES: B-tree · composite · partial · expression · GIN (FTS)   │
└────────────────────────────────────────────────────────────────────┘
```

## Why the logic lives in the database

1. **No client can break the rules.** Whether data arrives from the web form,
   the Python CLI, or a raw `psql` session, the constraints, triggers and
   procedures enforce the same invariants.
2. **Atomicity is provable.** `place_order()` touches five tables inside one
   transaction — stock is reserved only if *every* step succeeds, and the
   error path rolls everything back.
3. **Auditability is automatic.** You cannot mutate `orders` without writing
   to `order_logs`. That is the difference between a demo and a system.

## The data story (why the dataset is interesting)

The 800-record CSV dataset was generated to look *real* — and like all real
data, it contains problems the analytics layer is designed to surface:

- **287 orders shipped/delivered without a completed payment** — a cash-flow
  anomaly an analyst would escalate.
- **Products priced below cost** (e.g. `Product_789`: ₹20.24 vs ₹242.18 COGS)
  — a margin red flag for the merchandising team.
- **Duplicate seller business names** — a master-data cleanup ticket.
- **Products stocked across multiple warehouses** with some at zero stock.

`scripts/verify_db.py` codifies these checks into a repeatable audit that
prints **PASS/FAIL** and exits non-zero on violation — the same pattern data
engineering teams ship as nightly data-quality jobs.

## Request flow (web)

```
Browser → Next.js server component → Prisma ORM ($queryRaw for the SQL views)
        → PostgreSQL → serialized JSON → recharts (charts) / tables (UI)
SQL Playground → POST /api/query → executeQuery() (read-only guard + 10s
        timeout) → $queryRawUnsafe → results table + CSV export
```
