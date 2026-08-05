/**
 * ShopSphere-DBMS · demo script
 * Prints a live snapshot of the database - run with:
 *
 *   npx tsx index.ts          (or)   node -r tsx index.ts
 */
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  const [products, customers, sellers, orders, orderItems, payments, shippings, categories, revenue, failed] =
    await Promise.all([
      prisma.products.count(),
      prisma.customers.count(),
      prisma.sellers.count(),
      prisma.orders.count(),
      prisma.order_items.count(),
      prisma.payments.count(),
      prisma.shippings.count(),
      prisma.category.count(),
      prisma.$queryRaw<{ v: bigint | number }[]>`
        SELECT COALESCE(SUM(oi.total_price), 0) AS v
        FROM order_items oi
        JOIN payments p ON p.order_id = oi.order_id AND p.payment_status = 'Completed'`,
      prisma.payments.count({ where: { payment_status: "Failed" } }),
    ])

  console.log("╔═══════════════════════════════════════════════════╗")
  console.log("║        ShopSphere-DBMS · database snapshot         ║")
  console.log("╚═══════════════════════════════════════════════════╝")
  console.log(`  Categories : ${categories}`)
  console.log(`  Products   : ${products}`)
  console.log(`  Customers  : ${customers}`)
  console.log(`  Sellers    : ${sellers}`)
  console.log(`  Orders     : ${orders}`)
  console.log(`  Order lines: ${orderItems}`)
  console.log(`  Payments   : ${payments}  (${failed} failed)`)
  console.log(`  Shipments  : ${shippings}`)
  console.log(`  Revenue    : ₹${Number(revenue[0]?.v ?? 0).toFixed(2)}`)
  console.log("  ➜ Try:  python scripts/db_cli.py   ·   scripts/verify_db.py")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
