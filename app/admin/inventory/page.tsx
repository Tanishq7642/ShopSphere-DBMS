import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getInventory } from "@/lib/db"

export const dynamic = "force-dynamic"

const levelBadge: Record<string, string> = {
  "OUT OF STOCK": "bg-rose-500/15 text-rose-400",
  "CRITICAL - reorder now": "bg-amber-500/15 text-amber-400",
  "LOW - plan reorder": "bg-sky-500/15 text-sky-400",
  HEALTHY: "bg-emerald-500/15 text-emerald-400",
}

export default async function InventoryPage() {
  const inventory = await getInventory()

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">Inventory</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Stock levels per warehouse · classified by the CASE-driven v_inventory_status view
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Warehouse stock</CardTitle>
          <CardDescription>Lowest-stock items first (top 200)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="pb-3 pr-4 font-medium">Product</th>
                  <th className="pb-3 pr-4 font-medium">Category</th>
                  <th className="pb-3 pr-4 font-medium">Stock</th>
                  <th className="pb-3 pr-4 font-medium">Warehouse</th>
                  <th className="pb-3 pr-4 font-medium">Last restock</th>
                  <th className="pb-3 font-medium">Level</th>
                </tr>
              </thead>
              <tbody>
                {inventory.map((i) => (
                  <tr key={i.inventory_id} className="border-b border-border/40 last:border-0">
                    <td className="py-3 pr-4 line-clamp-1 max-w-[200px]">{i.product_name}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{i.category_name}</td>
                    <td className="py-3 pr-4 font-mono">{i.stock}</td>
                    <td className="py-3 pr-4 text-muted-foreground">WH-{i.warehouse_id}</td>
                    <td className="py-3 pr-4 text-muted-foreground whitespace-nowrap">
                      {i.last_stock_date instanceof Date ? i.last_stock_date.toISOString().slice(0, 10) : String(i.last_stock_date)}
                    </td>
                    <td className="py-3">
                      <Badge className={levelBadge[i.stock_level || ""] || ""}>{i.stock_level}</Badge>
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
