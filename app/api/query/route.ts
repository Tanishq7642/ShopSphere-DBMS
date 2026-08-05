import { type NextRequest, NextResponse } from "next/server"
import { executeQuery } from "@/lib/actions"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const query = typeof body?.query === "string" ? body.query : ""

    if (!query.trim()) {
      return NextResponse.json({ error: "Please enter a SQL query." }, { status: 400 })
    }

    const result = await executeQuery(query)
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
    return NextResponse.json({ data: result.data })
  } catch (error: any) {
    console.error("Query API error:", error)
    return NextResponse.json({ error: error?.message || "Server error" }, { status: 500 })
  }
}
