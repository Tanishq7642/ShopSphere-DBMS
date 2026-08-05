// ============================================================================
// ShopSphere-DBMS · lib/types.ts
// App-facing domain types (mirror the PostgreSQL schema in sql/00_schema.sql)
// ============================================================================

export interface Category {
  category_id: number
  category_name: string
}

export interface Product {
  product_id: number
  product_name: string
  price: number
  cogs: number
  category_id: number
  category?: Category
  stock?: number
  total_stock?: number
}

export interface Customer {
  customer_id: number
  first_name: string
  last_name: string
  state: string
  address?: string
}

export interface Seller {
  seller_id: number
  seller_name: string
}

export interface OrderRow {
  order_id: number
  order_date: Date | string
  customer_id: number
  seller_id: number
  product_id: number
  order_status: string
  customer_name?: string
  product_name?: string
  seller_name?: string
  total_price?: number
}

export interface InventoryRow {
  inventory_id: number
  product_id: number
  product_name?: string
  category_name?: string
  stock: number
  warehouse_id: number
  last_stock_date: Date | string
  stock_level?: string
}

export interface Kpis {
  total_products: number
  total_customers: number
  total_orders: number
  total_revenue: number
  avg_order_value: number
  total_sellers: number
  total_categories: number
  units_sold: number
  failed_payments: number
}

export interface RevenuePoint {
  date: string
  revenue: number
  orders: number
}

export interface CategorySalesRow {
  category_name: string
  revenue: number
  revenue_share_pct: number
  orders: number
}

export interface TopProductRow {
  product_name: string
  category_name: string
  revenue: number
  units_sold: number
  rank: number
}

export interface StatusBreakdown {
  status: string
  count: number
}

export interface SellerPerformanceRow {
  seller_name: string
  orders: number
  revenue: number
  avg_order_value: number
  revenue_rank: number
}

export interface RecentOrderRow {
  order_id: number
  order_date: string
  customer_name: string
  product_name: string
  total_price: number
  order_status: string
  payment_status: string | null
}
