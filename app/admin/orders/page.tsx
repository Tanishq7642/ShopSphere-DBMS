import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getOrders } from "@/lib/db"

export const dynamic = "force-dynamic"

const statusBadge: Record<string, string> = {
  Pending: "bg-amber-500/15 text-amber-400",
  Shipped: "bg-sky-500/15 text-sky-400",
  Delivered: "bg-emerald-500/15 text-emerald-400",
  Cancelled: "bg-rose-500/15 text-rose-400",
}

export default async function OrdersPage() {
  const orders = await getOrders({ pageSize: 100 })

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">Orders</h1>
        <p className="text-muted-foreground text-sm mt-1">Every order row with its customer, seller, product & payment</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Order ledger</CardTitle>
          <CardDescription>{orders.length} most recent orders</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="pb-3 pr-4 font-medium">Order</th>
                  <th className="pb-3 pr-4 font-medium">Date</th>
                  <th className="pb-3 pr-4 font-medium">Customer</th>
                  <th className="pb-3 pr-4 font-medium">Seller</th>
                  <th className="pb-3 pr-4 font-medium">Product</th>
                  <th className="pb-3 pr-4 font-medium">Total</th>
                  <th className="pb-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.order_id} className="border-b border-border/40 last:border-0">
                    <td className="py-3 pr-4 font-mono text-xs">#{o.order_id}</td>
                    <td className="py-3 pr-4 text-muted-foreground whitespace-nowrap">
                      {o.order_date instanceof Date ? o.order_date.toISOString().slice(0, 10) : String(o.order_date)}
                    </td>
                    <td className="py-3 pr-4 whitespace-nowrap">{o.customer_name}</td>
                    <td className="py-3 pr-4 whitespace-nowrap">{o.seller_name}</td>
                    <td className="py-3 pr-4 line-clamp-1 max-w-[200px]">{o.product_name}</td>
                    <td className="py-3 pr-4 font-medium">₹{o.total_price?.toFixed(2)}</td>
                    <td className="py-3">
                      <Badge className={statusBadge[o.order_status] || ""}>{o.order_status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
