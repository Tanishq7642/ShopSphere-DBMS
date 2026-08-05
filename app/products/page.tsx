import Link from "next/link"
import { Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getCategories, getProducts } from "@/lib/db"

export const dynamic = "force-dynamic"

const PAGE_SIZE = 12

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; sort?: string; page?: string }>
}) {
  const sp = await searchParams
  const q = sp.q || ""
  const category = sp.category ? Number(sp.category) : undefined
  const sort = (sp.sort as "name" | "price_asc" | "price_desc" | undefined) || "name"
  const page = Math.max(1, Number(sp.page) || 1)

  const [categories, { products, total }] = await Promise.all([
    getCategories(),
    getProducts({ query: q, categoryId: category, sort, page, pageSize: PAGE_SIZE }),
  ])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const buildHref = (patch: Record<string, string | number | undefined>) => {
    const p = new URLSearchParams()
    if (q) p.set("q", q)
    if (category) p.set("category", String(category))
    if (sort !== "name") p.set("sort", sort)
    if (patch.q !== undefined) (patch.q ? p.set("q", String(patch.q)) : p.delete("q"))
    if (patch.category !== undefined) (patch.category ? p.set("category", String(patch.category)) : p.delete("category"))
    if (patch.sort !== undefined) (patch.sort ? p.set("sort", String(patch.sort)) : p.delete("sort"))
    if (patch.page !== undefined) (Number(patch.page) > 1 ? p.set("page", String(patch.page)) : p.delete("page"))
    const s = p.toString()
    return s ? `/products?${s}` : "/products"
  }

  return (
    <div className="flex flex-col min-h-screen">
      <div className="container px-4 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Store</h1>
          <p className="text-muted-foreground">
            {total.toLocaleString()} products · served from PostgreSQL
          </p>
        </div>

        {/* filters */}
        <div className="glass mb-8 rounded-xl p-4">
          <form method="get" action="/products" className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input name="q" defaultValue={q} placeholder="Search products…" className="pl-9" />
            </div>
            <input type="hidden" name="category" value={category || ""} />
            <input type="hidden" name="sort" value={sort} />
            <Button type="submit">Search</Button>
          </form>

          <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center">
            <div className="flex flex-wrap gap-2">
              <Link href={buildHref({ category: undefined, page: undefined })}>
                <Button size="sm" variant={category ? "outline" : "default"} className={category ? "" : "btn-gradient text-white"}>
                  All
                </Button>
              </Link>
              {categories.map((c) => (
                <Link key={c.category_id} href={buildHref({ category: c.category_id, page: undefined })}>
                  <Button
                    size="sm"
                    variant={category === c.category_id ? "default" : "outline"}
                    className={category === c.category_id ? "btn-gradient text-white" : ""}
                  >
                    {c.category_name}
                  </Button>
                </Link>
              ))}
            </div>

            <div className="md:ml-auto md:w-48">
              <Select
                value={sort}
                onValueChange={(v) => {
                  window.location.href = buildHref({ sort: v, page: undefined })
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name (A–Z)</SelectItem>
                  <SelectItem value="price_asc">Price: low → high</SelectItem>
                  <SelectItem value="price_desc">Price: high → low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* grid */}
        {products.length === 0 ? (
          <div className="glass rounded-xl p-16 text-center">
            <p className="text-2xl">🔍</p>
            <p className="mt-2 font-medium">No products found</p>
            <p className="text-sm text-muted-foreground">Try a different search term or category.</p>
            <Link href="/products" className="mt-4 inline-block">
              <Button variant="outline" size="sm">Clear filters</Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((p) => (
              <Link key={p.product_id} href={`/products/${p.product_id}`}>
                <div className="glass card-hover rounded-xl overflow-hidden h-full">
                  <div className="flex h-36 items-center justify-center bg-gradient-to-br from-primary/15 via-accent/10 to-muted">
                    <span className="text-3xl">🛍️</span>
                  </div>
                  <div className="p-4">
                    <h3 className="line-clamp-1 font-medium">{p.product_name}</h3>
                    <p className="text-xs text-muted-foreground">{p.category?.category_name}</p>
                    <div className="mt-3 flex items-center justify-between">
                      <p className="font-bold gradient-text">₹{p.price.toFixed(2)}</p>
                      {p.total_stock && p.total_stock > 0 ? (
                        <span className="text-xs text-muted-foreground">{p.total_stock} in stock</span>
                      ) : (
                        <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-xs text-destructive">
                          Out of stock
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* pagination */}
        {totalPages > 1 && (
          <div className="mt-10 flex items-center justify-center gap-2">
            <Link href={buildHref({ page: page - 1 })} className={page <= 1 ? "pointer-events-none opacity-40" : ""}>
              <Button variant="outline" size="sm">← Prev</Button>
            </Link>
            <span className="px-4 text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <Link href={buildHref({ page: page + 1 })} className={page >= totalPages ? "pointer-events-none opacity-40" : ""}>
              <Button variant="outline" size="sm">Next →</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
