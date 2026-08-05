# Entity-Relationship Diagram

```mermaid
erDiagram
    category ||--o{ products : "categorizes"
    products ||--o{ order_items : "sold as"
    products ||--o{ orders : "ordered in"
    products ||--o{ inventory : "stocked as"
    orders ||--o{ order_items : "contains"
    orders ||--o{ payments : "paid by"
    orders ||--o{ shippings : "fulfilled by"
    customers ||--o{ orders : "places"
    sellers ||--o{ orders : "sells"

    category {
        int category_id PK
        varchar(20) category_name UK
    }
    products {
        int product_id PK
        varchar(50) product_name UK
        numeric(10,2) price
        numeric(10,2) cogs
        int category_id FK
    }
    customers {
        int customer_id PK
        varchar(20) first_name
        varchar(20) last_name
        varchar(100) state
        varchar(255) address
    }
    sellers {
        int seller_id PK
        varchar(50) seller_name
    }
    orders {
        int order_id PK
        date order_date
        int customer_id FK
        int seller_id FK
        int product_id FK
        order_status_enum order_status
    }
    order_items {
        int order_item_id PK
        int order_id FK
        int product_id FK
        int quantity
        numeric(10,2) price_per_unit
        numeric(12,2) total_price
    }
    inventory {
        int inventory_id PK
        int product_id FK
        int stock
        int warehouse_id
        date last_stock_date
    }
    payments {
        int payment_id PK
        int order_id FK
        date payment_date
        payment_mode_enum payment_mode
        payment_status_enum payment_status
    }
    shippings {
        int shipping_id PK
        int order_id FK
        date shipping_date
        date return_date
        delivery_status_enum delivery_status
    }
```

## Cardinality summary

| Relationship | Type | Meaning |
|---|---|---|
| `category → products` | 1 : N | one category groups many products |
| `products → order_items` | 1 : N | a product appears on many order lines |
| `products → inventory` | 1 : N | a product is stocked in several warehouses |
| `orders → order_items` | 1 : N | an order has one or more line items |
| `orders → payments` | 1 : N | an order can be paid in several attempts |
| `orders → shippings` | 1 : N | fulfilment history per order |
| `customers → orders` | 1 : N | one customer places many orders |
| `sellers → orders` | 1 : N | one seller fulfils many orders |

## Audit / support tables (fed by triggers)

| Table | Purpose |
|---|---|
| `order_logs` | every INSERT / UPDATE / DELETE on `orders`, with old/new status |
| `customer_order_logs` | per-customer order counters + last order date |
| `category_sales_logs` | category-level revenue ledger (star-schema style fact feed) |
| `daily_sales_snapshot` | ETL snapshot produced by `generate_daily_sales_rollup()` |
| `numbers` | 1..1000 utility series used by the recursive-CTE demos |
