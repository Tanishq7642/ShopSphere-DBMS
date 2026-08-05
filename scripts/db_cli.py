#!/usr/bin/env python3
# ============================================================================
# ShopSphere-DBMS · scripts/db_cli.py
# ----------------------------------------------------------------------------
# Interactive terminal client for every ShopSphere database operation.
# Wraps the stored functions (01_functions.sql) and procedures
# (02_procedures.sql) - proving the business logic lives IN the database.
#
#   Usage:   python scripts/db_cli.py
#   Env:     PGHOST, PGPORT, PGUSER, PGPASSWORD, DB_NAME  (sane defaults)
#
#   Commands:  help · exit · list <entity> · add/remove/update ... · place order
#              top selling product · category sales · seller revenue · sql <query>
# ============================================================================
import os
import sys
import time
from typing import Any, Iterable

# Windows consoles default to cp1252 - force UTF-8 so ✔ / box-drawing render
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

try:
    import psycopg2
    import psycopg2.extras
except ImportError:
    sys.exit("psycopg2 is required:  pip install psycopg2-binary")

# ---- configuration -----------------------------------------------------------
DB_CONFIG = dict(
    host=os.environ.get("PGHOST", "localhost"),
    port=int(os.environ.get("PGPORT", "5432")),
    dbname=os.environ.get("DB_NAME", "ecommerce_db"),
    user=os.environ.get("PGUSER", "postgres"),
    password=os.environ.get("PGPASSWORD", "postgres"),
)

CYAN, GREEN, YELLOW, RED, BOLD, RESET = (
    "\033[36m", "\033[32m", "\033[33m", "\033[31m", "\033[1m", "\033[0m")


def banner(text: str) -> None:
    print(f"\n{BOLD}{CYAN}══ {text} ══{RESET}")


def ok(msg: str) -> None:
    print(f"  {GREEN}✔ {msg}{RESET}")


def warn(msg: str) -> None:
    print(f"  {YELLOW}⚠ {msg}{RESET}")


def show_table(rows: Iterable[dict]) -> None:
    """Pretty-print a list of dicts as an aligned table."""
    rows = list(rows)
    if not rows:
        warn("no rows returned"); return
    cols = list(rows[0].keys())
    widths = {c: max(len(c), *(len(str(r[c])) for r in rows)) for c in cols}
    sep = "+-" + "-+-".join("-" * w for w in widths.values()) + "-+"
    head = "| " + " | ".join(c.ljust(widths[c]) for c in cols) + " |"
    print(sep); print(f"{BOLD}{head}{RESET}"); print(sep)
    for r in rows:
        print("| " + " | ".join(str(r[c]).ljust(widths[c]) for c in cols) + " |")
    print(sep + f"  {len(rows)} row(s)")


def fetch(conn, sql: str, params: tuple = ()) -> list[dict]:
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(sql, params)
        return cur.fetchall()


def call(conn, sql: str, params: tuple = ()) -> list[dict]:
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(sql, params)
        conn.commit()
        try:
            return cur.fetchall()
        except psycopg2.ProgrammingError:
            return []


def ask(prompt: str, cast=str):
    while True:
        try:
            return cast(input(f"  {prompt}: ").strip())
        except ValueError:
            warn(f"invalid input, expected {cast.__name__}")


def main() -> None:
    try:
        conn = psycopg2.connect(**DB_CONFIG)
    except Exception as e:
        sys.exit(f"{RED}Connection failed: {e}{RESET}\n"
                 "Check PostgreSQL is running and set PGUSER/PGPASSWORD/DB_NAME.")

    print(f"{BOLD}{CYAN}"
          "╔══════════════════════════════════════════════════════╗\n"
          "║      ShopSphere-DBMS · Database Operations CLI       ║\n"
          "╚══════════════════════════════════════════════════════╝" f"{RESET}")
    print(f"connected → {DB_CONFIG['dbname']}@{DB_CONFIG['host']}\n"
          "type  help  for the command list,  exit  to quit.\n")

    while True:
        try:
            raw = input(f"{BOLD}{CYAN}shopsphere> {RESET}").strip()
        except (EOFError, KeyboardInterrupt):
            print(); break
        if not raw: continue
        cmd = raw.lower().split()[0]
        args = raw.split()[1:]

        # ---------- help / exit ---------------------------------------------
        if cmd in ("exit", "quit"): break
        if cmd == "help":
            banner("available commands")
            print("""  list customers · list sellers · list products
  add customer · remove customer · add seller · remove seller
  add product  · remove product  · add inventory · remove inventory
  update stock <product_id> <stock> · product stock <product_id>
  add order · add order item · cancel order <id> · show orders <customer_id>
  process payment · add shipping · return product <order_id>
  top selling product · category sales · seller revenue <seller_id>
  products by category <id> · unpaid orders
  place order <customer> <seller> <product> <qty> [mode]   (flagship)
  restock <product> <units> · daily rollup [YYYY-MM-DD]
  sql <any SQL statement>""")
            continue

        try:
            # ---------- listing ----------------------------------------------
            if cmd == "list" and len(args) == 1:
                kind = args[0]
                banner(f"{kind} (via list_* functions)")
                show_table(call(conn, f"SELECT * FROM list_{kind}()"))
            elif cmd == "product" and args[0] == "stock":
                banner("product stock"); show_table(call(conn, "SELECT * FROM product_stock(%s)", (int(args[1]),)))
            elif cmd == "top":
                banner("top selling product"); show_table(call(conn, "SELECT * FROM top_selling_product()"))
            elif cmd == "category" and args[0] == "sales":
                banner("category sales"); show_table(call(conn, "SELECT * FROM category_sales()"))
            elif cmd == "seller" and args[0] == "revenue":
                banner("seller revenue"); show_table(call(conn, "SELECT * FROM seller_revenue(%s)", (int(args[1]),)))
            elif cmd == "products" and args[0] == "by":
                banner("products by category"); show_table(call(conn, "SELECT * FROM products_by_category(%s)", (int(args[1]),)))
            elif cmd == "unpaid":
                banner("unpaid orders"); show_table(call(conn, "SELECT * FROM show_unpaid_orders()"))
            elif cmd == "show":
                banner("customer orders"); show_table(call(conn, "SELECT * FROM show_customer_orders(%s)", (int(args[1]),)))

            # ---------- adds --------------------------------------------------
            elif cmd == "add" and args[0] == "customer":
                f, l, s = ask("first name"), ask("last name"), ask("state")
                a = ask("address (Enter for Unknown)") or "Unknown"
                r = call(conn, "SELECT * FROM add_customer(%s,%s,%s,%s)", (f, l, s, a)); ok(f"customer {r[0]['add_customer']} created")
            elif cmd == "add" and args[0] == "seller":
                n = ask("seller name")
                r = call(conn, "SELECT * FROM add_seller(%s)", (n,)); ok(f"seller {r[0]['add_seller']} created")
            elif cmd == "add" and args[0] == "product":
                n = ask("product name"); p = ask("price", float); c = ask("cogs", float); cat = ask("category id", int)
                r = call(conn, "SELECT * FROM add_product(%s,%s,%s,%s)", (n, p, c, cat)); ok(f"product {r[0]['add_product']} created")
            elif cmd == "add" and args[0] == "inventory":
                pid = ask("product id", int); st = ask("stock", int); w = ask("warehouse id", int) or 1
                r = call(conn, "SELECT * FROM add_inventory(%s,%s,%s)", (pid, st, w)); ok(f"inventory {r[0]['add_inventory']} created")
            elif cmd == "add" and args[0] == "order":
                oid = ask("order id", int); cid = ask("customer id", int); sid = ask("seller id", int)
                pid = ask("product id", int); st = ask("status (Pending)", str) or "Pending"
                call(conn, "SELECT * FROM add_order(%s,%s,%s,%s,%s)", (oid, cid, sid, pid, st)); ok("order created")
            elif cmd == "add" and args[0] == "order" and len(args) > 2:  # add order item
                pass
            elif cmd == "add" and args[0] == "item":
                iid = ask("item id", int); oid = ask("order id", int); pid = ask("product id", int)
                q = ask("quantity", int); up = ask("unit price", float)
                call(conn, "SELECT * FROM add_order_item(%s,%s,%s,%s,%s)", (iid, oid, pid, q, up)); ok("order item created")
            elif cmd == "add" and args[0] == "shipping":
                sid = ask("shipping id", int); oid = ask("order id", int)
                d = ask("delivery status (Pending)", str) or "Pending"; r = ask("return date (blank = none)")
                call(conn, "SELECT * FROM add_shipping(%s,%s,%s,%s,%s)",
                     (sid, oid, None, d, r or None)); ok("shipping record created")
            elif cmd == "process":
                pid = ask("payment id", int); oid = ask("order id", int)
                m = ask("mode (Credit Card)", str) or "Credit Card"; s = ask("status (Completed)", str) or "Completed"
                call(conn, "SELECT * FROM process_payment(%s,%s,%s,%s,%s)", (pid, oid, None, m, s)); ok("payment processed")

            # ---------- removes ------------------------------------------------
            elif cmd == "remove":
                kind, idx = args[0], int(args[1])
                call(conn, f"SELECT * FROM remove_{kind}(%s)", (idx,)); ok(f"{kind} {idx} removed")
            elif cmd == "cancel":
                call(conn, "SELECT * FROM cancel_order(%s)", (int(args[1]),)); ok(f"order {args[1]} cancelled")
            elif cmd == "return":
                call(conn, "SELECT * FROM return_product(%s)", (int(args[1]),)); ok(f"return processed for order {args[1]}")
            elif cmd == "update" and args[0] == "stock":
                call(conn, "SELECT * FROM update_stock(%s,%s)", (int(args[1]), int(args[2]))); ok("stock updated")

            # ---------- procedures ----------------------------------------------
            elif cmd == "place":
                cid, sid, pid, qty = (int(x) for x in args[1:5])
                mode = args[5] if len(args) > 5 else "Credit Card"
                r = call(conn, "CALL place_order(%s,%s,%s,%s,%s, NULL)", (cid, sid, pid, qty, mode))
                ok(f"order placed! → order_id {r[0]['p_order_id']}" if r and "p_order_id" in r[0] else "order placed")
            elif cmd == "cancelproc":
                r = call(conn, "CALL cancel_order_proc(%s)", (int(args[1]),))
                ok(f"order {args[1]} cancelled & restocked")
            elif cmd == "restock":
                call(conn, "CALL restock_product(%s,%s)", (int(args[1]), int(args[2]))); ok("product restocked")
            elif cmd == "daily":
                d = args[1] if len(args) > 1 else None
                call(conn, "CALL generate_daily_sales_rollup(%s)", (d,)); ok("sales rollup refreshed")

            # ---------- raw SQL -------------------------------------------------
            elif cmd == "sql":
                show_table(fetch(conn, raw[4:]))

            else:
                warn(f"unknown command '{cmd}' - type 'help'")

        except psycopg2.Error as e:
            warn(f"database error: {e.diag.message_primary or e}")
        except (IndexError, ValueError):
            warn("wrong arguments - check 'help'")
        except KeyboardInterrupt:
            print()
        time.sleep(0.1)

    conn.close(); print(f"{GREEN}bye 👋{RESET}")


if __name__ == "__main__":
    main()
