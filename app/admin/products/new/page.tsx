import ProductForm from "@/components/product-form"
import { getCategories } from "@/lib/db"
import { createProduct } from "@/lib/actions"

export const dynamic = "force-dynamic"

export default async function NewProductPage() {
  const categories = await getCategories()
  return (
    <div className="p-6 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">Add Product</h1>
        <p className="text-muted-foreground text-sm mt-1">Inserted via the add_product() stored function</p>
      </div>
      <ProductForm action={createProduct} categories={categories} />
    </div>
  )
}
