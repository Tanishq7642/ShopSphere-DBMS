import Link from "next/link"
import {
  AlertTriangle,
  ArrowRight,
  IndianRupee,
  Package,
  ShoppingBag,
  ShoppingCart,
  Users,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CategoryDonut, RevenueTrendChart, StatusBar, TopProductsBar } from "@/components/dashboard-charts"
import {
  getCategorySales,
  getKpis,
  getOrderStatusBreakdown,
  getRecentOrders,
  getRevenueDaily,
  getTopProducts,
  getUnpaidShippedCount,
} from "@/lib/db"

export const dynamic = "force-dynamic"

export default async function AdminDashboard() {
  const [kpis, revenue, topProducts, categorySales, statusBreakdown, recentOrders, unpaidShipped] =
    await Promise.all([
      getKpis(),
      getRevenueDaily(),
      getTopProducts(7),
      getCategorySales(),
      getOrderStatusBreakdown(),
      getRecentOrders(8),
      getUnpaidShippedCount(),
    ])

  const cards = [
    { label: "Total Revenue", value: `₹${Math.round(kpis.total_revenue).toLocaleString()}`, icon: IndianRupee, accent: "text-emerald-400" },
    { label: "Total Orders", value: kpis.total_orders.toLocaleString(), icon: ShoppingCart, accent: "text-sky-400" },
    { label: "Customers", value: kpis.total_customers.toLocaleString(), icon: Users, accent: "text-violet-400" },
    { label: "Products", value: kpis.total_products.toLocaleString(), icon: Package, accent: "text-amber-400" },
  ]

  const statusBadge: Record<string, string> = {
    Pending: "bg-amber-500/15 text-amber-400",
    Shipped: "bg-sky-500/15 text-sky-400",
    Delivered: "bg-emerald-500/15 text-emerald-400",
    Cancelled: "bg-rose-500/15 text-rose-400",
  }

  return (
    <div className="p-6 md:p-8 space-y-8">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Analytics Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Live metrics computed from PostgreSQL — views, window functions & aggregations
          </p>
        </div>
        <Link href="/admin/database" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
          Open SQL Playground <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, icon: Icon, accent }) => (
          <Card key={label} className="card-hover">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
              <Icon className={`h-5 w-5 ${accent}`} />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-xs text-muted-foreground mt-1">
                avg order: ₹{kpis.avg_order_value.toFixed(2)} · {kpis.units_sold.toLocaleString()} units
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* charts row 1 */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Revenue trend</CardTitle>
            <CardDescription>Daily completed-payment revenue · from v_revenue_daily</CardDescription>
          </CardHeader>
          <CardContent>
            <RevenueTrendChart data={revenue} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Order status</CardTitle>
            <CardDescription>Current pipeline mix</CardDescription>
          </CardHeader>
          <CardContent>
            <StatusBar data={statusBreakdown} />
          </CardContent>
        </Card>
      </div>

      {/* charts row 2 */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Top products</CardTitle>
            <CardDescription>By completed revenue · from v_top_products</CardDescription>
          </CardHeader>
          <CardContent>
            <TopProductsBar data={topProducts} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Category share</CardTitle>
            <CardDescription>Revenue by category · from v_category_sales</CardDescription>
          </CardHeader>
          <CardContent>
            <CategoryDonut data={categorySales} />
          </CardContent>
        </Card>
      </div>

      {/* recent orders */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent orders</CardTitle>
            <CardDescription>Latest activity across the pipeline</CardDescription>
          </div>
          <Link href="/admin/orders" className="text-sm text-primary hover:underline inline-flex items-center gap-1">
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="pb-3 pr-4 font-medium">Order</th>
                  <th className="pb-3 pr-4 font-medium">Date</th>
                  <th className="pb-3 pr-4 font-medium">Customer</th>
                  <th className="pb-3 pr-4 font-medium">Product</th>
                  <th className="pb-3 pr-4 font-medium">Total</th>
                  <th className="pb-3 pr-4 font-medium">Status</th>
                  <th className="pb-3 font-medium">Payment</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((o) => (
                  <tr key={o.order_id} className="border-b border-border/40 last:border-0">
                    <td className="py-3 pr-4 font-mono text-xs">#{o.order_id}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{o.order_date}</td>
                    <td className="py-3 pr-4">{o.customer_name}</td>
                    <td className="py-3 pr-4 line-clamp-1 max-w-[180px]">{o.product_name}</td>
                    <td className="py-3 pr-4 font-medium">₹{o.total_price.toFixed(2)}</td>
                    <td className="py-3 pr-4">
                      <Badge className={statusBadge[o.order_status] || ""}>{o.order_status}</Badge>
                    </td>
                    <td className="py-3">
                      <span className={o.payment_status === "Completed" ? "text-emerald-400" : "text-amber-400"}>
                        {o.payment_status || "—"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* alerts strip */}
      <div className="flex items-center gap-3 rounded-xl border border-amber-500/25 bg-amber-500/10 p-4 text-sm text-amber-300">
        <AlertTriangle className="h-5 w-5 shrink-0" />
        <p>
          <span className="font-semibold">Data-quality watch:</span> {kpis.failed_payments.toLocaleString()} failed
          payments and {unpaidShipped.toLocaleString()} shipped orders without a completed payment in the dataset — run{" "}
          <span className="font-mono text-xs">scripts/verify_db.py</span> for the full audit report.
        </p>
      </div>
    </div>
  )
}
