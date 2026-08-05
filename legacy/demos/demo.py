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

def connect_to_db():
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        conn.autocommit = True  # So CALL, INSERT, etc., work instantly
        print("✅ Connected to PostgreSQL.")
        return conn
    except Exception as e:
        print("❌ Connection error:", e)
        sys.exit(1)

def execute_query(conn, query):
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
            cur.execute(query)

            # Output results for SELECT or anything returning data
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

def main():
    conn = connect_to_db()
    print("🖥️ Type your SQL below (type 'exit' to quit):")
    try:
        while True:
            query = input("\nSQL> ").strip()
            if query.lower() == 'exit':
                break
            if query:
                execute_query(conn, query)
    finally:
        conn.close()
        print("🔒 Connection closed.")

if __name__ == "__main__":
    main()

