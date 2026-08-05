"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Category, Product } from "@/lib/types"

interface ProductFormProps {
  action: (formData: FormData) => Promise<{ success: boolean; message?: string; product_id?: number }>
  product?: Product
  categories: Category[]
}

export default function ProductForm({ action, product, categories }: ProductFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const formData = new FormData(event.currentTarget)
      const result = await action(formData)
      if (result.success) {
        router.push("/admin/products")
        router.refresh()
      } else {
        setError(result.message || "Something went wrong.")
      }
    } catch (err) {
      setError("An unexpected error occurred.")
      console.error(err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-xl space-y-6">
      <Link href="/admin/products" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
        <ArrowLeft className="h-4 w-4" />
        Back to products
      </Link>

      {error && <div className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">{error}</div>}

      <form onSubmit={handleSubmit} className="glass space-y-5 rounded-xl p-6">
        <input type="hidden" name="product_id" value={product?.product_id || ""} />

        <div className="space-y-2">
          <Label htmlFor="product_name">Product name</Label>
          <Input id="product_name" name="product_name" required defaultValue={product?.product_name || ""} placeholder="Wireless Mouse" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="price">Price (₹)</Label>
            <Input id="price" name="price" type="number" step="0.01" min="0" required defaultValue={product?.price || ""} placeholder="499.00" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cogs">Cost of goods (₹)</Label>
            <Input id="cogs" name="cogs" type="number" step="0.01" min="0" required defaultValue={product?.cogs || ""} placeholder="250.00" />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Category</Label>
          <Select name="category_id" defaultValue={product?.category_id ? String(product.category_id) : ""}>
            <SelectTrigger>
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c.category_id} value={String(c.category_id)}>
                  {c.category_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Link href="/admin/products">
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
          <Button type="submit" disabled={isSubmitting} className="btn-gradient text-white">
            {isSubmitting ? "Saving…" : product ? "Update Product" : "Create Product"}
          </Button>
        </div>
      </form>
    </div>
  )
}
