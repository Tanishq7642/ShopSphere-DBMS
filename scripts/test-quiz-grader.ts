// ============================================================================
// ShopSphere-DBMS · scripts/test-quiz-grader.ts
// Unit tests for the SQL Assessment auto-grader (lib/quiz.ts).
//
// Run:  pnpm test:quiz      (also executed in CI)
// ============================================================================
import { gradeChallenge, quizChallenges } from "../lib/quiz"

let failures = 0
function check(name: string, actual: boolean) {
  console.log(`${actual ? "PASS" : "FAIL"} · ${name}`)
  if (!actual) failures++
}

// 1. every challenge declares its required output columns
console.log("--- challenge definitions (13) ---")
for (const c of quizChallenges) {
  for (const col of c.expectedColumns) {
    check(`${c.id} declares column ${col}`, typeof col === "string" && col.length > 0)
  }
}
check("challenge count is 13", quizChallenges.length === 13)

// 2. exact match -> correct
const challenge = quizChallenges[0]
const rows = [
  { order_id: 1, order_date: new Date("2024-02-26"), customer: "Ava Brown", product_name: "Product_1" },
  { order_id: 2, order_date: new Date("2024-02-25"), customer: "John Doe", product_name: "Product_2" },
]
let g = gradeChallenge(challenge, rows, rows)
check("identical rows -> correct", g.status === "correct")

// 3. column order / case doesn't matter; values matter
g = gradeChallenge(challenge, [{ product_name: "Product_1", customer: "Ava Brown", ORDER_DATE: rows[0].order_date, order_id: 1 }], [rows[0]])
check("column order + case insensitive -> correct", g.status === "correct")

// 4. wrong alias -> wrong + missingColumns
g = gradeChallenge(challenge, [{ order_id: 1, order_date: rows[0].order_date, buyer: "Ava Brown", product_name: "Product_1" }], [rows[0]])
check("wrong alias -> wrong", g.status === "wrong")
check("  reports missing column", g.missingColumns.includes("customer"))
check("  reports unexpected column", g.unexpectedColumns.includes("buyer"))

// 5. wrong value -> wrong, columnsOk stays true
g = gradeChallenge(challenge, [{ order_id: 1, order_date: rows[0].order_date, customer: "Ava BROWN", product_name: "Product_1" }], [rows[0]])
check("wrong value -> wrong", g.status === "wrong" && g.columnsOk && !g.rowsOk)

// 6. multiset: duplicates matter, order doesn't
g = gradeChallenge(challenge, [rows[0], rows[0]], [rows[0]])
check("duplicate rows -> wrong (multiset)", g.status === "wrong")
g = gradeChallenge(challenge, [rows[1], rows[0]], [rows[0], rows[1]])
check("same multiset different order -> correct", g.status === "correct")

// 7. float precision within 2dp compares equal (price IS expected here)
const filterCh = quizChallenges[1] // filter-mid-range: product_id, product_name, price
g = gradeChallenge(
  filterCh,
  [{ product_id: 1, product_name: "Product_1", price: 19.9 }],
  [{ product_id: 1, product_name: "Product_1", price: 19.899999999 }]
)
check("float drift within 2dp -> correct", g.status === "correct")

// 8. extra column -> wrong
g = gradeChallenge(challenge, [{ order_id: 1, order_date: rows[0].order_date, customer: "Ava Brown", product_name: "Product_1", order_status: "Shipped" }], [rows[0]])
check("extra column -> wrong", g.status === "wrong")

// 8b. numeric string vs float: Prisma DECIMAL "19.90" must equal ::float8 19.9
g = gradeChallenge(
  filterCh,
  [{ product_id: 1, product_name: "Product_1", price: "19.90" }],
  [{ product_id: 1, product_name: "Product_1", price: 19.9 }]
)
check("numeric string vs float -> correct", g.status === "correct")

// 9. date-only comparison: same day at different times compares equal
g = gradeChallenge(
  challenge,
  [{ order_id: 1, order_date: new Date("2024-02-26T14:30:00Z"), customer: "Ava Brown", product_name: "Product_1" }],
  [{ order_id: 1, order_date: new Date("2024-02-26T00:00:00Z"), customer: "Ava Brown", product_name: "Product_1" }]
)
check("date day-granularity -> correct", g.status === "correct")

console.log(`\n${failures === 0 ? "ALL TESTS PASSED" : failures + " TEST(S) FAILED"}`)
process.exit(failures === 0 ? 0 : 1)
