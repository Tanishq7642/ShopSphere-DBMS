#!/usr/bin/env bash
# ============================================================================
# ShopSphere-DBMS · scripts/setup_db.sh
# ----------------------------------------------------------------------------
# ONE-COMMAND database setup:
#   1. creates the ecommerce_db database
#   2. runs every sql/ file in dependency order
#   3. bulk-loads the 800-record CSV dataset (triggers paused, then resumed)
#   4. verifies row counts and prints a summary
#
# Usage:  bash scripts/setup_db.sh
# Env:    PGUSER (default postgres) · PGPASSWORD (default 'postgres')
# ============================================================================
set -euo pipefail

# --- locate psql -------------------------------------------------------------
PSQL="${PSQL:-}"
if [ -z "$PSQL" ]; then
  for candidate in psql "/c/Program Files/PostgreSQL/17/bin/psql" "/c/Program Files/PostgreSQL/16/bin/psql" "/usr/local/bin/psql" "/usr/bin/psql"; do
    if command -v "$candidate" >/dev/null 2>&1 || [ -x "$candidate" ]; then
      PSQL="$candidate"; break
    fi
  done
fi
if [ -z "$PSQL" ]; then
  echo "❌ psql not found. Install PostgreSQL or set PSQL=/path/to/psql"; exit 1
fi

PGUSER="${PGUSER:-postgres}"
PGPASSWORD="${PGPASSWORD:-postgres}"
export PGPASSWORD
DB_NAME="${DB_NAME:-ecommerce_db}"
HOST="${PGHOST:-localhost}"
PORT="${PGPORT:-5432}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

step() { echo; echo "── $1"; }

echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║  ShopSphere-DBMS · database setup                                 ║"
echo "╚══════════════════════════════════════════════════════════════════╝"

# 1 · (re)create the database -----------------------------------------------
step "1/8 · Creating database '$DB_NAME'"
"$PSQL" -U "$PGUSER" -h "$HOST" -p "$PORT" -d postgres -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS $DB_NAME;"
"$PSQL" -U "$PGUSER" -h "$HOST" -p "$PORT" -d postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE $DB_NAME;"

# Shared psql args (array keeps quoted paths with spaces intact)
DB_ARGS=( -U "$PGUSER" -h "$HOST" -p "$PORT" -d "$DB_NAME" -v ON_ERROR_STOP=1 )

# 2 · schema -----------------------------------------------------------------
step "2/8 · Applying schema (00_schema.sql)"
"$PSQL" "${DB_ARGS[@]}" -f sql/00_schema.sql

# 3 · functions ---------------------------------------------------------------
step "3/8 · Creating stored functions (01_functions.sql)"
"$PSQL" "${DB_ARGS[@]}" -f sql/01_functions.sql

# 4 · procedures ---------------------------------------------------------------
step "4/8 · Creating stored procedures (02_procedures.sql)"
"$PSQL" "${DB_ARGS[@]}" -f sql/02_procedures.sql

# 5 · triggers ---------------------------------------------------------------
step "5/8 · Creating triggers (03_triggers.sql)"
"$PSQL" "${DB_ARGS[@]}" -f sql/03_triggers.sql

# 6 · bulk data load -----------------------------------------------------------
step "6/8 · Loading 800-record CSV dataset (triggers paused)"
"$PSQL" "${DB_ARGS[@]}" -c "ALTER TABLE orders      DISABLE TRIGGER ALL;
        ALTER TABLE order_items DISABLE TRIGGER ALL;
        ALTER TABLE payments    DISABLE TRIGGER ALL;
        ALTER TABLE inventory   DISABLE TRIGGER ALL;"
"$PSQL" "${DB_ARGS[@]}" -f sql/06_load_data.sql
"$PSQL" "${DB_ARGS[@]}" -c "ALTER TABLE orders      ENABLE TRIGGER ALL;
        ALTER TABLE order_items ENABLE TRIGGER ALL;
        ALTER TABLE payments    ENABLE TRIGGER ALL;
        ALTER TABLE inventory   ENABLE TRIGGER ALL;"

# 7 · views + analytics ---------------------------------------------------------
step "7/8 · Creating views & materialized views (04_views.sql)"
"$PSQL" "${DB_ARGS[@]}" -f sql/04_views.sql

step "8/8 · Running the analytics showcase (05_analytics.sql)"
"$PSQL" "${DB_ARGS[@]}" -f sql/05_analytics.sql > /tmp/shopsphere_analytics.out 2>&1 || {
  echo "⚠ 05_analytics.sql printed diagnostics; continuing..."; }

# -----------------------------------------------------------------------------
step "Verification · row counts"
"$PSQL" "${DB_ARGS[@]}" -t -c "
SELECT 'category',   COUNT(*) FROM category
UNION ALL SELECT 'customers',  COUNT(*) FROM customers
UNION ALL SELECT 'products',   COUNT(*) FROM products
UNION ALL SELECT 'sellers',    COUNT(*) FROM sellers
UNION ALL SELECT 'orders',     COUNT(*) FROM orders
UNION ALL SELECT 'order_items',COUNT(*) FROM order_items
UNION ALL SELECT 'inventory',  COUNT(*) FROM inventory
UNION ALL SELECT 'payments',   COUNT(*) FROM payments
UNION ALL SELECT 'shippings',  COUNT(*) FROM shippings;"

step "Verification · foreign-key integrity"
"$PSQL" "${DB_ARGS[@]}" -t -c "
SELECT 'orphaned order_items', COUNT(*) FROM order_items oi WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.order_id = oi.order_id)
UNION ALL SELECT 'orphaned payments', COUNT(*) FROM payments p WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.order_id = p.order_id)
UNION ALL SELECT 'orphaned shippings', COUNT(*) FROM shippings s WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.order_id = s.order_id);"

echo
echo "✅ Done! Database '$DB_NAME' is ready."
echo "   Connect:  \"$PSQL\" -U $PGUSER -d $DB_NAME"
echo "   Web app:  cp .env.example .env  →  pnpm install  →  pnpm dev"
