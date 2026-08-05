import Link from "next/link"
import {
  ArrowRight,
  BarChart3,
  Database,
  Layers,
  LineChart,
  Lock,
  ShieldCheck,
  Sparkles,
  TerminalSquare,
  Zap,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { getCategories, getFeaturedProducts, getKpis } from "@/lib/db"

export const dynamic = "force-dynamic"

const SKILLS = [
  { icon: Layers, title: "Normalized Schema", desc: "9 entities in 3NF with PK/FK/UNIQUE/CHECK constraints, enums & tuned indexes" },
  { icon: Zap, title: "30+ Stored Routines", desc: "Functions & procedures with explicit transactions - checkout touches 5 tables atomically" },
  { icon: ShieldCheck, title: "Trigger-Driven Audit", desc: "Every order mutation is logged; stock can never go negative; payments auto-advance orders" },
  { icon: BarChart3, title: "Analytics Layer", desc: "Views, window functions, CTEs, ROLLUP/CUBE, pivots & full-text search on 800 real records" },
]

export default async function Home() {
  const [kpis, categories, featured] = await Promise.all([getKpis(), getCategories(), getFeaturedProducts(8)])

  const stats = [
    { label: "Products", value: kpis.total_products },
    { label: "Orders", value: kpis.total_orders },
    { label: "Customers", value: kpis.total_customers },
    { label: "Revenue (₹)", value: kpis.total_revenue },
  ]

  return (
    <div className="flex flex-col min-h-screen">
      {/* ------------------------------------------------ HERO ----------------- */}
      <section className="relative overflow-hidden">
        <div className="container px-4 pt-20 pb-16 md:pt-28 md:pb-24">
          <div className="mx-auto max-w-3xl text-center">
            <div className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary mb-6">
              <Sparkles className="h-3.5 w-3.5" />
              PostgreSQL · Prisma · Next.js 15 · 800-record real dataset
            </div>
            <h1 className="animate-fade-up delay-100 text-4xl font-extrabold tracking-tight sm:text-6xl">
              ShopSphere <span className="gradient-text">DBMS</span>
            </h1>
            <p className="animate-fade-up delay-200 mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
              A complete e-commerce database management system where every SQL skill you need to prove -
              normalization, constraints, transactions, triggers, views, window functions and analytics -
              is implemented, documented and runnable in one click.
            </p>
            <div className="animate-fade-up delay-300 mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/products">
                <Button size="lg" className="btn-gradient text-white w-full sm:w-auto">
                  Browse the Store
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/admin/database">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  <TerminalSquare className="mr-2 h-4 w-4" />
                  Open SQL Playground
                </Button>
              </Link>
            </div>
          </div>

          {/* live KPI counters */}
          <div className="animate-fade-up delay-400 mx-auto mt-14 grid max-w-4xl grid-cols-2 gap-4 lg:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="glass card-hover rounded-xl p-5 text-center">
                <p className="text-2xl font-bold gradient-text md:text-3xl">
                  {s.label === "Revenue (₹)"
                    ? `₹${Math.round(s.value).toLocaleString()}`
                    : s.value.toLocaleString()}
                </p>
                <p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------ SKILLS ---------------- */}
      <section className="py-16">
        <div className="container px-4">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-bold">Database engineering, end to end</h2>
            <p className="mt-2 text-muted-foreground">
              Every layer of a serious DBMS project - designed, implemented, verified.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {SKILLS.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="glass card-hover rounded-xl p-6">
                <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-lg btn-gradient text-white">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold">{title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------ CATEGORIES ------------ */}
      <section className="py-16">
        <div className="container px-4">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <h2 className="text-3xl font-bold">Browse by category</h2>
              <p className="mt-2 text-muted-foreground">10 categories · live from the category table</p>
            </div>
            <Link href="/products" className="hidden text-sm text-primary hover:underline sm:block">
              View all products →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {categories.map((c, i) => (
              <Link key={c.category_id} href={`/products?category=${c.category_id}`}>
                <div className="glass card-hover rounded-xl p-5 text-center animate-fade-up" style={{ animationDelay: `${i * 40}ms` }}>
                  <p className="font-medium">{c.category_name}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------ FEATURED -------------- */}
      <section className="py-16">
        <div className="container px-4">
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-bold">Top sellers</h2>
            <p className="mt-2 text-muted-foreground">
              Ranked by completed revenue - a window-function query under the hood
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((p) => (
              <Link key={p.product_id} href={`/products/${p.product_id}`}>
                <div className="glass card-hover rounded-xl p-5">
                  <div className="mb-3 flex h-32 items-center justify-center rounded-lg bg-gradient-to-br from-primary/15 via-accent/10 to-muted">
                    <span className="text-3xl">🛍️</span>
                  </div>
                  <h3 className="line-clamp-1 font-medium">{p.product_name}</h3>
                  <p className="text-xs text-muted-foreground">{p.category?.category_name}</p>
                  <p className="mt-2 font-bold gradient-text">₹{p.price.toFixed(2)}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------ CTA ------------------- */}
      <section className="py-20">
        <div className="container px-4">
          <div className="glass relative overflow-hidden rounded-2xl p-10 text-center md:p-16">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-accent/10 to-transparent" />
            <div className="relative">
              <Lock className="mx-auto mb-4 h-10 w-10 text-primary" />
              <h2 className="text-3xl font-bold md:text-4xl">
                Business rules live <span className="gradient-text">inside the database</span>
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
                Stock can't go negative. Payments auto-advance orders. Every mutation is audited. The Python CLI and
                the web app are just clients - try the transaction pipeline yourself.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link href="/admin">
                  <Button size="lg" className="btn-gradient text-white">
                    <BarChart3 className="mr-2 h-4 w-4" />
                    Analytics Dashboard
                  </Button>
                </Link>
                <Link href="/admin/database">
                  <Button size="lg" variant="outline">
                    <LineChart className="mr-2 h-4 w-4" />
                    Run a Query
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
