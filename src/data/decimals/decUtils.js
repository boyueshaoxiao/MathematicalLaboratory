// 小数公共工具：一律用“百分单位”的整数保存（如 0.37 -> 37、1.05 -> 105），避免浮点误差
export const NUMS = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九']

export function gcd(a, b) {
  a = Math.abs(a); b = Math.abs(b)
  while (b) { [a, b] = [b, a % b] }
  return a || 1
}

// 拆分：3.25 -> { int: 3, t: 2, h: 5 }
export function splitCents(c) {
  c = Math.round(c)
  return { int: Math.floor(c / 100), t: Math.floor((c % 100) / 10), h: c % 10 }
}

export function centsOf(i, t, h) {
  return i * 100 + t * 10 + h
}

// 数值文本：去掉末尾多余的 0（3.20 显示成 3.2；3.00 显示成 3）
export function fmtCents(c) {
  c = Math.round(c)
  const i = Math.floor(c / 100)
  const frac = c % 100
  if (!frac) return String(i)
  let s = String(frac).padStart(2, '0').replace(/0+$/, '')
  return s ? `${i}.${s}` : String(i)
}

// 整数中文（小学友好范围 0..999）
export function intZh(n) {
  if (n <= 9) return NUMS[n]
  if (n < 20) return '十' + (n % 10 ? NUMS[n % 10] : '')
  if (n < 100) {
    const t = Math.floor(n / 10)
    const o = n % 10
    return NUMS[t] + '十' + (o ? NUMS[o] : '')
  }
  if (n < 1000) {
    const h = Math.floor(n / 100)
    const r = n % 100
    return NUMS[h] + '百' + (r ? (r < 10 ? '零' + NUMS[r] : intZh(r)) : '')
  }
  return String(n)
}

// 中文读法：3.25 → 三点二五；1.05 → 一点零五；整数 3 → 三
export function readCents(c) {
  c = Math.round(c)
  const i = Math.floor(c / 100)
  const frac = c % 100
  if (!frac) return intZh(i)
  const s = String(frac).padStart(2, '0').replace(/0+$/, '')
  return intZh(i) + '点' + [...s].map(d => NUMS[Number(d)]).join('')
}

// 中文读法（完整两位小数）：3.20 → 三点二零；1.05 → 一点零五
export function readCentsFull(c) {
  c = Math.round(c)
  const i = Math.floor(c / 100)
  const frac = c % 100
  if (!frac) return intZh(i) + '.00'
  const s = String(frac).padStart(2, '0')
  return intZh(i) + '点' + [...s].map(d => NUMS[Number(d)]).join('')
}

// 组成中文：3.25 => 3 个一、2 个十分之一、5 个百分之一
export function partsText(c) {
  const { int, t, h } = splitCents(c)
  const parts = []
  if (int) parts.push(`${intZh(int)}个一`)
  if (t) parts.push(`${intZh(t)}个十分之一`)
  if (h) parts.push(`${intZh(h)}个百分之一`)
  return parts.length ? parts.join('、') : '0'
}

// 按 N/100 表示并约分，返回约分前的分母语义：如 37 -> [37, 100]，30 -> [3, 10]
export function fracPartsOfCents(c) {
  c = Math.round(c)
  const g = gcd(c, 100)
  return [c / g, 100 / g]
}

// 小数写成十分之/百分之几的文本：0.37 → 37/100；0.3 → 3/10
export function fracTextOfCents(c) {
  c = Math.round(c)
  if (!c) return '0'
  const g = gcd(c, 100)
  const n = c / g
  const d = 100 / g
  return d === 1 ? String(n) : `${n}/${d}`
}

// 一位小数（十分位）：范围 0.x ~ maxInt.x，且不是整数
export function randomTenths(maxInt = 9) {
  const i = Math.floor(Math.random() * (maxInt + 1))
  const t = 1 + Math.floor(Math.random() * 9)
  return centsOf(i, t, 0)
}

// 两位小数：百分位非零，保证写成完整的两位小数
export function randomHundredths(maxInt = 9) {
  const i = Math.floor(Math.random() * (maxInt + 1))
  const t = Math.floor(Math.random() * 10)
  const h = 1 + Math.floor(Math.random() * 9)
  return centsOf(i, t, h)
}

export function pick(list) {
  return list[Math.floor(Math.random() * list.length)]
}

export function shuffle(list) {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
