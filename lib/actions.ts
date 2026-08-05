// ============================================================================
// ShopSphere-DBMS · lib/actions.ts
// Server actions: product management (admin) + the guarded raw-SQL runner
// used by the SQL playground.
// ============================================================================
"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "./db"

// ---------------------------------------------------------------------------
// PRODUCT MANAGEMENT (admin)
// ---------------------------------------------------------------------------

export async function createProduct(formData: FormData) {
  try {
    const product_name = formData.get("product_name") as string
    const price = Number.parseFloat(formData.get("price") as string)
    const cogs = Number.parseFloat(formData.get("cogs") as string)
    const category_id = Number.parseInt(formData.get("category_id") as string)

    if (!product_name || Number.isNaN(price) || Number.isNaN(cogs) || Number.isNaN(category_id)) {
      return { success: false, message: "Please fill in all required fields." }
    }

    // Next product id is delegated to the database function add_product()
    const rows = await prisma.$queryRaw<{ next_id: number }[]>`
      SELECT COALESCE(MAX(product_id), 0) + 1 AS next_id FROM products`
    const next_id = rows[0]?.next_id ?? 0

    await prisma.$queryRaw`
      SELECT add_product(${product_name}::varchar, ${price}::numeric, ${cogs}::numeric, ${category_id}::int)`

    revalidatePath("/admin/products")
    revalidatePath("/products")
    return { success: true, product_id: next_id }
  } catch (error: any) {
    console.error("Error creating product:", error)
    return { success: false, message: error?.message || "Failed to create product." }
  }
}

export async function updateProduct(formData: FormData) {
  try {
    const product_id = Number.parseInt(formData.get("product_id") as string)
    const product_name = formData.get("product_name") as string
    const price = Number.parseFloat(formData.get("price") as string)
    const cogs = Number.parseFloat(formData.get("cogs") as string)
    const category_id = Number.parseInt(formData.get("category_id") as string)

    await prisma.products.update({
      where: { product_id },
      data: { product_name, price, cogs, category_id },
    })

    revalidatePath("/admin/products")
    revalidatePath(`/products/${product_id}`)
    revalidatePath("/products")
    return { success: true }
  } catch (error: any) {
    console.error("Error updating product:", error)
    return { success: false, message: error?.message || "Failed to update product." }
  }
}

export async function deleteProduct(productId: number) {
  try {
    await prisma.products.delete({ where: { product_id: productId } })
    revalidatePath("/admin/products")
    revalidatePath("/products")
    return { success: true }
  } catch (error: any) {
    console.error("Error deleting product:", error)
    return { success: false, message: error?.message || "Failed to delete product." }
  }
}

// ---------------------------------------------------------------------------
// SQL PLAYGROUND · executeQuery
// ---------------------------------------------------------------------------
// The playground intentionally runs raw SQL (that is the point of a DBMS
// project). Guards: only read-only statements are allowed in production, and
// every query gets a hard timeout so nothing hangs the UI.
// ---------------------------------------------------------------------------

const READ_ONLY_PREFIX = /^\s*(select|with|explain|show)/i
const DESTRUCTIVE_KEYWORDS =
  /\b(drop|truncate|delete|update|insert|alter|create|grant|revoke|copy|vacuum|set\s+role|call|do\s+\$\$)/i

/** Strip comments AND single-quoted string literals so the guard never
 *  false-positives on values like WHERE action = 'UPDATE'. */
function sanitizeForGuard(sql: string): string {
  return sql
    .replace(/--[^\n]*/g, " ")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/'([^']|'')*'/g, " '' ")
}

export async function executeQuery(query: string) {
  try {
    if (!query.trim()) return { error: "Please enter a SQL query." }

    // Always block destructive statements (this is a demo playground)
    if (DESTRUCTIVE_KEYWORDS.test(sanitizeForGuard(query))) {
      return {
        error:
          "Only read-only queries are allowed in the playground (SELECT / WITH / EXPLAIN). " +
          "Use the Python CLI (scripts/db_cli.py) to run data modifications.",
      }
    }
    if (!READ_ONLY_PREFIX.test(query.trim())) {
      return {
        error: "Only read-only queries are allowed in the playground (SELECT / WITH / EXPLAIN).",
      }
    }

    // Enforce a 10-second ceiling so runaway queries can't hang the browser
    const result = await Promise.race([
      prisma.$queryRawUnsafe(query),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Query timed out (10s limit).")), 10_000)),
    ])

    return { data: Array.isArray(result) ? result : [result] }
  } catch (error: any) {
    console.error("Error executing query:", error)
    return { error: error?.message || "An error occurred while executing the query." }
  }
}
