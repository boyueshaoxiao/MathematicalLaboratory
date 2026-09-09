// 轻量音效工具：用 Web Audio 实时合成，无需任何音频文件。
// 首次调用发生在用户手势(点击/按键)内，浏览器才会允许出声。

let ctx = null

function ensure() {
  try {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext
      if (!AC) return null
      ctx = new AC()
    }
    if (ctx.state === 'suspended') ctx.resume()
    return ctx
  } catch {
    return null
  }
}

// 单个包络音
function tone({ f0, f1 = f0, t = 0, dur = 0.1, type = 'sine', vol = 0.2 }) {
  const c = ensure()
  if (!c) return
  const o = c.createOscillator()
  const g = c.createGain()
  const when = c.currentTime + t
  o.type = type
  o.frequency.setValueAtTime(Math.max(1, f0), when)
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), when + dur)
  g.gain.setValueAtTime(0, when)
  g.gain.linearRampToValueAtTime(vol, when + 0.006)
  g.gain.exponentialRampToValueAtTime(0.001, when + dur)
  o.connect(g).connect(c.destination)
  o.start(when)
  o.stop(when + dur + 0.05)
}

// 2048 合并：短促的“咚”碰撞声
export function playMerge() {
  tone({ f0: 210, f1: 90, dur: 0.09, type: 'triangle', vol: 0.3 })
}

// 华容道每走一步：轻快的“嗒”
export function playMove() {
  tone({ f0: 720, f1: 480, dur: 0.05, type: 'sine', vol: 0.16 })
}

// 答错/失败：低沉“嘟”
export function playError() {
  tone({ f0: 240, f1: 118, dur: 0.2, type: 'square', vol: 0.09 })
  tone({ f0: 120, dur: 0.22, type: 'sine', vol: 0.12 })
}

// 胜利：上行琶音（大调三和弦 + 高八度）
export function playWin() {
  const notes = [523.25, 659.25, 783.99, 1046.5]
  notes.forEach((f, i) => {
    tone({ f0: f, dur: 0.22, type: 'triangle', vol: 0.18, t: i * 0.13 })
  })
  // 末尾补一个低音柱垫一下
  tone({ f0: 261.63, dur: 0.5, type: 'sine', vol: 0.1, t: notes.length * 0.13 - 0.03 })
}
