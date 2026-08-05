import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getSellerPerformance, prisma } from "@/lib/db"

export const dynamic = "force-dynamic"

const num = (v: unknown) => (v == null ? 0 : Number(v))

export default async function AnalyticsPage() {
  const [sellers, paymentSummary, ltvQuartiles] = await Promise.all([
    getSellerPerformance(),
    prisma.$queryRaw<{ payment_mode: string; completed: unknown; pending: unknown; failed: unknown; volume: unknown }[]>`
      SELECT payment_mode, completed, pending, failed, volume FROM v_payment_summary ORDER BY completed DESC`,
    prisma.$queryRaw<{ quartile: unknown; customers: unknown; total_value: unknown }[]>`
      SELECT quartile, COUNT(*) AS customers, SUM(lifetime_value) AS total_value
      FROM (SELECT lifetime_value, NTILE(4) OVER (ORDER BY lifetime_value) AS quartile
            FROM v_customer_lifetime_value) t
      GROUP BY quartile ORDER BY quartile`,
  ])

  const totalPaymentVolume = paymentSummary.reduce((acc, p) => acc + num(p.volume), 0)

  return (
    <div className="p-6 md:p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">Deep Analytics</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Seller performance, payment mix & customer-value segmentation — all window-function SQL
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Seller performance</CardTitle>
            <CardDescription>DENSE_RANK by revenue · from v_seller_performance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="pb-3 pr-4 font-medium">#</th>
                    <th className="pb-3 pr-4 font-medium">Seller</th>
                    <th className="pb-3 pr-4 font-medium">Orders</th>
                    <th className="pb-3 pr-4 font-medium">Revenue</th>
                    <th className="pb-3 font-medium">AOV</th>
                  </tr>
                </thead>
                <tbody>
                  {sellers.map((s) => (
                    <tr key={s.seller_name} className="border-b border-border/40 last:border-0">
                      <td className="py-3 pr-4 text-muted-foreground">{s.revenue_rank}</td>
                      <td className="py-3 pr-4 line-clamp-1 max-w-[180px]">{s.seller_name}</td>
                      <td className="py-3 pr-4">{s.orders}</td>
                      <td className="py-3 pr-4 font-medium">₹{s.revenue.toFixed(2)}</td>
                      <td className="py-3">₹{s.avg_order_value.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Payment mix</CardTitle>
              <CardDescription>Pivot via FILTER · from v_payment_summary</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {paymentSummary.map((p) => {
                  const share = totalPaymentVolume ? (num(p.volume) / totalPaymentVolume) * 100 : 0
                  return (
                    <div key={p.payment_mode}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="font-medium">{p.payment_mode}</span>
                        <span className="text-muted-foreground">
                          {num(p.completed)}✓ · {num(p.pending)}… · {num(p.failed)}✗
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-secondary">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-sky-500"
                          style={{ width: `${Math.max(share, 2)}%` }}
                        />
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        ₹{num(p.volume).toFixed(2)} · {share.toFixed(1)}% of volume
                      </p>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Customer value quartiles</CardTitle>
              <CardDescription>NTILE(4) over lifetime value</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-3">
                {ltvQuartiles.map((q) => (
                  <div key={Number(q.quartile)} className="glass rounded-xl p-4 text-center">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">Q{Number(q.quartile)}</p>
                    <p className="mt-1 text-xl font-bold">{Number(q.customers)}</p>
                    <p className="text-xs text-muted-foreground">₹{num(q.total_value).toFixed(0)}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
