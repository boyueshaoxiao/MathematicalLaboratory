// 单位换算实验室 · 精确换算工具
// 数值一律用「约分后的有理数」{ n, d }（BigInt）表示，避免浮点误差：
//   小数文本 "3.5" -> { n: 7n, d: 2n }；1 米 + 5 厘米这类运算全部走整数乘除。
// 换算：value 在 A 单位 → B 单位 = value × factor(A) ÷ factor(B)，factor 见 units.js。

// ---------- 有理数基础 ----------
export function gcd(a, b) {
  a = a < 0n ? -a : a
  b = b < 0n ? -b : b
  while (b) { const t = a % b; a = b; b = t }
  return a || 1n
}

// 约分并保证分母为正
export function reduce(n, d) {
  if (d < 0n) { n = -n; d = -d }
  if (n === 0n) return { n: 0n, d: 1n }
  const g = gcd(n, d)
  return { n: n / g, d: d / g }
}

export const ONE = { n: 1n, d: 1n }

export function mulFrac(a, b) {
  return reduce(a.n * b.n, a.d * b.d)
}

export function divFrac(a, b) {
  return reduce(a.n * b.d, a.d * b.n)
}

// 比较两个有理数：-1 / 0 / 1（交叉相乘，BigInt 不会溢出）
export function cmpFrac(a, b) {
  const l = a.n * b.d
  const r = b.n * a.d
  return l < r ? -1 : l > r ? 1 : 0
}

// 一个单位到基本单位的换算系数（BigInt 有理数）
function factorOf(u) {
  if (u.pow != null) {
    if (u.pow >= 0) return { n: 10n ** BigInt(u.pow), d: 1n }
    return { n: 1n, d: 10n ** BigInt(-u.pow) }
  }
  return { n: BigInt(u.factor[0]), d: BigInt(u.factor[1]) }
}

// 把「字符串数字」读成约分后的有理数；读不出来返回 null
// 支持 3 / 3.5 / .5 / 0.50 / -2，空格自动忽略
export function parseNum(text) {
  if (text == null) return null
  let s = String(text).trim().replace(/\s/g, '')
  if (!/^[+-]?(\d+\.?\d*|\.\d+)$/.test(s)) return null
  let neg = false
  if (s[0] === '+' || s[0] === '-') { neg = s[0] === '-'; s = s.slice(1) }
  if (s.length > 24) return null
  const dot = s.indexOf('.')
  const ip = dot < 0 ? s : s.slice(0, dot)
  const fp = dot < 0 ? '' : s.slice(dot + 1)
  let n = BigInt(ip || '0') * 10n ** BigInt(fp.length) + BigInt(fp || '0')
  let d = 10n ** BigInt(fp.length)
  let r = reduce(n, d)
  if (neg) r = { n: -r.n, d: r.d }
  return r
}

// ---------- 换算 ----------
// 数值 q（在 from 单位）换算成 to 单位的精确值
export function convert(q, from, to) {
  return divFrac(mulFrac(q, factorOf(from)), factorOf(to))
}

// 1 个 from 单位 = ? 个 to 单位（用于“1 米 = 100 厘米”这类进率提示）
export function rateOne(from, to) {
  return convert(ONE, from, to)
}

// ---------- 文本输出 ----------
// 有理数 → 精确小数文本；若除不尽则最多 maxFrac 位四舍五入，并用 { text, exact } 告诉调用方要不要加 “≈”
export function fmtQ(q, maxFrac = 8) {
  let { n, d } = q
  if (d < 0n) { n = -n; d = -d }
  const neg = n < 0n
  if (neg) n = -n
  let int = n / d
  let rem = n % d
  const digs = []
  while (rem !== 0n && digs.length < maxFrac + 1) {
    rem *= 10n
    digs.push(Number(rem / d))
    rem %= d
  }
  let exact = rem === 0n
  if (!exact && digs.length) {
    // 用多算的一位做四舍五入
    let carry = digs.pop() >= 5 ? 1 : 0
    let i = digs.length - 1
    while (carry && i >= 0) {
      const v = digs[i] + carry
      if (v === 10) { digs[i] = 0; i--; carry = 1 } else { digs[i] = v; carry = 0 }
    }
    if (carry) int += 1n
  }
  const f = digs.join('').replace(/0+$/, '')
  const body = f ? `${int}.${f}` : `${int}`
  return { text: neg ? '-' + body : body, exact }
}

// fmtQ 的直接字符串版本（带 ≈）
export function fmtQStr(q, maxFrac = 8) {
  const r = fmtQ(q, maxFrac)
  return r.exact ? r.text : `≈ ${r.text}`
}

// 10^n 的文本：10^6 → “1000000”
export function pow10Text(n) {
  let v = 10n ** BigInt(n)
  return String(v)
}

// 判断两个单位之间的进率是不是 10 的幂：是则返回 { power: 跨几级 }，否则 null
export function tenStepGap(from, to) {
  if (from.pow == null || to.pow == null) return null
  const gap = from.pow - to.pow
  return { power: gap } // 1 from = 10^gap to
}

// 生活参照物：拿换算结果和单位里的常见物体比一比
// 返回最接近的一条 { obj, count, countText }；没合适的参照物返回 null
export function pickRef(resultVal, unit) {
  const refs = unit.refs || []
  if (!refs.length || resultVal <= 0) return null
  let best = null
  let bestScore = Infinity
  for (const r of refs) {
    const count = Number(resultVal) / r.v
    if (count <= 0) continue
    const score = Math.abs(Math.log10(count))
    if (score < bestScore && count >= 0.2 && count <= 40) {
      bestScore = score
      best = { obj: r.obj, count }
    }
  }
  if (!best) return null
  const c = best.count
  const cStr = c >= 100 ? Math.round(c).toString()
    : c >= 10 ? Math.round(c).toString()
      : (Math.round(c * 10) / 10).toString()
  return { obj: best.obj, count: c, countText: cStr }
}

// ---------- 随机小工具 ----------
export function pick(list) {
  return list[Math.floor(Math.random() * list.length)]
}

export function randInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1))
}

export function shuffle(list) {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
