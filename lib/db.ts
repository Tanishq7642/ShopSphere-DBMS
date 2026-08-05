// ============================================================================
// ShopSphere-DBMS · lib/db.ts
// Data-access layer. Prisma ORM for CRUD; $queryRaw against the SQL views +
// analytics functions for the dashboard (the schema + views live in sql/).
// ============================================================================
import { PrismaClient, Prisma } from "@prisma/client"

import type {
  Category,
  CategorySalesRow,
  Customer,
  InventoryRow,
  Kpis,
  OrderRow,
  Product,
  RecentOrderRow,
  RevenuePoint,
  SellerPerformanceRow,
  StatusBreakdown,
  TopProductRow,
} from "./types"

// Singleton client (avoids connection exhaustion in dev hot-reload)
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined }
export const prisma = globalForPrisma.prisma ?? new PrismaClient()
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma

const num = (v: unknown): number => (v == null ? 0 : Number(v))

// ---------------------------------------------------------------------------
// CATALOG
// ---------------------------------------------------------------------------

export async function getCategories(): Promise<Category[]> {
  return prisma.category.findMany({ orderBy: { category_name: "asc" } })
}

export async function getProducts(params: {
  query?: string
  categoryId?: number
  sort?: "name" | "price_asc" | "price_desc" | "newest"
  page?: number
  pageSize?: number
}): Promise<{ products: Product[]; total: number }> {
  const { query = "", categoryId, sort = "name", page = 1, pageSize = 12 } = params

  const where: Prisma.productsWhereInput = {
    AND: [
      categoryId ? { category_id: categoryId } : {},
      query
        ? {
            OR: [
              { product_name: { contains: query, mode: "insensitive" } },
              { category: { category_name: { contains: query, mode: "insensitive" } } },
            ],
          }
        : {},
    ],
  }

  const orderBy: Prisma.productsOrderByWithRelationInput[] =
    sort === "price_asc"
      ? [{ price: "asc" }]
      : sort === "price_desc"
        ? [{ price: "desc" }]
        : [{ product_name: "asc" }]

  const [products, total] = await Promise.all([
    prisma.products.findMany({
      where,
      include: { category: true, inventory: true },
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.products.count({ where }),
  ])

  return {
    products: products.map((p) => ({
      product_id: p.product_id,
      product_name: p.product_name,
      price: num(p.price),
      cogs: num(p.cogs),
      category_id: p.category_id,
      category: p.category,
      total_stock: p.inventory.reduce((acc, i) => acc + i.stock, 0),
    })),
    total,
  }
}

export async function getProductById(id: number): Promise<Product | null> {
  const p = await prisma.products.findUnique({
    where: { product_id: id },
    include: { category: true, inventory: true },
  })
  if (!p) return null
  return {
    product_id: p.product_id,
    product_name: p.product_name,
    price: num(p.price),
    cogs: num(p.cogs),
    category_id: p.category_id,
    category: p.category,
    total_stock: p.inventory.reduce((acc, i) => acc + i.stock, 0),
  }
}

export async function getRelatedProducts(productId: number, categoryId: number) {
  const products = await prisma.products.findMany({
    where: { category_id: categoryId, product_id: { not: productId } },
    include: { category: true, inventory: true },
    take: 4,
  })
  return products.map((p) => ({
    product_id: p.product_id,
    product_name: p.product_name,
    price: num(p.price),
    cogs: num(p.cogs),
    category_id: p.category_id,
    category: p.category,
    total_stock: p.inventory.reduce((acc, i) => acc + i.stock, 0),
  }))
}

export async function getFeaturedProducts(limit = 8) {
  // Featured = top sellers by completed revenue (a real business definition)
  const rows = await prisma.$queryRaw<{ product_id: number }[]>`
    SELECT pr.product_id
      FROM products pr
      JOIN order_items oi ON oi.product_id = pr.product_id
      JOIN orders o       ON o.order_id    = oi.order_id
      JOIN payments p     ON p.order_id    = o.order_id AND p.payment_status = 'Completed'
     GROUP BY pr.product_id
     ORDER BY SUM(oi.total_price) DESC
     LIMIT ${limit}`
  const ids = rows.map((r) => r.product_id)
  if (ids.length === 0) return []
  const products = await prisma.products.findMany({
    where: { product_id: { in: ids } },
    include: { category: true, inventory: true },
  })
  return products.map((p) => ({
    product_id: p.product_id,
    product_name: p.product_name,
    price: num(p.price),
    cogs: num(p.cogs),
    category_id: p.category_id,
    category: p.category,
    total_stock: p.inventory.reduce((acc, i) => acc + i.stock, 0),
  }))
}

// ---------------------------------------------------------------------------
// ANALYTICS (dashboard KPIs + charts - backed by the SQL views)
// ---------------------------------------------------------------------------

export async function getKpis(): Promise<Kpis> {
  const [productCount, customerCount, orderCount, sellerCount, categoryCount, revenueAgg, unitsAgg, failedPayments] =
    await Promise.all([
      prisma.products.count(),
      prisma.customers.count(),
      prisma.orders.count(),
      prisma.sellers.count(),
      prisma.category.count(),
      prisma.$queryRaw<{ v: unknown }[]>`
        SELECT COALESCE(SUM(oi.total_price), 0) AS v
          FROM order_items oi
          JOIN payments p ON p.order_id = oi.order_id AND p.payment_status = 'Completed'`,
      prisma.$queryRaw<{ v: unknown }[]>`
        SELECT COALESCE(SUM(oi.quantity), 0) AS v
          FROM order_items oi
          JOIN payments p ON p.order_id = oi.order_id AND p.payment_status = 'Completed'`,
      prisma.payments.count({ where: { payment_status: "Failed" } }),
    ])

  const revenue = num(revenueAgg[0]?.v)
  return {
    total_products: productCount,
    total_customers: customerCount,
    total_orders: orderCount,
    total_revenue: revenue,
    avg_order_value: orderCount > 0 ? revenue / orderCount : 0,
    total_sellers: sellerCount,
    total_categories: categoryCount,
    units_sold: num(unitsAgg[0]?.v),
    failed_payments: failedPayments,
  }
}

export async function getRevenueDaily(): Promise<RevenuePoint[]> {
  const rows = await prisma.$queryRaw<{ order_date: Date; revenue: unknown; orders: unknown }[]>`
    SELECT order_date, revenue, orders FROM v_revenue_daily ORDER BY order_date`
  return rows.map((r) => ({
    date: r.order_date instanceof Date ? r.order_date.toISOString().slice(0, 10) : String(r.order_date),
    revenue: num(r.revenue),
    orders: num(r.orders),
  }))
}

export async function getTopProducts(limit = 8): Promise<TopProductRow[]> {
  const rows = await prisma.$queryRaw<{
    product_name: string
    category_name: string
    revenue: unknown
    units_sold: unknown
    rank: unknown
  }[]>`
    SELECT product_name, category_name, revenue, units_sold, rank
      FROM v_top_products
     ORDER BY revenue DESC
     LIMIT ${limit}`
  return rows.map((r) => ({
    product_name: r.product_name,
    category_name: r.category_name,
    revenue: num(r.revenue),
    units_sold: num(r.units_sold),
    rank: num(r.rank),
  }))
}

export async function getCategorySales(): Promise<CategorySalesRow[]> {
  const rows = await prisma.$queryRaw<{
    category_name: string
    revenue: unknown
    revenue_share_pct: unknown
    orders: unknown
  }[]>`
    SELECT category_name, revenue, revenue_share_pct, orders FROM v_category_sales ORDER BY revenue DESC`
  return rows.map((r) => ({
    category_name: r.category_name,
    revenue: num(r.revenue),
    revenue_share_pct: num(r.revenue_share_pct),
    orders: num(r.orders),
  }))
}

export async function getOrderStatusBreakdown(): Promise<StatusBreakdown[]> {
  const rows = await prisma.orders.groupBy({ by: ["order_status"], _count: { order_id: true } })
  return rows.map((r) => ({ status: r.order_status, count: r._count.order_id }))
}

export async function getSellerPerformance(): Promise<SellerPerformanceRow[]> {
  const rows = await prisma.$queryRaw<{
    seller_name: string
    orders: unknown
    revenue: unknown
    avg_order_value: unknown
    revenue_rank: unknown
  }[]>`
    SELECT seller_name, orders, revenue, avg_order_value, revenue_rank FROM v_seller_performance ORDER BY revenue DESC LIMIT 10`
  return rows.map((r) => ({
    seller_name: r.seller_name,
    orders: num(r.orders),
    revenue: num(r.revenue),
    avg_order_value: num(r.avg_order_value),
    revenue_rank: num(r.revenue_rank),
  }))
}

export async function getRecentOrders(limit = 8): Promise<RecentOrderRow[]> {
  const rows = await prisma.$queryRaw<{
    order_id: number
    order_date: Date
    customer_name: string
    product_name: string
    total_price: unknown
    order_status: string
    payment_status: string | null
  }[]>`
    SELECT o.order_id, o.order_date,
           c.first_name || ' ' || c.last_name AS customer_name,
           pr.product_name,
           oi.total_price,
           o.order_status,
           p.payment_status
      FROM orders o
      JOIN customers c  ON c.customer_id = o.customer_id
      JOIN products pr  ON pr.product_id = o.product_id
      JOIN order_items oi ON oi.order_id = o.order_id
      LEFT JOIN payments p ON p.order_id = o.order_id
     ORDER BY o.order_date DESC, o.order_id DESC
     LIMIT ${limit}`
  return rows.map((r) => ({
    order_id: r.order_id,
    order_date: r.order_date instanceof Date ? r.order_date.toISOString().slice(0, 10) : String(r.order_date),
    customer_name: r.customer_name,
    product_name: r.product_name,
    total_price: num(r.total_price),
    order_status: r.order_status,
    payment_status: r.payment_status,
  }))
}

// ---------------------------------------------------------------------------
// ADMIN TABLES
// ---------------------------------------------------------------------------

export async function getOrders({ page = 1, pageSize = 50 }: { page?: number; pageSize?: number } = {}): Promise<
  OrderRow[]
> {
  const rows = await prisma.orders.findMany({
    include: {
      customers: { select: { first_name: true, last_name: true } },
      products: { select: { product_name: true } },
      sellers: { select: { seller_name: true } },
      order_items: { select: { total_price: true } },
      payments: { select: { payment_status: true } },
    },
    orderBy: [{ order_date: "desc" }, { order_id: "desc" }],
    skip: (page - 1) * pageSize,
    take: pageSize,
  })
  return rows.map((o) => ({
    order_id: o.order_id,
    order_date: o.order_date,
    customer_id: o.customer_id,
    seller_id: o.seller_id,
    product_id: o.product_id,
    order_status: o.order_status,
    customer_name: `${o.customers.first_name} ${o.customers.last_name}`,
    product_name: o.products.product_name,
    seller_name: o.sellers.seller_name,
    total_price: o.order_items.reduce((acc, i) => acc + num(i.total_price), 0),
  }))
}

export async function getCustomers({ page = 1, pageSize = 50 }: { page?: number; pageSize?: number } = {}): Promise<
  (Customer & { order_count: number })[]
> {
  const rows = await prisma.customers.findMany({
    include: { _count: { select: { orders: true } } },
    orderBy: { customer_id: "asc" },
    skip: (page - 1) * pageSize,
    take: pageSize,
  })
  return rows.map((c) => ({
    customer_id: c.customer_id,
    first_name: c.first_name,
    last_name: c.last_name,
    state: c.state,
    address: c.address,
    order_count: c._count.orders,
  }))
}

export async function getInventory(): Promise<InventoryRow[]> {
  const rows = await prisma.$queryRaw<{
    inventory_id: number
    product_id: number
    product_name: string
    category_name: string
    stock: number
    warehouse_id: number
    last_stock_date: Date
    stock_level: string
  }[]>`
    SELECT inventory_id, product_id, product_name, category_name, stock,
           warehouse_id, last_stock_date, stock_level
      FROM v_inventory_status
     ORDER BY stock ASC
     LIMIT 200`
  return rows.map((r) => ({
    inventory_id: r.inventory_id,
    product_id: r.product_id,
    product_name: r.product_name,
    category_name: r.category_name,
    stock: r.stock,
    warehouse_id: r.warehouse_id,
    last_stock_date: r.last_stock_date,
    stock_level: r.stock_level,
  }))
}

export async function getUnpaidShippedCount(): Promise<number> {
  // Orders that were shipped/delivered but never had a completed payment
  const rows = await prisma.$queryRaw<{ v: bigint }[]>`
    SELECT COUNT(*) AS v
      FROM orders o
     WHERE o.order_status IN ('Shipped','Delivered')
       AND NOT EXISTS (SELECT 1 FROM payments p
                        WHERE p.order_id = o.order_id
                          AND p.payment_status = 'Completed')`
  return Number(rows[0]?.v ?? 0)
}

export async function getProductSalesStats(productId: number) {
  const rows = await prisma.$queryRaw<{ units: unknown; revenue: unknown; orders: unknown; avg: unknown }[]>`
    SELECT COALESCE(SUM(oi.quantity), 0)   AS units,
           COALESCE(SUM(oi.total_price), 0) AS revenue,
           COUNT(DISTINCT o.order_id)       AS orders,
           COALESCE(AVG(oi.price_per_unit), 0) AS avg
      FROM order_items oi
      JOIN orders o   ON o.order_id = oi.order_id
      JOIN payments p ON p.order_id = o.order_id AND p.payment_status = 'Completed'
     WHERE oi.product_id = ${productId}`
  const r = rows[0]
  return { units: num(r?.units), revenue: num(r?.revenue), orders: num(r?.orders), avg: num(r?.avg) }
}
