// 分数公共工具：约分 / 通分 / 中文读数 / 随机出题
export function gcd(a, b) {
  a = Math.abs(a); b = Math.abs(b)
  while (b) { [a, b] = [b, a % b] }
  return a || 1
}

export function lcm(a, b) {
  return Math.abs(a * b) / gcd(a, b)
}

// 约分，返回 [分子, 分母]
export function simplify(n, d) {
  const g = gcd(n, d)
  return [n / g, d / g]
}

// 最简分母：约分后的分母
export function simpleDen(n, d) {
  return simplify(n, d)[1]
}

const NUMS = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十']

// 整数中文（仅用于小学友好范围）
function intZh(x) {
  if (x === 0) return '零'
  if (x <= 10) return NUMS[x]
  if (x < 20) return '十' + (x % 10 ? NUMS[x % 10] : '')
  return String(x)
}

// 真分数中文读法：2/3 -> 三分之二，1/2 -> 二分之一，3/1 -> 三
export function fracReadZh(n, d) {
  if (d === 1) return intZh(n)
  if (n === 0) return '零'
  if (n % d === 0) return intZh(n / d)
  const den = intZh(d)
  return n === 1 ? den + '分之一' : den + '分之' + intZh(n)
}

// 带分数中文：整 + 真分数
export function mixedReadZh(w, n, d) {
  if (n === 0) return intZh(w)
  return `${intZh(w)}又${fracReadZh(n, d)}`
}

// 分数算式文本 n/d；整数直接显示
export function fracText(n, d) {
  return d === 1 ? String(n) : `${n}/${d}`
}

// 显示文本：自动约分，整数不带分母
export function displayFraction(n, d) {
  if (d === 1) return String(n)
  const [a, b] = simplify(n, d)
  return b === 1 ? String(a) : `${a}/${b}`
}

// 随机真分数（不一定最简），分母 2..maxDen
export function randomFraction(maxDen = 12) {
  const d = 2 + Math.floor(Math.random() * (maxDen - 1))
  return [randNumer(d), d]
}

export function randNumer(d) {
  return 1 + Math.floor(Math.random() * (d - 1))
}

// 等值分数序列：n/d, 2n/2d, 3n/3d ...（最多 count 项，超出 maxDen 停）
export function equalSeries(n, d, count = 4, maxDen = 24) {
  const out = []
  for (let k = 1; k <= count; k++) {
    const [a, b] = [n * k, d * k]
    if (b > maxDen) break
    out.push([a, b])
  }
  return out
}

// 求一个数 N 的 a/b，要求 N 能被 b 整除
export function fractionOf(N, a, b) {
  return N / b * a
}

// 找一组友好分母：如 [2,3,4,5,6,8,10,12]
export const FRIENDLY_DENS = [2, 3, 4, 5, 6, 8, 10, 12]

// 随机可约分数（约分后分母更小，供约分练习），分母不超过 maxDen
export function randomReducible(maxDen = 24) {
  const base = 2 + Math.floor(Math.random() * 3) // 2..4：尽量用 2/3/4 作隐藏因数
  const scale = 2 + Math.floor(Math.random() * 4) // 2..5
  let d = base * scale
  let n = 0
  do { n = 1 + Math.floor(Math.random() * (d - 1)) } while (gcd(n, d) === 1 || n === d)
  if (d > maxDen) return randomReducible(maxDen)
  return [n, d]
}
