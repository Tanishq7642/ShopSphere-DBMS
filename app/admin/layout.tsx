import type React from "react"
import Link from "next/link"
import { BarChart, Boxes, Database, GraduationCap, Home, Package, ShoppingBag, Users } from "lucide-react"

import { Button } from "@/components/ui/button"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="grid min-h-screen w-full md:grid-cols-[240px_1fr]">
      <div className="hidden border-r bg-muted/40 md:block">
        <div className="flex h-full max-h-screen flex-col gap-2">
          <div className="flex h-14 items-center border-b px-4">
            <Link href="/admin" className="flex items-center gap-2 font-semibold">
              <Package className="h-6 w-6" />
              <span className="">Admin Dashboard</span>
            </Link>
          </div>
          <div className="flex-1 overflow-auto py-2">
            <nav className="grid items-start px-2 text-sm font-medium">
              <Link href="/admin">
                <Button variant="ghost" className="w-full justify-start">
                  <Home className="mr-2 h-4 w-4" />
                  Dashboard
                </Button>
              </Link>
              <Link href="/admin/products">
                <Button variant="ghost" className="w-full justify-start">
                  <Package className="mr-2 h-4 w-4" />
                  Products
                </Button>
              </Link>
              <Link href="/admin/orders">
                <Button variant="ghost" className="w-full justify-start">
                  <ShoppingBag className="mr-2 h-4 w-4" />
                  Orders
                </Button>
              </Link>
              <Link href="/admin/customers">
                <Button variant="ghost" className="w-full justify-start">
                  <Users className="mr-2 h-4 w-4" />
                  Customers
                </Button>
              </Link>
              <Link href="/admin/inventory">
                <Button variant="ghost" className="w-full justify-start">
                  <Boxes className="mr-2 h-4 w-4" />
                  Inventory
                </Button>
              </Link>
              <Link href="/admin/analytics">
                <Button variant="ghost" className="w-full justify-start">
                  <BarChart className="mr-2 h-4 w-4" />
                  Analytics
                </Button>
              </Link>
              <Link href="/admin/database">
                <Button variant="ghost" className="w-full justify-start">
                  <Database className="mr-2 h-4 w-4" />
                  Database Query
                </Button>
              </Link>
              <Link href="/admin/quiz">
                <Button variant="ghost" className="w-full justify-start">
                  <GraduationCap className="mr-2 h-4 w-4" />
                  SQL Assessment
                </Button>
              </Link>
            </nav>
          </div>
          <div className="mt-auto p-4">
            <Link href="/">
              <Button variant="outline" className="w-full">
                Back to Store
              </Button>
            </Link>
          </div>
        </div>
      </div>
      <div className="flex flex-col">{children}</div>
    </div>
  )
}

