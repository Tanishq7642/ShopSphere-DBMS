import psycopg2
import psycopg2.extras
import sys

# === PostgreSQL Connection Config ===
DB_CONFIG = {
    'dbname': 'project_db',
    'user': 'postgres',
    'password': 'T@nishq12.',
    'host': 'localhost',
    'port': 5432
}

# === Database Connection ===
def connect_to_db():
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        conn.autocommit = True
        print("✅ Connected to PostgreSQL.")
        return conn
    except Exception as e:
        print("❌ Connection error:", e)
        sys.exit(1)

# === Execute SQL Query ===
def execute_query(conn, query):
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
            cur.execute(query)
            if cur.description:
                rows = cur.fetchall()
                col_names = [desc.name for desc in cur.description]
                print("\n📊 Query Output:")
                print("-" * 80)
                print("\t".join(col_names))
                print("-" * 80)
                for row in rows:
                    print("\t".join(str(row[col]) for col in col_names))
            else:
                print("✅ Query executed. No data returned.")
    except psycopg2.errors.RaiseException as notice_err:
        print("🔔 Notice from server:", notice_err)
    except Exception as e:
        print("❌ Execution error:", e)

# === Predefined Functions (Example: Add Customer) ===
def add_customer(conn):
    name = input("Enter customer name: ")
    email = input("Enter customer email: ")
    query = f"SELECT add_customer('{name}', '{email}');"
    execute_query(conn, query)

def remove_customer(conn):
    cid = input("Enter customer ID to remove: ")
    query = f"SELECT remove_customer({cid});"
    execute_query(conn, query)

def add_seller(conn):
    name = input("Enter seller name: ")
    query = f"SELECT add_seller('{name}');"
    execute_query(conn, query)

def remove_seller(conn):
    sid = input("Enter seller ID to remove: ")
    query = f"SELECT remove_seller({sid});"
    execute_query(conn, query)

def add_product(conn):
    name = input("Enter product name: ")
    price = input("Enter product price: ")
    stock = input("Enter stock quantity: ")
    query = f"SELECT add_product('{name}', {price}, {stock});"
    execute_query(conn, query)

def remove_product(conn):
    pid = input("Enter product ID to remove: ")
    query = f"SELECT remove_product({pid});"
    execute_query(conn, query)

def update_stock(conn):
    pid = input("Enter product ID: ")
    qty = input("Enter new stock quantity: ")
    query = f"SELECT update_stock({pid}, {qty});"
    execute_query(conn, query)

def cancel_order(conn):
    oid = input("Enter order ID to cancel: ")
    query = f"SELECT cancel_order({oid});"
    execute_query(conn, query)

def list_products(conn):
    query = "CALL list_products();"
    execute_query(conn, query)

# === Command Map ===
COMMANDS = {
    'add customer': add_customer,
    'remove customer': remove_customer,
    'add seller': add_seller,
    'remove seller': remove_seller,
    'add product': add_product,
    'remove product': remove_product,
    'update stock': update_stock,
    'cancel order': cancel_order,
    'list products': list_products,
    # Add more command mappings as needed (25 total)
}

# === Main Program ===
def main():
    conn = connect_to_db()
    print("\n🖥️ PostgreSQL Command Interface\nType 'exit' to quit.\n")
    try:
        while True:
            cmd = input("COMMAND> ").strip().lower()
            if cmd in ('exit', 'quit'):
                break
            elif cmd in COMMANDS:
                COMMANDS[cmd](conn)
            else:
                print("❓ Unknown command. Try: " + ", ".join(COMMANDS.keys()))
    finally:
        conn.close()
        print("🔒 Connection closed.")

if __name__ == "__main__":
    main()
