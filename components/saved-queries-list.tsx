"use client"

import { useState, useEffect } from "react"
import { Play, Plus, Save, Trash } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

interface SavedQuery {
  id: string
  name: string
  description: string
  query: string
}

interface SavedQueriesListProps {
  onSelectQuery: (query: SavedQuery) => void
}

export default function SavedQueriesList({ onSelectQuery }: SavedQueriesListProps) {
  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([])
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [newQuery, setNewQuery] = useState({
    name: "",
    description: "",
    query: "",
  })

  // Load saved queries from localStorage on component mount
  useEffect(() => {
    const storedQueries = localStorage.getItem("savedQueries")
    if (storedQueries) {
      try {
        setSavedQueries(JSON.parse(storedQueries))
      } catch (error) {
        console.error("Failed to parse saved queries:", error)
      }
    }
  }, [])

  // Save queries to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("savedQueries", JSON.stringify(savedQueries))
  }, [savedQueries])

  function handleSaveQuery() {
    if (!newQuery.name || !newQuery.query) return

    const newSavedQuery: SavedQuery = {
      id: Date.now().toString(),
      ...newQuery,
    }

    setSavedQueries([...savedQueries, newSavedQuery])
    setIsAddDialogOpen(false)
    setNewQuery({ name: "", description: "", query: "" })
  }

  function handleDeleteQuery(id: string) {
    setSavedQueries(savedQueries.filter((q) => q.id !== id))
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Saved Queries</h2>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add New Query
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Save New Query</DialogTitle>
              <DialogDescription>Save a SQL query for future use</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={newQuery.name}
                  onChange={(e) => setNewQuery({ ...newQuery, name: e.target.value })}
                  placeholder="Monthly Sales Report"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Input
                  id="description"
                  value={newQuery.description}
                  onChange={(e) => setNewQuery({ ...newQuery, description: e.target.value })}
                  placeholder="Shows sales data aggregated by month"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="query">SQL Query</Label>
                <Textarea
                  id="query"
                  value={newQuery.query}
                  onChange={(e) => setNewQuery({ ...newQuery, query: e.target.value })}
                  placeholder="SELECT * FROM orders WHERE..."
                  className="font-mono min-h-[100px]"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveQuery} disabled={!newQuery.name || !newQuery.query}>
                <Save className="h-4 w-4 mr-2" />
                Save Query
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {savedQueries.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-muted/40">
          <p className="text-muted-foreground">No saved queries yet</p>
          <p className="text-sm text-muted-foreground mt-1">Save your frequently used queries for quick access</p>
          <Button variant="outline" className="mt-4" onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Your First Query
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {savedQueries.map((savedQuery) => (
            <Card key={savedQuery.id}>
              <CardHeader>
                <CardTitle>{savedQuery.name}</CardTitle>
                {savedQuery.description && <CardDescription>{savedQuery.description}</CardDescription>}
              </CardHeader>
              <CardContent>
                <pre className="bg-muted p-3 rounded-md overflow-auto text-xs font-mono max-h-[100px]">
                  {savedQuery.query}
                </pre>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="ghost" size="sm" onClick={() => handleDeleteQuery(savedQuery.id)}>
                  <Trash className="h-4 w-4 mr-2" />
                  Delete
                </Button>
                <Button variant="outline" size="sm" onClick={() => onSelectQuery(savedQuery)}>
                  <Play className="h-4 w-4 mr-2" />
                  Run
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

