from flask import Flask, request, render_template, jsonify
import psycopg2
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # Allow frontend to communicate with backend

# Database connection details
DB_CONFIG = {
    "dbname": "new_db",
    "user": "postgres",
    "password": "T@nishq12.",
    "host": "localhost",
    "port": "5432"
}

def query_database(sql_query):
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()
        cur.execute(sql_query)
        colnames = [desc[0] for desc in cur.description]
        results = cur.fetchall()
        cur.close()
        conn.close()
        return [dict(zip(colnames, row)) for row in results]
    except Exception as e:
        return {"error": str(e)}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/query', methods=['POST'])
def execute_query():
    data = request.json
    sql_query = data.get("query")
    result = query_database(sql_query)
    return jsonify(result)

if __name__ == '__main__':
    app.run(debug=True)
