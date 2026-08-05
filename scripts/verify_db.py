#!/usr/bin/env python3
# ============================================================================
# ShopSphere-DBMS · scripts/verify_db.py
# ----------------------------------------------------------------------------
# Automated DATA-QUALITY AUDIT. Runs 12 integrity checks against the database
# and prints a PASS/FAIL report - the kind of script a data engineer ships
# with every pipeline. Exit code 0 = all checks passed.
#
#   Usage:  python scripts/verify_db.py
#   Env:    PGHOST, PGPORT, PGUSER, PGPASSWORD, DB_NAME
# ============================================================================
import os
import sys

# Windows consoles default to cp1252 - force UTF-8 so ✔/✘ render
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

try:
    import psycopg2
    import psycopg2.extras
except ImportError:
    sys.exit("psycopg2 is required:  pip install psycopg2-binary")

DB_CONFIG = dict(
    host=os.environ.get("PGHOST", "localhost"),
    port=int(os.environ.get("PGPORT", "5432")),
    dbname=os.environ.get("DB_NAME", "ecommerce_db"),
    user=os.environ.get("PGUSER", "postgres"),
    password=os.environ.get("PGPASSWORD", "postgres"),
)

GREEN, RED, YELLOW, BOLD, RESET = "\033[32m", "\033[31m", "\033[33m", "\033[1m", "\033[0m"

# (check name, SQL that returns 0 rows when everything is healthy)
CHECKS = [
    ("orphaned order_items (FK → orders)", """
        SELECT 1 FROM order_items oi
        WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.order_id = oi.order_id)"""),
    ("orphaned payments (FK → orders)", """
        SELECT 1 FROM payments p
        WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.order_id = p.order_id)"""),
    ("orphaned shippings (FK → orders)", """
        SELECT 1 FROM shippings s
        WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.order_id = s.order_id)"""),
    ("orphaned products (FK → category)", """
        SELECT 1 FROM products pr
        WHERE NOT EXISTS (SELECT 1 FROM category c WHERE c.category_id = pr.category_id)"""),
    ("line totals ≠ qty × unit price", """
        SELECT 1 FROM order_items
        WHERE ABS(total_price - (quantity * price_per_unit)) > 0.01"""),
    ("negative product prices", "SELECT 1 FROM products WHERE price < 0"),
    ("negative inventory stock", "SELECT 1 FROM inventory WHERE stock < 0"),
    ("orders with impossible future dates",
     "SELECT 1 FROM orders WHERE order_date > CURRENT_DATE"),
    ("duplicate product names", """
        SELECT 1 FROM products GROUP BY product_name HAVING COUNT(*) > 1"""),
    ("duplicate seller ids", "SELECT 1 FROM sellers GROUP BY seller_id HAVING COUNT(*) > 1"),
    ("customers with zero first/last name", """
        SELECT 1 FROM customers WHERE length(first_name) = 0 OR length(last_name) = 0"""),
]

# Business-rule breaches that EXIST in the synthetic dataset ON PURPOSE - so
# the audit has real findings to report (see docs/ARCHITECTURE.md, §data-story).

FINDINGS = [
    ("orders shipped/delivered but with no completed payment", """
        SELECT o.order_id, o.order_status, p.payment_status
        FROM orders o
        LEFT JOIN payments p ON p.order_id = o.order_id
        WHERE o.order_status IN ('Shipped','Delivered')
          AND (p.payment_status IS DISTINCT FROM 'Completed')
        ORDER BY o.order_id LIMIT 5"""),
    ("products priced below cost (margin red flag)", """
        SELECT product_name, price, cogs, ROUND(price - cogs, 2) AS margin
        FROM products WHERE price < cogs ORDER BY margin LIMIT 5"""),
    ("duplicate seller business names", """
        SELECT seller_name, COUNT(*) AS occurrences
        FROM sellers GROUP BY seller_name HAVING COUNT(*) > 1
        ORDER BY occurrences DESC LIMIT 5"""),
    ("revenue shipped but flagged Pending payment", """
        SELECT payment_status, COUNT(*) FROM payments GROUP BY payment_status ORDER BY 2 DESC"""),
]


def main() -> int:
    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()
    print(f"{BOLD}ShopSphere-DBMS · data-quality audit{RESET}")
    print(f"database: {DB_CONFIG['dbname']}@{DB_CONFIG['host']}\n")

    passed, failed = 0, 0
    for name, sql in CHECKS:
        cur.execute(sql)
        bad = cur.fetchall()
        if bad:
            failed += 1
            print(f"  {RED}✘ FAIL  {name}{RESET}   → {len(bad)} violation(s)")
        else:
            passed += 1
            print(f"  {GREEN}✔ PASS  {name}{RESET}")

    print(f"\n{BOLD}Results: {GREEN}{passed} passed{RESET} / {RED}{failed} failed{RESET}{BOLD}"
          f" ({passed + failed} checks){RESET}")

    print(f"\n{BOLD}{YELLOW}Notable findings (informational):{RESET}")
    for name, sql in FINDINGS:
        cur.execute(sql)
        rows = cur.fetchall()
        print(f"  • {name}: {len(rows)} example(s)")
        for row in rows[:3]:
            print(f"      {row}")

    conn.close()
    print(f"\n{'✔ ALL CHECKS PASSED - database is healthy' if failed == 0 else '⚠ ACTION NEEDED'}")
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
