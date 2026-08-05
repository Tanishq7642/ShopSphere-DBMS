import { notFound } from "next/navigation"
import ProductForm from "@/components/product-form"
import { getCategories, getProductById } from "@/lib/db"
import { updateProduct } from "@/lib/actions"

export const dynamic = "force-dynamic"

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: idParam } = await params
  const id = Number(idParam)
  const [product, categories] = await Promise.all([getProductById(id), getCategories()])
  if (!product) notFound()

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">Edit Product</h1>
        <p className="text-muted-foreground text-sm mt-1">#{product.product_id} · {product.product_name}</p>
      </div>
      <ProductForm action={updateProduct} product={product} categories={categories} />
    </div>
  )
}
