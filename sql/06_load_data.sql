-- ============================================================================
-- ShopSphere-DBMS · 06_load_data.sql
-- ----------------------------------------------------------------------------
-- Bulk-loads the 800-record CSV dataset using psql's client-side \copy.
--
--   * \copy runs as your OS user (no server-side file permission issues)
--   * CSV headers do NOT need to match column names - we map them explicitly
--     (e.g. customers.f_name → first_name, inventory.stock_remaining → stock)
--   * Triggers are DISABLED during the load by scripts/setup_db.sh and
--     re-enabled afterwards - a standard ETL practice that keeps bulk loads
--     fast, deterministic, and free of per-row audit churn.
--
-- Run from the project root:  psql -U postgres -d ecommerce_db -f sql/06_load_data.sql
-- ============================================================================

-- 1 · category (10 rows)
\copy category (category_id, category_name) FROM 'data/categories_800.csv' WITH (FORMAT csv, HEADER true)

-- 2 · sellers (804 rows) - names contain quoted commas, handled by CSV QUOTE
\copy sellers (seller_id, seller_name) FROM 'data/sellers_800.csv' WITH (FORMAT csv, HEADER true)

-- 3 · customers (805 rows) - header has a BOM + CRLF; \copy skips headers safely
\copy customers (customer_id, first_name, last_name, state) FROM 'data/customers_realistic_800 - Copy.csv' WITH (FORMAT csv, HEADER true)

-- 4 · products (800 rows)
\copy products (product_id, product_name, price, cogs, category_id) FROM 'data/products_800.csv' WITH (FORMAT csv, HEADER true)

-- 5 · inventory (800 rows) - column mapping: stock_remaining→stock, ware_house_id→warehouse_id, restock_date→last_stock_date
\copy inventory (inventory_id, product_id, stock, warehouse_id, last_stock_date) FROM 'data/inventory_800.csv' WITH (FORMAT csv, HEADER true)

-- 6 · orders (710 rows)
\copy orders (order_id, order_date, customer_id, order_status, product_id, seller_id) FROM 'data/orders_800.csv' WITH (FORMAT csv, HEADER true)

-- 7 · order_items (713 rows)
\copy order_items (order_item_id, order_id, product_id, quantity, price_per_unit, total_price) FROM 'data/order_items_corrected_800.csv' WITH (FORMAT csv, HEADER true)

-- 8 · payments (710 rows)
\copy payments (payment_id, payment_date, payment_mode, payment_status, order_id) FROM 'data/payments_800.csv' WITH (FORMAT csv, HEADER true)

-- 9 · shippings (715 rows) - unquoted empty return_date loads as NULL
\copy shippings (shipping_id, order_id, delivery_status, shipping_date, return_date) FROM 'data/shipping_800.csv' WITH (FORMAT csv, HEADER true)
