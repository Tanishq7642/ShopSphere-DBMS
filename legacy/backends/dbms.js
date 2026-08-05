const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
app.use(cors());

// PostgreSQL Database Configuration
const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "new_db",
  password: "T@nishq12.",
  port: 5432,
});

// API Endpoint to Fetch Sales Data
app.get("/api/sales", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.product_id, p.product_name, SUM(o.quantity) AS quantity_sold, 
              SUM(o.quantity * o.price) AS total_sales
       FROM orders o
       JOIN products p ON o.product_id = p.product_id
       GROUP BY p.product_id, p.product_name
       ORDER BY total_sales DESC
       LIMIT 10;`
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching sales data:", err);
    res.status(500).json({ error: err.message });
  }
});

// Start Server
const PORT = 5000;
app.listen(PORT, () => {
  console.log(Server running on http://localhost:${5432});
});