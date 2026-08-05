"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

/**
 * Sort dropdown for the storefront.
 * Client component: the /products page is a Server Component, so the
 * onValueChange handler must live here (functions can't cross the
 * server→client boundary).
 */
export function SortSelect({ sort }: { sort: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const handleChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value === "name") {
      params.delete("sort")
    } else {
      params.set("sort", value)
    }
    params.delete("page") // reset to page 1 when the sort changes
    const qs = params.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
  }

  return (
    <Select value={sort} onValueChange={handleChange}>
      <SelectTrigger>
        <SelectValue placeholder="Sort" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="name">Name (A–Z)</SelectItem>
        <SelectItem value="price_asc">Price: low → high</SelectItem>
        <SelectItem value="price_desc">Price: high → low</SelectItem>
      </SelectContent>
    </Select>
  )
}
