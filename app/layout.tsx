import type React from "react"
import "@/app/globals.css"
import { Inter } from "next/font/google"
import type { Metadata } from "next"
import Link from "next/link"
import { Database, LayoutDashboard, ShoppingBag, TerminalSquare } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ThemeProvider } from "@/components/theme-provider"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "ShopSphere · E-Commerce DBMS with PostgreSQL",
  description:
    "A production-grade e-commerce database management system: 9 normalized tables, 800-record dataset, 30+ stored functions & procedures, trigger-based audit trails, and a full analytics + SQL playground.",
}

const NAV_LINKS = [
  { href: "/", label: "Home", icon: ShoppingBag },
  { href: "/products", label: "Store", icon: ShoppingBag },
  { href: "/admin", label: "Analytics", icon: LayoutDashboard },
  { href: "/admin/database", label: "SQL Playground", icon: TerminalSquare },
]

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
          <div className="relative flex min-h-screen flex-col">
            <header className="sticky top-0 z-50 w-full glass">
              <div className="container flex h-16 items-center gap-6">
                <Link href="/" className="flex items-center gap-2 font-bold text-lg">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg btn-gradient text-white">
                    <Database className="h-4 w-4" />
                  </span>
                  <span className="gradient-text">ShopSphere</span>
                </Link>

                <nav className="ml-auto hidden items-center gap-1 md:flex">
                  {NAV_LINKS.map(({ href, label, icon: Icon }) => (
                    <Link key={href} href={href}>
                      <Button
                        variant="ghost"
                        className="text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                      >
                        <Icon className="mr-2 h-4 w-4" />
                        {label}
                      </Button>
                    </Link>
                  ))}
                </nav>

                <Link href="/admin" className="ml-auto md:ml-0">
                  <Button size="sm" className="btn-gradient text-white">
                    Admin Dashboard
                  </Button>
                </Link>
              </div>
            </header>

            <main className="flex-1">{children}</main>

            <footer className="border-t border-border/60 py-8">
              <div className="container flex flex-col items-center justify-between gap-4 md:flex-row">
                <div>
                  <p className="text-sm font-semibold">
                    <span className="gradient-text">ShopSphere-DBMS</span> · E-Commerce Database Management System
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    PostgreSQL 17 · Prisma ORM · Next.js 15 · 800-record dataset · 30+ stored routines
                  </p>
                </div>
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <Link href="/admin/database" className="hover:text-foreground transition-colors">
                    SQL Playground
                  </Link>
                  <Link href="/admin/analytics" className="hover:text-foreground transition-colors">
                    Analytics
                  </Link>
                  <a
                    href="https://www.postgresql.org/docs/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-foreground transition-colors"
                  >
                    PostgreSQL Docs
                  </a>
                </div>
              </div>
            </footer>
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}
