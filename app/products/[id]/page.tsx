import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, BarChart3, Package, TrendingUp } from "lucide-react"

import { Button } from "@/components/ui/button"
import { getProductById, getProductSalesStats, getRelatedProducts } from "@/lib/db"

export const dynamic = "force-dynamic"

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: idParam } = await params
  const id = Number(idParam)
  const product = await getProductById(id)
  if (!product) notFound()

  const [salesStats, relatedProducts] = await Promise.all([
    getProductSalesStats(id),
    product.category_id ? getRelatedProducts(id, product.category_id) : Promise.resolve([]),
  ])

  return (
    <div className="flex flex-col min-h-screen">
      <div className="container px-4 py-10">
        <Link href="/products" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
          <ArrowLeft className="h-4 w-4" />
          Back to store
        </Link>

        <div className="grid gap-10 lg:grid-cols-2">
          <div className="flex items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 via-accent/10 to-muted p-10 min-h-[320px]">
            <span className="text-6xl">🛍️</span>
          </div>

          <div>
            <p className="text-sm uppercase tracking-wider text-primary">{product.category?.category_name}</p>
            <h1 className="mt-1 text-3xl font-bold md:text-4xl">{product.product_name}</h1>
            <p className="mt-4 text-3xl font-extrabold gradient-text">₹{product.price.toFixed(2)}</p>
            <p className="mt-1 text-sm text-muted-foreground">Cost of goods sold: ₹{product.cogs.toFixed(2)}</p>

            <div className="mt-6 grid grid-cols-3 gap-3">
              <div className="glass rounded-xl p-4 text-center">
                <BarChart3 className="mx-auto mb-1 h-4 w-4 text-primary" />
                <p className="text-lg font-bold">{salesStats.units}</p>
                <p className="text-xs text-muted-foreground">Units sold</p>
              </div>
              <div className="glass rounded-xl p-4 text-center">
                <TrendingUp className="mx-auto mb-1 h-4 w-4 text-primary" />
                <p className="text-lg font-bold">₹{salesStats.revenue.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">Revenue</p>
              </div>
              <div className="glass rounded-xl p-4 text-center">
                <Package className="mx-auto mb-1 h-4 w-4 text-primary" />
                <p className="text-lg font-bold">{product.total_stock ?? 0}</p>
                <p className="text-xs text-muted-foreground">In stock</p>
              </div>
            </div>

            <div className="mt-6 space-y-2 rounded-xl glass p-5 text-sm">
              <p><span className="text-muted-foreground">Product ID:</span> {product.product_id}</p>
              <p><span className="text-muted-foreground">Category:</span> {product.category?.category_name}</p>
              <p><span className="text-muted-foreground">Status:</span>{" "}
                {product.total_stock && product.total_stock > 0 ? (
                  <span className="text-emerald-400">In stock ({product.total_stock} units across warehouses)</span>
                ) : (
                  <span className="text-destructive">Out of stock</span>
                )}
              </p>
            </div>
          </div>
        </div>

        {relatedProducts.length > 0 && (
          <div className="mt-16">
            <h2 className="mb-6 text-2xl font-bold">Related products</h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {relatedProducts.map((p) => (
                <Link key={p.product_id} href={`/products/${p.product_id}`}>
                  <div className="glass card-hover rounded-xl overflow-hidden h-full">
                    <div className="flex h-28 items-center justify-center bg-gradient-to-br from-primary/15 to-muted">
                      <span className="text-2xl">🛍️</span>
                    </div>
                    <div className="p-4">
                      <h3 className="line-clamp-1 font-medium text-sm">{p.product_name}</h3>
                      <p className="mt-1 font-bold text-sm gradient-text">₹{p.price.toFixed(2)}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
