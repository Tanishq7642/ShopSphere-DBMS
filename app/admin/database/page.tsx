"use client"

import { useState } from "react"
import { BookOpen, Clock, Database, Play, RotateCcw, Save, Sparkles, TerminalSquare } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { queryLibrary, type LibraryQuery } from "@/lib/query-library"
import QueryResultTable from "@/components/query-result-table"
import SavedQueriesList from "@/components/saved-queries-list"

const DEFAULT_QUERY = `-- Welcome to the ShopSphere SQL Playground 👋
-- Pick a query from the library on the left, or write your own.
--
-- Example: every order with its customer, product & seller
SELECT o.order_id, o.order_date, o.order_status,
       c.first_name || ' ' || c.last_name AS customer,
       pr.product_name, s.seller_name
FROM orders o
JOIN customers c  ON c.customer_id = o.customer_id
JOIN products pr  ON pr.product_id = o.product_id
JOIN sellers s    ON s.seller_id  = o.seller_id
ORDER BY o.order_date DESC
LIMIT 10;`

export default function DatabaseQueryPage() {
  const [query, setQuery] = useState(DEFAULT_QUERY)
  const [results, setResults] = useState<any[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [elapsed, setElapsed] = useState<number | null>(null)

  const grouped = queryLibrary.reduce<Record<string, LibraryQuery[]>>((acc, q) => {
    ;(acc[q.category] ||= []).push(q)
    return acc
  }, {})

  async function handleExecute() {
    if (!query.trim()) {
      setError("Please enter a SQL query.")
      return
    }
    setIsLoading(true)
    setError(null)
    setElapsed(null)
    const start = performance.now()

    try {
      const res = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      })
      const data = await res.json()
      setElapsed(Math.round(performance.now() - start))

      if (!res.ok || data.error) {
        setError(data.error || "Query failed.")
        setResults(null)
      } else {
        setResults(data.data)
      }
    } catch (err) {
      setError("An unexpected error occurred.")
      setResults(null)
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  function loadFromLibrary(q: LibraryQuery) {
    setQuery(q.sql)
    setError(null)
    setResults(null)
  }

  return (
    <div className="flex h-full min-h-[calc(100vh-4rem)] gap-4 p-4 md:p-6">
      {/* sidebar */}
      <aside className="hidden w-80 shrink-0 lg:block">
        <Card className="flex h-full flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-base">
              <BookOpen className="mr-2 h-4 w-4 text-primary" />
              Query Library
            </CardTitle>
            <CardDescription>40+ documented queries · every SQL skill</CardDescription>
          </CardHeader>
          <ScrollArea className="flex-1">
            <CardContent>
              <div className="space-y-4">
                {Object.entries(grouped).map(([category, queries]) => (
                  <div key={category}>
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-primary">{category}</p>
                    <div className="space-y-1">
                      {queries.map((q) => (
                        <button
                          key={q.id}
                          onClick={() => loadFromLibrary(q)}
                          className="block w-full rounded-md px-2 py-1.5 text-left text-xs text-muted-foreground hover:bg-secondary/60 hover:text-foreground transition-colors"
                          title={q.description}
                        >
                          <Sparkles className="mr-1.5 inline h-3 w-3 text-primary/70" />
                          {q.title}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </ScrollArea>
        </Card>
      </aside>

      {/* main panel */}
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <Tabs defaultValue="editor" className="flex flex-1 flex-col">
          <TabsList className="w-fit">
            <TabsTrigger value="editor">
              <TerminalSquare className="mr-2 h-4 w-4" /> Query Editor
            </TabsTrigger>
            <TabsTrigger value="saved">
              <Save className="mr-2 h-4 w-4" /> Saved Queries
            </TabsTrigger>
          </TabsList>

          <TabsContent value="editor" className="mt-4 flex flex-1 flex-col gap-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center text-base">
                    <Database className="mr-2 h-4 w-4 text-primary" />
                    PostgreSQL · ecommerce_db
                  </CardTitle>
                  <span className="text-xs text-muted-foreground">read-only playground</span>
                </div>
                <CardDescription>
                  SELECT / WITH / EXPLAIN only · destructive statements are blocked · 10s timeout
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="code-editor min-h-[220px] rounded-lg border-border bg-black/30 p-4 leading-relaxed text-emerald-200"
                  spellCheck={false}
                />

                <div className="flex flex-wrap items-center gap-2">
                  <Button onClick={handleExecute} disabled={isLoading || !query.trim()} className="btn-gradient text-white">
                    {isLoading ? (
                      <>
                        <Clock className="mr-2 h-4 w-4 animate-spin" /> Executing…
                      </>
                    ) : (
                      <>
                        <Play className="mr-2 h-4 w-4" /> Execute
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setQuery("")
                      setError(null)
                      setResults(null)
                    }}
                    disabled={isLoading || !query}
                  >
                    <RotateCcw className="mr-2 h-4 w-4" /> Clear
                  </Button>
                  {elapsed !== null && results && (
                    <span className="ml-auto text-xs text-muted-foreground">
                      executed in <span className="font-mono text-emerald-400">{elapsed}ms</span>
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>

            {error && (
              <Card className="border-destructive/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-destructive">Error</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="overflow-auto rounded-lg bg-destructive/10 p-4 text-xs text-destructive whitespace-pre-wrap">
                    {error}
                  </pre>
                </CardContent>
              </Card>
            )}

            {results && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Query results</CardTitle>
                  <CardDescription>
                    {results.length.toLocaleString()} row{results.length !== 1 ? "s" : ""} · export to CSV
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <QueryResultTable results={results} />
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="saved" className="mt-4">
            <SavedQueriesList
              onSelectQuery={(savedQuery) => {
                setQuery(savedQuery.query)
                setError(null)
                setResults(null)
              }}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
