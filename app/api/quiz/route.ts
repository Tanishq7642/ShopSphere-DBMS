import { type NextRequest, NextResponse } from "next/server"
import { executeQuery } from "@/lib/actions"
import { gradeChallenge, quizChallenges } from "@/lib/quiz"

// ============================================================================
// POST /api/quiz  { challengeId, query }
// Runs the learner's query AND the reference solution through the same
// read-only guard as the playground, then auto-grades the two result sets.
// ============================================================================

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const challengeId = typeof body?.challengeId === "string" ? body.challengeId : ""
    const query = typeof body?.query === "string" ? body.query : ""

    const challenge = quizChallenges.find((c) => c.id === challengeId)
    if (!challenge) {
      return NextResponse.json({ error: "Unknown challenge." }, { status: 400 })
    }
    if (!query.trim()) {
      return NextResponse.json({ error: "Write your query first, then check it." }, { status: 400 })
    }

    // 1. The learner's query must compile AND run
    const actual = await executeQuery(query)
    if (actual.error) {
      return NextResponse.json({ error: actual.error }, { status: 400 })
    }

    // 2. Run the trusted reference solution
    const expected = await executeQuery(challenge.solution)
    if (expected.error) {
      // Reference solutions are verified in CI - this would be a bug in the quiz
      console.error(`Quiz reference solution failed [${challenge.id}]:`, expected.error)
      return NextResponse.json(
        { error: "Internal error: the reference solution failed to run." },
        { status: 500 }
      )
    }

    // 3. Auto-grade: compare columns (set) + rows (multiset)
    const grade = gradeChallenge(challenge, actual.data ?? [], expected.data ?? [])

    return NextResponse.json({
      grade,
      actual: actual.data ?? [],
      expected: expected.data ?? [],
    })
  } catch (error: any) {
    console.error("Quiz API error:", error)
    return NextResponse.json({ error: error?.message || "Server error" }, { status: 500 })
  }
}
