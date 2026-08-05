import psycopg2
import psycopg2.extras
import sys

DB_CONFIG = {
    'dbname': 'project_db',
    'user': 'postgres',
    'password': 'T@nishq12.',
    'host': 'localhost',
    'port': 5432
}

def connect_to_db():
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        conn.autocommit = True
        print("✅ Connected to PostgreSQL.")
        return conn
    except Exception as e:
        print("❌ Connection error:", e)
        sys.exit(1)

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

# === 25 Operations ===
def add_customer(conn):
    fn = input("First name: ")
    ln = input("Last name: ")
    st = input("State: ")
    addr = input("Address: ")
    execute_query(conn, f"SELECT add_customer('{fn}', '{ln}', '{st}', '{addr}');")

def remove_customer(conn):
    cid = input("Customer ID: ")
    execute_query(conn, f"SELECT remove_customer({cid});")

def add_seller(conn):
    name = input("Seller name: ")
    origin = input("Origin: ")
    execute_query(conn, f"SELECT add_seller('{name}', '{origin}');")

def remove_seller(conn):
    sid = input("Seller ID: ")
    execute_query(conn, f"SELECT remove_seller({sid});")

def add_product(conn):
    name = input("Product name: ")
    price = input("Price: ")
    cogs = input("COGS: ")
    cat = input("Category ID: ")
    execute_query(conn, f"SELECT add_product('{name}', {price}, {cogs}, {cat});")

def remove_product(conn):
    pid = input("Product ID: ")
    execute_query(conn, f"SELECT remove_product({pid});")

def add_inventory(conn):
    pid = input("Product ID: ")
    stock = input("Stock: ")
    wid = input("Warehouse ID: ")
    date = input("Stock date (YYYY-MM-DD): ")
    execute_query(conn, f"SELECT add_inventory({pid}, {stock}, {wid}, '{date}');")

def update_stock(conn):
    pid = input("Product ID: ")
    stock = input("New stock: ")
    execute_query(conn, f"SELECT update_stock({pid}, {stock});")

def add_order(conn):
    oid = input("Order ID: ")
    cid = input("Customer ID: ")
    sid = input("Seller ID: ")
    pid = input("Product ID: ")
    status = input("Status: ")
    odate = input("Order Date (YYYY-MM-DD): ")
    execute_query(conn, f"SELECT add_order({oid}, {cid}, {sid}, {pid}, '{status}', '{odate}');")

def cancel_order(conn):
    oid = input("Order ID: ")
    execute_query(conn, f"SELECT cancel_order({oid});")

def process_payment(conn):
    payid = input("Payment ID: ")
    oid = input("Order ID: ")
    pdate = input("Payment Date (YYYY-MM-DD): ")
    rdate = input("Return Date (YYYY-MM-DD): ")
    status = input("Status: ")
    execute_query(conn, f"SELECT process_payment({payid}, {oid}, '{pdate}', '{rdate}', '{status}');")

def add_shipping(conn):
    sid = input("Shipping ID: ")
    oid = input("Order ID: ")
    sdate = input("Shipping Date (YYYY-MM-DD): ")
    status = input("Delivery Status (e.g., Shipped, Delivered): ")
    rdate = input("Return Date (YYYY-MM-DD) or leave blank if none: ")
    provider = input("Shipping Provider: ")

    if rdate.strip() == "":
        rdate_sql = "NULL"
    else:
        rdate_sql = f"'{rdate}'"

    query = f"""
    SELECT add_shipping(
        {sid}::integer, 
        {oid}::integer, 
        '{sdate}'::date, 
        '{status}'::varchar, 
        {rdate_sql}::date, 
        '{provider}'::varchar
    );
    """
    execute_query(conn, query)



def return_product(conn):
    oid = input("Order ID: ")
    rdate = input("Return Date (YYYY-MM-DD): ")
    execute_query(conn, f"SELECT return_product({oid}, '{rdate}');")

def show_customer_orders(conn):
    cid = input("Customer ID: ")
    execute_query(conn, f"SELECT * FROM show_customer_orders({cid});")

def seller_revenue(conn):
    sid = input("Seller ID: ")
    execute_query(conn, f"SELECT * FROM seller_revenue({sid});")

def add_order_item(conn):
    iid = input("Order Item ID: ")
    oid = input("Order ID: ")
    pid = input("Product ID: ")
    qty = input("Quantity: ")
    price = input("Price per unit: ")
    execute_query(conn, f"SELECT add_order_item({iid}, {oid}, {pid}, {qty}, {price});")

def remove_order(conn):
    oid = input("Order ID: ")
    execute_query(conn, f"SELECT remove_order({oid});")

def remove_inventory(conn):
    iid = input("Inventory ID: ")
    execute_query(conn, f"SELECT remove_inventory({iid});")

def list_products(conn):
    execute_query(conn, "SELECT * FROM products;")

def top_selling_product(conn):
    execute_query(conn, "SELECT * FROM top_selling_product();")

def products_by_category(conn):
    cid = input("Category ID: ")
    execute_query(conn, f"SELECT * FROM products_by_category({cid});")

def list_customers(conn):
    execute_query(conn, "SELECT * FROM list_customers();")

def list_sellers(conn):
    execute_query(conn, "SELECT * FROM list_sellers();")

def product_stock(conn):
    pid = input("Product ID: ")
    execute_query(conn, f"SELECT * FROM product_stock({pid});")

def category_sales(conn):
    execute_query(conn, "SELECT * FROM category_sales();")

COMMANDS = {
    'add customer': add_customer,
    'remove customer': remove_customer,
    'add seller': add_seller,
    'remove seller': remove_seller,
    'add product': add_product,
    'remove product': remove_product,
    'add inventory': add_inventory,
    'update stock': update_stock,
    'add order': add_order,
    'cancel order': cancel_order,
    'process payment': process_payment,
    'add shipping': add_shipping,
    'return product': return_product,
    'show customer orders': show_customer_orders,
    'seller revenue': seller_revenue,
    'add order item': add_order_item,
    'remove order': remove_order,
    'remove inventory': remove_inventory,
    'list products': list_products,
    'top selling product': top_selling_product,
    'products by category': products_by_category,
    'list customers': list_customers,
    'list sellers': list_sellers,
    'product stock': product_stock,
    'category sales': category_sales
}

def main():
    conn = connect_to_db()
    print("\n🖥️ PostgreSQL Terminal Interface — 25 Commands")
    print("Type 'exit' to quit.")
    try:
        while True:
            cmd = input("COMMAND> ").strip().lower()
            if cmd in ('exit', 'quit'):
                break
            elif cmd in COMMANDS:
                COMMANDS[cmd](conn)
            else:
                print("❓ Unknown command. Try one of:", ", ".join(COMMANDS))
    finally:
        conn.close()
        print("🔒 Connection closed.")

if __name__ == "__main__":
    main()
