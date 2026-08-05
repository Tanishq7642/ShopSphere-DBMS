"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  GraduationCap,
  Lightbulb,
  Play,
  RotateCcw,
  Target,
  Trophy,
  XCircle,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import QueryResultTable from "@/components/query-result-table"
import { difficultyColor, quizChallenges, type Difficulty, type QuizGrade } from "@/lib/quiz"

type DifficultyFilter = "All" | Difficulty

interface QuizResult {
  grade: QuizGrade
  actual: any[]
  expected: any[]
}

interface ChallengeProgress {
  solved: boolean
  attempts: number
}

const STORAGE_KEY = "shopsphere.quiz.progress"
const PREVIEW_ROWS = 12

const FILTERS: DifficultyFilter[] = ["All", "Easy", "Intermediate", "Advanced"]

export default function SqlQuizPage() {
  const [filter, setFilter] = useState<DifficultyFilter>("All")
  const [selectedId, setSelectedId] = useState(quizChallenges[0].id)
  const [query, setQuery] = useState(quizChallenges[0].starter)
  const [result, setResult] = useState<QuizResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const [progress, setProgress] = useState<Record<string, ChallengeProgress>>({})
  // Request token: discards stale responses if the learner switches challenges
  // (or resets) while a check is still in flight.
  const requestToken = useRef(0)

  const challenge = useMemo(
    () => quizChallenges.find((c) => c.id === selectedId) ?? quizChallenges[0],
    [selectedId]
  )

  // ---- persisted progress -------------------------------------------------
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (raw) setProgress(JSON.parse(raw))
    } catch {
      /* ignore corrupt storage */
    }
  }, [])

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
    } catch {
      /* storage full / private mode - non-fatal */
    }
  }, [progress])

  const stats = useMemo(() => {
    const solved = quizChallenges.filter((c) => progress[c.id]?.solved).length
    const byDifficulty = (d: Difficulty) =>
      quizChallenges.filter((c) => c.difficulty === d && progress[c.id]?.solved).length
    return {
      solved,
      total: quizChallenges.length,
      easy: byDifficulty("Easy"),
      intermediate: byDifficulty("Intermediate"),
      advanced: byDifficulty("Advanced"),
    }
  }, [progress])

  const filtered = useMemo(
    () => (filter === "All" ? quizChallenges : quizChallenges.filter((c) => c.difficulty === filter)),
    [filter]
  )

  function selectChallenge(id: string) {
    const c = quizChallenges.find((x) => x.id === id)
    if (!c) return
    requestToken.current += 1 // cancel any in-flight check
    setSelectedId(id)
    setQuery(c.starter)
    setResult(null)
    setError(null)
    setRevealed(false)
  }

  async function handleCheck() {
    if (!query.trim()) {
      setError("Write your query first, then check it.")
      return
    }
    const token = requestToken.current
    const challengeId = selectedId
    setIsLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch("/api/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId, query }),
      })
      if (token !== requestToken.current) return // stale - learner switched challenges
      const data = await res.json()
      if (!res.ok || data.error) {
        setError(data.error || "Check failed.")
        return
      }
      setResult(data as QuizResult)
      // progress bookkeeping (keyed by the challenge this fetch was for)
      setProgress((prev) => {
        const p: ChallengeProgress = prev[challengeId] ?? { solved: false, attempts: 0 }
        return {
          ...prev,
          [challengeId]: { solved: p.solved || data.grade.status === "correct", attempts: p.attempts + 1 },
        }
      })
    } catch {
      if (token === requestToken.current) setError("An unexpected error occurred.")
    } finally {
      if (token === requestToken.current) setIsLoading(false)
    }
  }

  function resetProgress() {
    setProgress({})
  }

  const prevSolved = progress[selectedId]?.solved

  return (
    <div className="flex h-full min-h-[calc(100vh-4rem)] gap-4 p-4 md:p-6">
      {/* ============================ sidebar ============================ */}
      <aside className="hidden w-80 shrink-0 flex-col gap-4 lg:flex">
        {/* score card */}
        <Card className="shrink-0">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-base">
              <Target className="mr-2 h-4 w-4 text-primary" />
              SQL Assessment
            </CardTitle>
            <CardDescription>
              Write real SQL · auto-graded against the live ecommerce_db
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-end justify-between">
              <span className="text-3xl font-bold tabular-nums">
                {stats.solved}
                <span className="text-lg font-normal text-muted-foreground">/{stats.total}</span>
              </span>
              <Trophy
                className={`h-8 w-8 ${stats.solved === stats.total ? "text-amber-400" : "text-muted-foreground/40"}`}
              />
            </div>
            <Progress
              value={(stats.solved / Math.max(1, stats.total)) * 100}
              className="h-2 bg-secondary"
            />
            <div className="flex flex-wrap gap-1.5 text-[11px]">
              <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                Easy {stats.easy}/{quizChallenges.filter((c) => c.difficulty === "Easy").length}
              </Badge>
              <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-400">
                Int {stats.intermediate}/{quizChallenges.filter((c) => c.difficulty === "Intermediate").length}
              </Badge>
              <Badge variant="outline" className="border-rose-500/30 bg-rose-500/10 text-rose-400">
                Adv {stats.advanced}/{quizChallenges.filter((c) => c.difficulty === "Advanced").length}
              </Badge>
            </div>
            {stats.solved > 0 && (
              <Button variant="ghost" size="sm" className="w-full text-xs" onClick={resetProgress}>
                <RotateCcw className="mr-1.5 h-3 w-3" /> Reset progress
              </Button>
            )}
          </CardContent>
        </Card>

        {/* filter + challenge list */}
        <Card className="flex min-h-0 flex-1 flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-base">
              <GraduationCap className="mr-2 h-4 w-4 text-primary" />
              Challenges
            </CardTitle>
            <div className="flex flex-wrap gap-1 pt-1">
              {FILTERS.map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors ${
                    filter === f
                      ? "btn-gradient text-white"
                      : "bg-secondary/60 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </CardHeader>
          <ScrollArea className="flex-1">
            <CardContent>
              <div className="space-y-1.5">
                {filtered.map((c) => {
                  const p = progress[c.id]
                  const active = c.id === selectedId
                  return (
                    <button
                      key={c.id}
                      onClick={() => selectChallenge(c.id)}
                      disabled={isLoading}
                      className={`block w-full rounded-lg border px-3 py-2.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                        active
                          ? "border-primary/50 bg-primary/10"
                          : "border-border/60 hover:border-primary/30 hover:bg-secondary/50"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-xs font-medium">{c.title}</span>
                        {p?.solved ? (
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                        ) : p && p.attempts > 0 ? (
                          <span className="shrink-0 text-[10px] text-muted-foreground">
                            {p.attempts} attempt{p.attempts > 1 ? "s" : ""}
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-1 flex items-center gap-1.5">
                        <Badge variant="outline" className={`border px-1.5 py-0 text-[10px] ${difficultyColor(c.difficulty)}`}>
                          {c.difficulty}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">{c.topic}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </CardContent>
          </ScrollArea>
        </Card>
      </aside>

      {/* ============================ main panel ============================ */}
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        {/* challenge header */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className={`border px-2 py-0.5 ${difficultyColor(challenge.difficulty)}`}>
                {challenge.difficulty}
              </Badge>
              <Badge variant="secondary" className="px-2 py-0.5 text-xs">
                {challenge.topic}
              </Badge>
              <CardTitle className="flex items-center text-lg">
                {challenge.title}
                {prevSolved && (
                  <CheckCircle2 className="ml-2 h-5 w-5 text-emerald-400" aria-label="Solved" />
                )}
              </CardTitle>
            </div>
            <CardDescription className="mt-2 leading-relaxed">{challenge.prompt}</CardDescription>
          </CardHeader>
        </Card>

        {/* editor */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Your query</CardTitle>
            <CardDescription>
              Any valid SQL that produces the reference result passes · press{" "}
              <kbd className="rounded border border-border bg-secondary px-1.5 py-0.5 font-mono text-[10px]">Ctrl/⌘ + Enter</kbd>{" "}
              to check
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setResult(null)
                setError(null)
              }}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                  e.preventDefault()
                  handleCheck()
                }
              }}
              className="code-editor min-h-[200px] rounded-lg border-border bg-black/30 p-4 leading-relaxed text-emerald-200"
              spellCheck={false}
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={handleCheck} disabled={isLoading || !query.trim()} className="btn-gradient text-white">
                {isLoading ? (
                  <>
                    <AlertTriangle className="mr-2 h-4 w-4 animate-pulse" /> Grading…
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" /> Check answer
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  requestToken.current += 1 // cancel any in-flight check
                  setQuery(challenge.starter)
                  setResult(null)
                  setError(null)
                  setRevealed(false)
                }}
                disabled={isLoading}
              >
                <RotateCcw className="mr-2 h-4 w-4" /> Reset
              </Button>
              {!revealed && (
                <Button variant="ghost" onClick={() => setRevealed(true)} className="text-muted-foreground">
                  <Eye className="mr-2 h-4 w-4" /> Reveal solution
                </Button>
              )}
            </div>

            {revealed && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                <p className="mb-1.5 text-xs font-semibold text-amber-400">Reference solution</p>
                <pre className="code-editor overflow-x-auto whitespace-pre text-xs text-amber-100/90">
                  {challenge.solution}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>

        {/* hint */}
        <details className="group rounded-lg border border-border/60 bg-secondary/30 px-4 py-3">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            <Lightbulb className="h-4 w-4 text-amber-400" />
            Need a hint?
            <span className="ml-auto text-xs text-muted-foreground/60 transition-transform group-open:rotate-180">
              ▾
            </span>
          </summary>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{challenge.hint}</p>
        </details>

        {/* verdict */}
        {error && (
          <Card className="border-destructive/50">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center text-sm text-destructive">
                <XCircle className="mr-2 h-4 w-4" /> Query error
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="code-editor overflow-x-auto whitespace-pre-wrap rounded-lg bg-destructive/10 p-4 text-xs text-destructive">
                {error}
              </pre>
            </CardContent>
          </Card>
        )}

        {result && (
          <>
            <Card
              className={
                result.grade.status === "correct"
                  ? "border-emerald-500/40"
                  : "border-amber-500/40"
              }
            >
              <CardHeader className="pb-3">
                <CardTitle
                  className={`flex items-center gap-2 text-base ${
                    result.grade.status === "correct" ? "text-emerald-400" : "text-amber-400"
                  }`}
                >
                  {result.grade.status === "correct" ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <XCircle className="h-5 w-5" />
                  )}
                  {result.grade.status === "correct" ? "Correct!" : "Not quite"}
                </CardTitle>
                <CardDescription className="leading-relaxed">{result.grade.message}</CardDescription>
              </CardHeader>
              {result.grade.status === "wrong" && (
                <CardContent className="flex flex-wrap gap-1.5 pt-0">
                  {result.grade.missingColumns.map((c) => (
                    <Badge key={c} variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                      missing · {c}
                    </Badge>
                  ))}
                  {result.grade.unexpectedColumns.map((c) => (
                    <Badge key={c} variant="outline" className="border-rose-500/30 bg-rose-500/10 text-rose-400">
                      unexpected · {c}
                    </Badge>
                  ))}
                </CardContent>
              )}
            </Card>

            {/* comparison tables */}
            {result.grade.status === "correct" ? (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Your result</CardTitle>
                  <CardDescription>
                    {result.actual.length.toLocaleString()} row
                    {result.actual.length !== 1 ? "s" : ""} · identical to the reference
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <QueryResultTable results={result.actual.slice(0, PREVIEW_ROWS)} />
                  {result.actual.length > PREVIEW_ROWS && (
                    <p className="mt-2 text-center text-xs text-muted-foreground">
                      showing {PREVIEW_ROWS} of {result.actual.length.toLocaleString()} rows
                    </p>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 xl:grid-cols-2">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base text-emerald-400">Expected</CardTitle>
                    <CardDescription>
                      {result.expected.length.toLocaleString()} row
                      {result.expected.length !== 1 ? "s" : ""}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <QueryResultTable results={result.expected.slice(0, PREVIEW_ROWS)} />
                    {result.expected.length > PREVIEW_ROWS && (
                      <p className="mt-2 text-center text-xs text-muted-foreground">
                        showing {PREVIEW_ROWS} of {result.expected.length.toLocaleString()} rows
                      </p>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base text-rose-400">Yours</CardTitle>
                    <CardDescription>
                      {result.actual.length.toLocaleString()} row
                      {result.actual.length !== 1 ? "s" : ""}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <QueryResultTable results={result.actual.slice(0, PREVIEW_ROWS)} />
                    {result.actual.length > PREVIEW_ROWS && (
                      <p className="mt-2 text-center text-xs text-muted-foreground">
                        showing {PREVIEW_ROWS} of {result.actual.length.toLocaleString()} rows
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
