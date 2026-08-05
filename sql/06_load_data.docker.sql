-- ============================================================================
-- ShopSphere-DBMS · 06_load_data.docker.sql
-- ----------------------------------------------------------------------------
-- Docker variant of the dataset loader. The container mounts ./data at /data,
-- so \copy paths are absolute here (psql's CWD is not the project root).
-- Used by docker-compose.yml; the local setup uses 06_load_data.sql instead.
-- ============================================================================

\copy category (category_id, category_name) FROM '/data/categories_800.csv' WITH (FORMAT csv, HEADER true)
\copy sellers (seller_id, seller_name) FROM '/data/sellers_800.csv' WITH (FORMAT csv, HEADER true)
\copy customers (customer_id, first_name, last_name, state) FROM '/data/customers_realistic_800 - Copy.csv' WITH (FORMAT csv, HEADER true)
\copy products (product_id, product_name, price, cogs, category_id) FROM '/data/products_800.csv' WITH (FORMAT csv, HEADER true)
\copy inventory (inventory_id, product_id, stock, warehouse_id, last_stock_date) FROM '/data/inventory_800.csv' WITH (FORMAT csv, HEADER true)
\copy orders (order_id, order_date, customer_id, order_status, product_id, seller_id) FROM '/data/orders_800.csv' WITH (FORMAT csv, HEADER true)
\copy order_items (order_item_id, order_id, product_id, quantity, price_per_unit, total_price) FROM '/data/order_items_corrected_800.csv' WITH (FORMAT csv, HEADER true)
\copy payments (payment_id, payment_date, payment_mode, payment_status, order_id) FROM '/data/payments_800.csv' WITH (FORMAT csv, HEADER true)
\copy shippings (shipping_id, order_id, delivery_status, shipping_date, return_date) FROM '/data/shipping_800.csv' WITH (FORMAT csv, HEADER true)
