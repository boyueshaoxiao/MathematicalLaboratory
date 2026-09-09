// 数独核心：随机生成“唯一解”题面。
// 步骤：回溯生成完整解 → 随机挖空 → 每挖一格用“解计数 ≤ 1”保证唯一解。

const N = 9

function shuffle(arr, rnd = Math.random) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    const t = arr[i]
    arr[i] = arr[j]
    arr[j] = t
  }
  return arr
}
function digits(rnd) {
  return shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9], rnd)
}
function canPut(g, idx, v) {
  const r = (idx / N) | 0
  const c = idx % N
  const r0 = (r / 3 | 0) * 3
  const c0 = (c / 3 | 0) * 3
  for (let k = 0; k < N; k++) {
    if (g[r * N + k] === v) return false
    if (g[k * N + c] === v) return false
  }
  for (let rr = r0; rr < r0 + 3; rr++) {
    for (let cc = c0; cc < c0 + 3; cc++) {
      if (g[rr * N + cc] === v) return false
    }
  }
  return true
}

// 随机一个完整解
function fullGrid(rnd) {
  const g = Array(81).fill(0)
  function fill(i) {
    if (i === 81) return true
    for (const v of digits(rnd)) {
      if (canPut(g, i, v)) {
        g[i] = v
        if (fill(i + 1)) return true
        g[i] = 0
      }
    }
    return false
  }
  fill(0)
  return g
}

// 解计数（最多数到 limit 即停）
function countSolutions(g, limit = 2) {
  let found = 0
  function dfs() {
    let best = -1
    let bc = 10
    let bs = null
    for (let i = 0; i < 81; i++) {
      if (g[i]) continue
      const cands = []
      for (let v = 1; v <= 9; v++) {
        if (canPut(g, i, v)) cands.push(v)
      }
      if (!cands.length) return
      if (cands.length < bc) {
        bc = cands.length
        best = i
        bs = cands
        if (bc === 1) break
      }
    }
    if (best === -1) {
      found++
      return
    }
    for (const v of bs) {
      g[best] = v
      dfs()
      g[best] = 0
      if (found >= limit) return
    }
  }
  dfs()
  return found
}

/**
 * 生成一局数独。
 * @param {number} givenTarget 期望留下的提示数（如 38/31/25）
 * @param {() => number} rnd 随机源
 * @returns {{ solution: number[], puzzle: number[] }}
 */
export function generateSudoku(givenTarget = 32, rnd = Math.random) {
  let best = null
  // 数次尝试，取提示数最接近目标者
  for (let attempt = 0; attempt < 6; attempt++) {
    const solution = fullGrid(rnd)
    const puzzle = solution.slice()
    const order = shuffle(Array.from({ length: 81 }, (_, i) => i), rnd)
    let givens = 81
    for (const pos of order) {
      if (givens <= givenTarget) break
      const v = puzzle[pos]
      puzzle[pos] = 0
      if (countSolutions(puzzle, 2) > 1) {
        puzzle[pos] = v
      } else {
        givens--
      }
    }
    if (!best || Math.abs(givens - givenTarget) < Math.abs(best.givens - givenTarget)) {
      best = { solution, puzzle, givens }
    }
    if (best.givens <= givenTarget) break
  }
  return { solution: best.solution, puzzle: best.puzzle }
}
