import Link from "next/link"
import { Edit, Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { getProducts } from "@/lib/db"
import { deleteProduct } from "@/lib/actions"

export const dynamic = "force-dynamic"

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const sp = await searchParams
  const q = sp.q || ""
  const { products, total } = await getProducts({ query: q, pageSize: 50 })

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Products</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {total.toLocaleString()} products · CRUD via server actions + add_product() function
          </p>
        </div>
        <Link href="/admin/products/new">
          <Button className="btn-gradient text-white">
            <Plus className="mr-2 h-4 w-4" />
            Add Product
          </Button>
        </Link>
      </div>

      <form method="get" action="/admin/products" className="flex max-w-md gap-2">
        <Input name="q" defaultValue={q} placeholder="Search products…" />
        <Button type="submit" variant="outline">Search</Button>
      </form>

      <div className="overflow-x-auto rounded-xl border border-border/60 bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="p-4 font-medium">ID</th>
              <th className="p-4 font-medium">Name</th>
              <th className="p-4 font-medium">Category</th>
              <th className="p-4 font-medium">Price</th>
              <th className="p-4 font-medium">COGS</th>
              <th className="p-4 font-medium">Stock</th>
              <th className="p-4 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.product_id} className="border-b border-border/40 last:border-0 hover:bg-secondary/30 transition-colors">
                <td className="p-4 font-mono text-xs">{p.product_id}</td>
                <td className="p-4 line-clamp-1 max-w-[220px]">{p.product_name}</td>
                <td className="p-4 text-muted-foreground">{p.category?.category_name}</td>
                <td className="p-4 font-medium">₹{p.price.toFixed(2)}</td>
                <td className="p-4 text-muted-foreground">₹{p.cogs.toFixed(2)}</td>
                <td className="p-4">
                  <span className={p.total_stock && p.total_stock > 0 ? "text-emerald-400" : "text-rose-400"}>
                    {p.total_stock ?? 0}
                  </span>
                </td>
                <td className="p-4">
                  <div className="flex justify-end gap-1">
                    <Link href={`/admin/products/${p.product_id}/edit`}>
                      <Button variant="ghost" size="icon" aria-label="Edit">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </Link>
                    <form
                      action={async () => {
                        "use server"
                        await deleteProduct(p.product_id)
                      }}
                    >
                      <Button variant="ghost" size="icon" aria-label="Delete" className="text-rose-400 hover:text-rose-300">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
