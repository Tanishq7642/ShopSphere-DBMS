"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight, Download } from "lucide-react"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface QueryResultTableProps {
  results: any[]
}

export default function QueryResultTable({ results }: QueryResultTableProps) {
  const [page, setPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)

  if (!results.length) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Query executed successfully, but no results were returned.
      </div>
    )
  }

  const columns = Object.keys(results[0])
  const totalPages = Math.ceil(results.length / rowsPerPage)
  const startIndex = (page - 1) * rowsPerPage
  const paginatedResults = results.slice(startIndex, startIndex + rowsPerPage)

  function downloadCsv() {
    // Create CSV content
    const headers = columns.join(",")
    const rows = results
      .map((row) =>
        columns
          .map((col) => {
            const value = row[col]
            // Handle values that need quotes (strings with commas, quotes, or newlines)
            if (typeof value === "string" && (value.includes(",") || value.includes('"') || value.includes("\n"))) {
              return `"${value.replace(/"/g, '""')}"`
            }
            return value === null ? "" : value
          })
          .join(","),
      )
      .join("\n")

    const csvContent = `${headers}\n${rows}`

    // Create download link
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `query-results-${new Date().toISOString().slice(0, 10)}.csv`)
    link.style.display = "none"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-4">
      <div className="overflow-auto border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column}>{column}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedResults.map((row, rowIndex) => (
              <TableRow key={rowIndex}>
                {columns.map((column) => (
                  <TableCell key={`${rowIndex}-${column}`}>
                    {row[column] === null ? (
                      <span className="text-muted-foreground italic">null</span>
                    ) : typeof row[column] === "object" ? (
                      JSON.stringify(row[column])
                    ) : (
                      String(row[column])
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-1">
            <span className="text-sm">Page</span>
            <Input
              className="w-12 h-8"
              type="number"
              min={1}
              max={totalPages}
              value={page}
              onChange={(e) => {
                const value = Number.parseInt(e.target.value)
                if (!isNaN(value) && value >= 1 && value <= totalPages) {
                  setPage(value)
                }
              }}
            />
            <span className="text-sm">of {totalPages}</span>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={downloadCsv}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>
    </div>
  )
}

