// 轻量 PNG 解码（仅 RGBA/RGB 8bit，支持常见 filter）→ 统计
const fs = require('fs')
const zlib = require('zlib')

function decodePng(path) {
  const buf = fs.readFileSync(path)
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('not png')
  let off = 8
  let width = 0, height = 0, bitDepth = 0, colorType = 0, idat = []
  while (off < buf.length) {
    const len = buf.readUInt32BE(off)
    const type = buf.toString('ascii', off + 4, off + 8)
    const data = buf.subarray(off + 8, off + 8 + len)
    if (type === 'IHDR') {
      width = data.readUInt32BE(0); height = data.readUInt32BE(4)
      bitDepth = data[8]; colorType = data[9]
    } else if (type === 'IDAT') idat.push(data)
    off += 12 + len
  }
  const raw = zlib.inflateSync(Buffer.concat(idat))
  const chan = colorType === 6 ? 4 : colorType === 2 ? 3 : 1
  const stride = width * chan
  const out = Buffer.alloc(width * height * chan)
  for (let y = 0; y < height; y++) {
    const f = raw[y * (stride + 1)]
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1))
    const prev = y > 0 ? out.subarray((y - 1) * stride, y * stride) : null
    const cur = out.subarray(y * stride, (y + 1) * stride)
    for (let i = 0; i < stride; i++) {
      const a = i >= chan ? cur[i - chan] : 0
      const b = prev ? prev[i] : 0
      const c = prev && i >= chan ? prev[i - chan] : 0
      let v = line[i]
      switch (f) {
        case 1: v += a; break
        case 2: v += b; break
        case 3: v += (a + b) >> 1; break
        case 4: {
          const p = a + b - c
          const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c)
          v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c)
          break
        }
      }
      cur[i] = v & 0xff
    }
  }
  return { width, height, chan, data: out }
}

function stats(img, sampleStep = 4) {
  const hist = new Map()
  let sum = [0, 0, 0], n = 0
  for (let y = 0; y < img.height; y += sampleStep) {
    for (let x = 0; x < img.width; x += sampleStep) {
      const i = (y * img.width + x) * img.chan
      const r = img.data[i], g = img.data[i + 1], b = img.data[i + 2]
      const key = (r >> 4) * 4096 + (g >> 4) * 64 + (b >> 4)
      hist.set(key, (hist.get(key) || 0) + 1)
      sum[0] += r; sum[1] += g; sum[2] += b
      n++
    }
  }
  return {
    nColors: hist.size,
    mean: sum.map(v => Math.round(v / n)),
    top: [...hist.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, c]) => {
      const r = (k >> 12) << 4, g = ((k >> 6) & 63) << 4, b = (k & 63) << 4
      return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}(${Math.round(100 * c / n)}%)`
    })
  }
}

const files = process.argv.slice(2)
for (const f of files) {
  const img = decodePng(f)
  const s = stats(img)
  console.log(f.split(/[\\/]/).pop() + ' ' + img.width + 'x' + img.height + ' colors=' + s.nColors + ' mean=' + s.mean.join(',') + ' top=' + s.top.join(' '))
}
