# 🛍️ ShopSphere-DBMS

### A production-grade E-Commerce **Database Management System** — where every SQL skill is implemented, documented, and runnable.

> **The elevator pitch:** A normalized 9-table PostgreSQL schema built from an 800-record real-world dataset, hardened with constraints, enums, indexes, 30+ stored functions & procedures, trigger-based audit trails, and a full analytics layer — exposed through a polished Next.js dashboard and an interactive **SQL playground** where you can run every query yourself.

---

## ✨ Why this project stands out

| Capability | What it proves |
|---|---|
| 🗂️ **Normalization (3NF)** | 9 entities, zero redundancy, documented FK relationships |
| 🔐 **Data integrity** | PK / FK / UNIQUE / CHECK constraints, domain `ENUM`s, `NOT NULL` discipline |
| ⚡ **Performance** | B-tree, composite, **partial** (`WHERE status = 'Pending'`) & **expression** (`LOWER(name)`) indexes |
| 🧠 **Stored logic** | 30+ `FUNCTION`s + `PROCEDURE`s with **explicit transactions** (a 5-table checkout is atomic) |
| 👁️ **Database automation** | 5 triggers: audit logging, negative-stock guard, payment→order state machine, category sales ledger |
| 📊 **Analytics layer** | Views + materialized view + a 40-query showcase: window functions, CTEs (incl. recursive), ROLLUP/CUBE, pivots, full-text search, `EXPLAIN` |
| 🔍 **Data engineering** | 800-row CSV dataset, column-mapped `\copy` ETL, automated **data-quality audit** (`verify_db.py`) |
| 🖥️ **Full-stack delivery** | Next.js 15 + Prisma dashboard, Python 25-operation CLI, REST API, GitHub Actions CI |

---

## 🏗️ Tech stack

<p align="center">
  <img src="https://img.shields.io/badge/PostgreSQL-17-4169E1?logo=postgresql&logoColor=white" alt="PostgreSQL 17"/>
  <img src="https://img.shields.io/badge/Prisma-6.5-2D3748?logo=prisma&logoColor=white" alt="Prisma 6.5"/>
  <img src="https://img.shields.io/badge/Next.js-15-black?logo=next.js&logoColor=white" alt="Next.js 15"/>
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white" alt="React 19"/>
  <img src="https://img.shields.io/badge/Tailwind-3.4-38BDF8?logo=tailwindcss&logoColor=white" alt="Tailwind 3.4"/>
  <img src="https://img.shields.io/badge/Python-3.13-3776AB?logo=python&logoColor=white" alt="Python 3.13"/>
  <img src="https://img.shields.io/badge/CI-GitHub%20Actions-2088FF?logo=githubactions&logoColor=white" alt="CI"/>
  <img src="https://img.shields.io/badge/Recharts-2.15-22B8CF?logo=chartdotjs&logoColor=white" alt="Recharts"/>
  <img src="https://img.shields.io/badge/License-MIT-green" alt="MIT"/>
</p>

---

## 🚀 Quickstart (2 commands + 1)

> **Requirements:** PostgreSQL 17 running locally (any user with create-database rights), Node 20+, Python 3.10+.

```bash
# 1 · create the database, schema, stored routines, and load 800 records
cp .env.example .env          # then edit DATABASE_URL to match your PostgreSQL
bash scripts/setup_db.sh      # (Windows: run from Git Bash, or set PSQL=...)

# 2 · install & launch the web app
pnpm install
pnpm dev                      # → http://localhost:3000

# 3 · (optional) the Python tooling
pip install -r scripts/requirements.txt
python scripts/db_cli.py      # interactive 25-operation CLI
python scripts/verify_db.py   # automated data-quality audit
```

<details>
<summary><b>🐳 Prefer Docker? (zero local setup)</b></summary>

```bash
docker compose up -d db       # boots PostgreSQL 17 + auto-runs every sql/ file
docker compose up app         # boots the Next.js app on :3000
```

The container image for the database loads the schema, functions, procedures,
triggers, views and the 800-record dataset automatically.
</details>

---

## 🧭 What's inside

```
ShopSphere-DBMS/
├── sql/                          ★ THE SQL DELIVERABLE — fully annotated
│   ├── 00_schema.sql             DDL: enums, 9 tables, constraints, indexes
│   ├── 01_functions.sql          26 stored functions (business logic)
│   ├── 02_procedures.sql         4 procedures incl. the 5-table place_order() tx
│   ├── 03_triggers.sql           5 triggers: audit, guards, state machine
│   ├── 04_views.sql              10 views + materialized view
│   ├── 05_analytics.sql          ★ 40-query SQL skill showcase (17 sections)
│   └── 06_load_data.sql          \copy ETL with explicit column mapping
├── scripts/
│   ├── setup_db.sh               one-command DB creation + load + verify
│   ├── db_cli.py                 25-operation interactive Python CLI
│   ├── verify_db.py              automated data-quality audit (PASS/FAIL)
│   └── requirements.txt
├── app/                          Next.js 15 frontend
│   ├── page.tsx                  landing (live KPI stats)
│   ├── products/                 storefront: search · filter · sort · pages
│   ├── admin/                    analytics dashboard + orders/customers/
│   │                             inventory/products management
│   └── admin/database/           ★ SQL Playground with 40-query library
├── prisma/schema.prisma          introspected ORM mapping (matches sql/ 1:1)
├── data/                         9 CSVs · 800 records each
├── legacy/                       earlier iterations (Python demos, Express &
│                                 Flask backends, course presentation)
├── .github/workflows/ci.yml      typecheck + build + SQL smoke test on push
├── docker-compose.yml            postgres + app
└── docs/                         ERD, architecture, query-library walkthrough
```

---

## 📚 The SQL skill showcase (`sql/05_analytics.sql`)

Everything below runs as-is against the dataset — open the **SQL Playground**
(`/admin/database`) and click any entry in the library:

| § | Skill | Example |
|---|---|---|
| 3 | Joins | INNER · LEFT · FULL OUTER · **SELF** · CROSS |
| 4 | Aggregation | `GROUP BY` + `HAVING` above-average categories |
| 5 | Subqueries | scalar, **correlated** (`MAX(price)` per category), `EXISTS` |
| 6 | CTEs | chained pipelines + **RECURSIVE** (calendar & Fibonacci) |
| 7 | Window functions | `ROW_NUMBER`/`RANK`/`DENSE_RANK`, `NTILE`, `LAG/LEAD`, running totals, **moving averages** |
| 8 | Set operations | `UNION` · `INTERSECT` · `EXCEPT` |
| 9 | CASE & NULL | price-band histogram, `COALESCE`/`NULLIF` |
| 10 | String & date | `SPLIT_PART`, `EXTRACT`, `AGE`, `DATE_TRUNC` |
| 11 | Grouping sets | `ROLLUP` · `CUBE` (state × status) |
| 12 | Pivot & search | `FILTER`-based crosstabs, **full-text search** with `ts_rank` |
| 16 | Performance | `EXPLAIN ANALYZE`, index-usage stats |
| 17 | Data quality | orphan-FK audit, money-consistency, below-cost margins |

---

## 🧪 Verification & CI

| Check | Command | Result |
|---|---|---|
| FK integrity + constraints | `python scripts/verify_db.py` | **11/11 PASS** (verified against live DB) |
| Row counts | `scripts/setup_db.sh` (final step) | 800 × 9 tables, 0 orphans |
| Type safety | `pnpm typecheck` | ✅ 0 errors |
| Production build | `pnpm build` | ✅ 15 routes |
| CI (GitHub Actions) | `.github/workflows/ci.yml` | typecheck → build → **SQL smoke test** against a Postgres service container |

The repository ships with a **fully reproducible database**: `setup_db.sh` drops
and recreates `ecommerce_db` from the versioned SQL scripts every time — the
same way a real team ships schema migrations.

---

## 📈 A taste of the data story

- **800 products** across **10 categories**, priced 13.85 → 473.03 (₹)
- **800 orders** with a realistic status mix: Pending / Shipped / Delivered / Cancelled
- **800 customers** across 100+ countries, 800 sellers (some with duplicate business names — *a real data-quality finding the audit surfaces*)
- Products priced **below cost**, payments that failed, orders shipped without a completed payment — all deliberately present in the synthetic dataset so the analytics layer has something to discover.

---

## 🗺️ Roadmap ideas

- [ ] Add `pg_cron`-driven nightly refresh of `mv_daily_revenue`
- [ ] Auth (admin role) before exposing the playground
- [ ] Click-to-`EXPLAIN ANALYZE` toggle in the playground
- [ ] Deploy the dashboard (Vercel) + DB (Neon/RDS)

---

## 📄 License

[MIT](./LICENSE) — free to use, learn from, and extend.
