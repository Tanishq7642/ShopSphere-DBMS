import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getCustomers } from "@/lib/db"

export const dynamic = "force-dynamic"

export default async function CustomersPage() {
  const customers = await getCustomers({ pageSize: 100 })

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">Customers</h1>
        <p className="text-muted-foreground text-sm mt-1">Customer master data with live order counts</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Customer directory</CardTitle>
          <CardDescription>First 100 customers</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="pb-3 pr-4 font-medium">ID</th>
                  <th className="pb-3 pr-4 font-medium">Name</th>
                  <th className="pb-3 pr-4 font-medium">State</th>
                  <th className="pb-3 pr-4 font-medium">Address</th>
                  <th className="pb-3 font-medium">Orders</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.customer_id} className="border-b border-border/40 last:border-0">
                    <td className="py-3 pr-4 font-mono text-xs">{c.customer_id}</td>
                    <td className="py-3 pr-4 whitespace-nowrap">
                      {c.first_name} {c.last_name}
                    </td>
                    <td className="py-3 pr-4">{c.state}</td>
                    <td className="py-3 pr-4 line-clamp-1 max-w-[220px] text-muted-foreground">{c.address}</td>
                    <td className="py-3">
                      <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-xs text-primary">{c.order_count}</span>
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
