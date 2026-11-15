// Mayak: a cut-paper lighthouse on a cliff over a layered paper sea.
// Two looks from one drawing: every paint is a CSS class with a day value and a night value, and
// `.day` / `.night` pieces show in their look: a dawn sky with sun, clouds and gulls by day, a moon,
// stars and a turning beam by night. The mod picks the look from the system's appearance (see register).
// Each piece of paper is a faceted outline in <defs>, drawn as far shadow, near shadow,
// a light lip up and left, then the paper itself (the Paper Garden technique).
// Motion is CSS animation timed by generated classes; nothing uses inline `style` attributes.
// A morning mist over the middle of the bay keeps the sea quiet under the conversation.

type Point = [number, number]

/** Paint name → [light, dark]. */
const PAINTS: Record<string, [string, string]> = {
  ground: ['#f1eadf', '#141c27'],
  fleck: ['#8f7c60', '#9fb2c8'],
  shadow: ['#5c4a26', '#000000'],
  lip: ['#ffffff', '#a9bccf'],
  sun: ['#ee9f7c', '#ee9f7c'],
  sunCore: ['#f4b493', '#f4b493'],
  moon: ['#efe4c8', '#efe4c8'],
  crater: ['#e2d5b4', '#ddd0ae'],
  star: ['#f3e7c4', '#f3e7c4'],
  cloud: ['#fbf7ef', '#222d3b'],
  cloudBack: ['#ece4d6', '#1b2532'],
  hillFar: ['#ddd3c3', '#18212e'],
  isle: ['#d0c4b1', '#1b2532'],
  ship: ['#6d7a84', '#0f151d'],
  shipLight: ['#6d7a84', '#ffd98a'],
  sea1: ['#cadbd5', '#1d2e40'],
  sea2: ['#adc9c5', '#22374c'],
  sea3: ['#8fb5b6', '#283f56'],
  sea4: ['#76a2a7', '#2e4962'],
  foam: ['#f8f4ec', '#6f8ca8'],
  rock: ['#b5a793', '#2a313c'],
  rockDark: ['#9c8e7a', '#222831'],
  rockLight: ['#c7baa6', '#343c48'],
  tower: ['#f5f0e6', '#d6cfc0'],
  band: ['#d6604a', '#b4513e'],
  iron: ['#3f4a55', '#151b22'],
  glass: ['#cfdde0', '#ffd98a'],
  win: ['#3f4a55', '#ffd98a'],
  roof: ['#c95540', '#a2442f'],
  hull: ['#3f6f80', '#355a6a'],
  sail: ['#fbf7ef', '#cfc6b3'],
  flag: ['#d6604a', '#b4513e'],
  gull: ['#ffffff', '#ffffff'],
  grassPale: ['#b8c3a0', '#33433a'],
  grass: ['#98ab84', '#3f5244'],
  grassDeep: ['#7a9468', '#4b604c'],
  bloom: ['#e07a5f', '#c9644c'],
}

/** Shadow, lip, crest and side-shade strengths: dark paper needs heavier shadows and a fainter lip. */
const TONES: [string, string] = [
  '.far{opacity:.08}.near{opacity:.15}.edge{opacity:.45}.crest{opacity:.7}.shade{fill:#3a2a10;opacity:.07}.mistStop{stop-color:#f1eadf}',
  '.far{opacity:.3}.near{opacity:.46}.edge{opacity:.1}.crest{opacity:.25}.shade{fill:#000;opacity:.2}.mistStop{stop-color:#141c27}',
]

const LAMP: Point = [1450, 356]

function fixed(value: number): number {
  return Number(value.toFixed(1))
}

/** A stable pseudo-random number in [0, 1) for piece `i`, channel `k`. */
function hash(i: number, k: number): number {
  const h = Math.sin(i * 127.1 + k * 311.7) * 43758.5453
  return h - Math.floor(h)
}

function outline(points: Point[]): string {
  return 'M' + points.map(p => `${fixed(p[0])} ${fixed(p[1])}`).join('L') + 'Z'
}

/** A scissor-cut ellipse: `n` straight facets with a little wobble. */
function facetEllipse(cx: number, cy: number, rx: number, ry: number, n: number, seed: number): Point[] {
  const points: Point[] = []
  for (let k = 0; k < n; k += 1) {
    const a = (k / n) * Math.PI * 2
    const w = 1 + (hash(k, seed) - 0.5) * 0.035
    points.push([cx + Math.cos(a) * rx * w, cy + Math.sin(a) * ry * w])
  }
  return points
}

/** A strip of sea or sky: a faceted edge at `base`, closed far below the frame. */
function waveStrip(base: number, amp: number, step: number, seed: number): Point[] {
  const points: Point[] = [[-120, 1090]]
  for (let x = -120, k = 0; x <= 1720; x += step, k += 1) {
    points.push([x, base + Math.sin(k * 0.85 + seed) * amp * 0.6 + (hash(k, seed) - 0.5) * amp])
  }
  points.push([1720, 1090])
  return points
}

/** A cloud: flat underside, three bumps on top, cut in straight facets. */
function cloud(x: number, y: number, w: number, h: number, seed: number): Point[] {
  const bumps: Point[] = [[0.24, 0.6], [0.52, 1], [0.78, 0.72]]
  const points: Point[] = [[x, y]]
  for (let k = 0; k <= 16; k += 1) {
    const t = k / 16
    let v = 0.2
    for (const [c, f] of bumps) {
      v = Math.max(v, f * Math.sqrt(Math.max(0, 1 - ((t - c) / 0.21) ** 2)))
    }
    v *= Math.sin(Math.PI * t) ** 0.3
    points.push([x + w * t, y - h * v - (hash(k, seed) - 0.5) * 3])
  }
  points.push([x + w, y])
  return points
}

/** A four-point paper sparkle. */
function sparkle(cx: number, cy: number, r: number): Point[] {
  const points: Point[] = []
  for (let k = 0; k < 8; k += 1) {
    const a = (k / 8) * Math.PI * 2 - Math.PI / 2
    const radius = k % 2 === 0 ? r : r * 0.34
    points.push([cx + Math.cos(a) * radius, cy + Math.sin(a) * radius])
  }
  return points
}

/** A tapered, slightly bent blade of dune grass from a base point to its tip. */
function blade(bx: number, by: number, tx: number, ty: number, width: number, bend: number): Point[] {
  const left: Point[] = []
  const right: Point[] = []
  for (let k = 0; k <= 6; k += 1) {
    const t = k / 6
    const half = (width / 2) * (1 - t) + 0.6
    const x = bx + (tx - bx) * t + bend * Math.sin(Math.PI * t * 0.9)
    const y = by + (ty - by) * t
    left.push([x - half, y])
    right.push([x + half, y])
  }
  return left.concat(right.reverse())
}

/** One wing of a gull, root at the body: flapped by scaling it vertically about the body. */
function wing(cx: number, cy: number, s: number, side: 1 | -1): Point[] {
  const shape: Point[] = [[0, 1], [9, -7], [19, 0], [9, -3]]
  return shape.map(([x, y]) => [cx + side * x * s, cy + y * s] as Point)
}

function rect(x0: number, y0: number, x1: number, y1: number): Point[] {
  return [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]
}

/** The x of the tapered tower's left and right edge at height `y`. */
function towerEdge(y: number): [number, number] {
  const inset = ((734 - y) * 20) / 332
  return [1392 + inset, 1508 - inset]
}

/** A band across the tower between two heights. */
function towerBand(top: number, bottom: number): Point[] {
  const [l0, r0] = towerEdge(top)
  const [l1, r1] = towerEdge(bottom)
  return [[l0, top], [r0, top], [r1, bottom], [l1, bottom]]
}

const shapes: [string, string][] = []

function shape(id: string, points: Point[]): string {
  shapes.push([id, outline(points)])
  return id
}

function use(id: string, dx: number, dy: number, cls: string): string {
  const at = dx || dy ? ` transform="translate(${fixed(dx)} ${fixed(dy)})"` : ''
  return `<use href="#${id}"${at} class="${cls}"/>`
}

/** One piece of paper: two shadows down and right, a lip up and left, then the paper. */
function paper(id: string, paint: string, lift: number, lip = true): string {
  const shadows = lift > 0 ? use(id, lift * 1.9, lift * 2.4, 'shadow far') + use(id, lift * 0.9, lift * 1.15, 'shadow near') : ''
  return shadows + (lip ? use(id, -1.2, -1.2, 'lip edge') : '') + use(id, 0, 0, paint)
}

const motionRules: string[] = []

/** Wraps markup in a moving group. Timing and pivot go to a generated class in the <style> block, never inline. */
function moving(cls: string, body: string, seconds: number, delay: number, origin?: Point): string {
  const pin = origin ? `transform-origin:${fixed(origin[0])}px ${fixed(origin[1])}px;` : ''
  const id = `m${motionRules.length}`
  motionRules.push(`.${id}{${pin}animation-duration:${fixed(seconds)}s;animation-delay:-${fixed(delay)}s}`)
  return `<g class="${cls} ${id}">${body}</g>`
}

function sky(): string {
  let day = ''
  let night = ''
  const sunAt: Point = [540, 172]
  const sun = paper(shape('sun', facetEllipse(sunAt[0], sunAt[1], 60, 60, 22, 3)), 'sun', 4) +
    paper(shape('sunCore', facetEllipse(sunAt[0] - 6, sunAt[1] - 6, 40, 40, 16, 4)), 'sunCore', 1.2)
  day += moving('breathe', moving('spin', sun, 90, 0, sunAt), 9, 0, sunAt)
  night += paper(shape('moon', facetEllipse(sunAt[0], sunAt[1], 52, 52, 16, 5)), 'moon', 4)
  night += paper(shape('crater1', facetEllipse(522, 158, 10, 9, 8, 6)), 'crater', 0, false)
  night += paper(shape('crater2', facetEllipse(558, 190, 7, 6, 7, 7)), 'crater', 0, false)
  night += paper(shape('crater3', facetEllipse(550, 146, 5, 5, 6, 8)), 'crater', 0, false)

  for (let i = 0; i < 30; i += 1) {
    const x = 40 + hash(i, 11) * 1520
    const y = 30 + hash(i, 12) * 420
    if (Math.hypot(x - sunAt[0], y - sunAt[1]) < 110) continue
    const r = 2.6 + hash(i, 13) * 4
    const piece = paper(shape(`star${i}`, sparkle(x, y, r)), 'star', 0)
    night += i % 2 === 0 ? moving('twinkle', piece, 2.5 + hash(i, 14) * 3.5, hash(i, 15) * 6, [x, y]) : piece
  }

  const clouds: [number, number, number, number, number][] = [
    [620, 262, 230, 62, 44],
    [1020, 156, 270, 70, 38],
    [40, 480, 200, 50, 52],
    [700, 96, 170, 44, 60],
  ]
  let drift = ''
  clouds.forEach(([x, y, w, h, seconds], i) => {
    const back = paper(shape(`cloudBack${i}`, cloud(x + w * 0.18, y - h * 0.18, w * 0.8, h * 0.9, 25 + i)), 'cloudBack', 2)
    drift += moving('drift', back + paper(shape(`cloud${i}`, cloud(x, y, w, h, 20 + i)), 'cloud', 4), seconds, hash(i, 21) * seconds)
  })

  // Gulls cross the whole sky from the lighthouse side, flapping now and then.
  const flock: [number, number, number, number][] = [[1300, 236, 1.5, 46], [1360, 196, 1.2, 58], [1250, 300, 1.05, 52], [1420, 150, 0.9, 70]]
  flock.forEach(([x, y, s, seconds], i) => {
    const body = paper(shape(`gullBody${i}`, facetEllipse(x, y + 1, 3.2 * s, 2.2 * s, 6, 70 + i)), 'gull', 1.5)
    const wings = moving('flap', paper(shape(`gullL${i}`, wing(x, y, s, -1)), 'gull', 1.5) + paper(shape(`gullR${i}`, wing(x, y, s, 1)), 'gull', 1.5), 0.9 + hash(i, 72) * 0.5, hash(i, 73), [x, y])
    day += moving('fly', moving('glide', wings + body, 4 + i, i * 1.3, [x, y]), seconds, hash(i, 71) * seconds)
  })

  return `<g class="day">${day}</g><g class="night">${night}</g>${drift}`
}

function beam(): string {
  const [x, y] = LAMP
  const id = shape('beam', [[x, y - 6], [-160, y - 130], [-160, y + 130], [x, y + 6]])
  return `<g class="night"><g class="sweep"><use href="#${id}" fill="url(#beamFade)"/></g></g>`
}

function lighthouse(): string {
  const [l0, r0] = towerEdge(734)
  const [l1, r1] = towerEdge(402)
  let tower = paper(shape('tower', [[l0, 734], [l1, 402], [r1, 402], [r0, 734]]), 'tower', 5)
  const bands: [number, number][] = [[672, 706], [574, 608], [476, 510]]
  bands.forEach(([top, bottom], i) => {
    tower += paper(shape(`band${i}`, towerBand(top, bottom)), 'band', 1.2)
  })
  // The shaded right side of the round tower, over the white and the bands alike.
  const split = (a: number, b: number) => a + (b - a) * 0.6
  tower += `<use href="#${shape('towerShade', [[split(l0, r0), 734], [split(l1, r1), 402], [r1, 402], [r0, 734]])}" class="shade"/>`
  tower += paper(shape('door', [[1438, 734], [1438, 708], [1444, 700], [1456, 700], [1462, 708], [1462, 734]]), 'iron', 0.8)
  tower += paper(shape('win1', rect(1445, 622, 1455, 642)), 'win', 0.5, false)
  tower += paper(shape('win2', rect(1445, 526, 1455, 544)), 'win', 0.5, false)
  tower += paper(shape('win3', rect(1446, 432, 1454, 448)), 'win', 0.5, false)
  tower += paper(shape('glass', rect(1418, 334, 1482, 386)), 'glass', 2)
  tower += paper(shape('bar1', rect(1437, 334, 1441, 386)), 'iron', 0, false)
  tower += paper(shape('bar2', rect(1459, 334, 1463, 386)), 'iron', 0, false)
  tower += paper(shape('rail', rect(1398, 368, 1502, 372)), 'iron', 0.8, false)
  tower += paper(shape('post1', rect(1400, 368, 1404, 386)), 'iron', 0, false)
  tower += paper(shape('post2', rect(1496, 368, 1500, 386)), 'iron', 0, false)
  tower += paper(shape('gallery', rect(1392, 384, 1508, 402)), 'iron', 2.5)
  tower += paper(shape('rim', rect(1408, 328, 1492, 336)), 'iron', 1.5)
  tower += paper(shape('roof', [[1406, 330], [1450, 288], [1494, 330]]), 'roof', 3)
  tower += paper(shape('mastTop', rect(1448.5, 254, 1451.5, 290)), 'iron', 0.6, false)
  tower += moving('wave', paper(shape('pennant', [[1451, 256], [1478, 262], [1451, 268]]), 'flag', 1), 2.6, 0.4, [1451, 262])
  tower += paper(shape('finial', facetEllipse(1450, 283, 6, 6, 7, 9)), 'iron', 1)
  const halo = `<g class="night"><circle class="glow" cx="${LAMP[0]}" cy="${LAMP[1]}" r="90" fill="url(#halo)"/></g>`
  return tower + halo
}

function sea(): string {
  const hills = paper(shape('hillFar', [[-120, 820], [-120, 770], [-20, 752], [80, 738], [170, 742], [240, 760], [300, 788], [360, 820]]), 'hillFar', 2)
  const isle = paper(shape('isle', [[-120, 820], [-120, 794], [10, 776], [100, 758], [180, 752], [250, 762], [320, 782], [420, 808], [420, 820]]), 'isle', 3)
  // A small ship far out on the horizon, crossing slowly; its light comes on at night.
  const ship = moving('cross',
    paper(shape('shipHull', [[860, 790], [930, 790], [922, 798], [866, 798]]), 'ship', 1) +
    paper(shape('shipCabin', rect(884, 780, 906, 790)), 'ship', 0.8) +
    paper(shape('shipStack', rect(896, 772, 902, 780)), 'ship', 0.5) +
    paper(shape('shipLight', facetEllipse(888, 784, 2.2, 2.2, 6, 80)), 'shipLight', 0, false),
    140, 30)

  const cliff = paper(shape('cliff', [[1150, 1090], [1190, 962], [1238, 884], [1280, 806], [1304, 772], [1390, 736], [1530, 730], [1600, 714], [1720, 702], [1720, 1090]]), 'rock', 5)
  const facet = paper(shape('cliffFacet', [[1238, 884], [1280, 806], [1304, 772], [1340, 790], [1300, 860], [1262, 930]]), 'rockDark', 2)
  // The ridge in front of the tower's foot, so the tower stands in the rock, not on it; the grass grows from behind it.
  const ridge = paper(shape('ridge', [[1300, 905], [1318, 826], [1346, 776], [1398, 738], [1430, 734], [1470, 735], [1512, 731], [1560, 729], [1610, 720], [1720, 714], [1720, 905]]), 'rockLight', 3)
  const ridgeFace = paper(shape('ridgeFace', [[1290, 1090], [1306, 900], [1326, 836], [1356, 790], [1420, 768], [1500, 762], [1600, 750], [1720, 744], [1720, 1090]]), 'rock', 3)
  const tuft = (side: string, n: number, x0: number, y0: number, step: number, h: number, seed: number) => {
    let out = ''
    for (let i = 0; i < n; i += 1) {
      const x = x0 + i * step
      const piece = paper(shape(`${side}${i}`, blade(x, y0 + 26, x + (hash(i, seed) - 0.5) * 30, y0 - h * (0.6 + hash(i, seed + 1) * 0.5), 12 + hash(i, seed + 2) * 6, (hash(i, seed + 3) - 0.5) * 16)), ['grassPale', 'grass', 'grassDeep'][i % 3] ?? 'grass', 1.4)
      out += moving(i % 2 ? 'sway' : 'swayBack', piece, 4.5 + hash(i, seed + 4) * 3, hash(i, seed + 5) * 6, [x, y0 + 26])
    }
    return out
  }
  const footGrass = tuft('foot', 7, 1366, 742, 14, 46, 90) + tuft('cliffGrass', 6, 1536, 728, 16, 40, 95)
  const pebbles = paper(shape('pebble1', facetEllipse(1196, 958, 26, 16, 9, 81)), 'rockDark', 2.5) +
    paper(shape('pebble2', facetEllipse(1150, 978, 16, 11, 8, 82)), 'rockLight', 2)
  const front = paper(shape('front', [[1090, 1090], [1150, 992], [1222, 954], [1300, 934], [1384, 944], [1462, 908], [1560, 892], [1720, 880], [1720, 1090]]), 'rockDark', 4)

  // Each sea layer carries a pale crest: the same strip cut a little higher, peeking over its top edge.
  const wave = (i: number, base: number, amp: number, seconds: number, cls: string) => {
    const id = shape(`sea${i}`, waveStrip(base, amp, 78 + i * 8, i * 1.7))
    const lift = 3 + i * 0.4
    const body = use(id, lift * 1.9, lift * 2.4, 'shadow far') + use(id, lift * 0.9, lift * 1.15, 'shadow near') +
      use(id, 0, -2.6, 'foam crest') + use(id, 0, 0, `sea${i}`)
    return moving(cls, body, seconds, hash(i, 31) * seconds)
  }

  // The boat sits in the water: the front wave covers its waterline, and it sails slowly to and fro.
  const bx = 110
  const by = 20
  const boatBody =
    paper(shape('jib', [[246 + bx, 832 + by], [246 + bx, 896 + by], [200 + bx, 894 + by]]), 'sail', 2) +
    paper(shape('mast', rect(248 + bx, 812 + by, 252 + bx, 904 + by)), 'iron', 1, false) +
    paper(shape('mainsail', [[254 + bx, 818 + by], [254 + bx, 898 + by], [318 + bx, 896 + by]]), 'sail', 2) +
    moving('wave', paper(shape('flag', [[250 + bx, 802 + by], [270 + bx, 807 + by], [250 + bx, 813 + by]]), 'flag', 1), 2.2, 1, [250 + bx, 807 + by]) +
    paper(shape('hull', [[170 + bx, 902 + by], [330 + bx, 902 + by], [306 + bx, 932 + by], [194 + bx, 932 + by]]), 'hull', 3) +
    paper(shape('wake', [[156 + bx, 930 + by], [190 + bx, 922 + by], [228 + bx, 930 + by], [190 + bx, 936 + by]]), 'foam', 0, false)
  const boat = moving('sailAcross', moving('bob', boatBody, 4.5, 2, [250 + bx, 930 + by]), 70, 10)

  return (
    hills + isle +
    wave(1, 792, 8, 16, 'swell') + ship +
    wave(2, 846, 12, 13, 'swell') +
    cliff + facet + lighthouse() + footGrass + ridgeFace + ridge + pebbles + front +
    wave(3, 900, 15, 11, 'swellBob') +
    boat +
    wave(4, 958, 17, 9, 'swellBob') +
    '<ellipse cx="920" cy="930" rx="560" ry="250" fill="url(#mist)"/>' +
    grass()
  )
}

/** Dune grass and sea-pinks in the bottom corners, swaying from their roots like the Paper Garden sprigs. */
function grass(): string {
  const paints = ['grassPale', 'grass', 'grassDeep']
  let out = ''
  /** A tuft of `count` blades fanning from `x0` by `step`; `lean` tips them toward the frame. */
  const tuft = (side: string, count: number, x0: number, step: number, lean: number, seed: number) => {
    for (let i = 0; i < count; i += 1) {
      const x = x0 + i * step
      const tx = x + (hash(i, seed) - 0.5) * 90 + lean * (0.4 + hash(i, seed + 1))
      const ty = 735 + (i / count) * 110 + hash(i, seed + 2) * 55
      const w = 30 + hash(i, seed + 3) * 18
      const bend = (hash(i, seed + 4) - 0.5) * 46
      const piece = paper(shape(`${side}Blade${i}`, blade(x, 1014, tx, ty, w, bend)), paints[i % 3] ?? 'grass', 2.4)
      const seconds = 5 + hash(i, seed + 5) * 4
      out += moving(i % 2 ? 'sway' : 'swayBack', piece, seconds, hash(i, seed + 6) * seconds, [x, 1012])
    }
  }
  /** A sea-pink: a stem and a round head of three overlapping paper discs. */
  const pink = (i: number, x: number, hy: number) => {
    const stem = paper(shape(`stem${i}`, blade(x, 1014, x + 10, hy, 8, 6)), 'grassDeep', 1.4)
    let head = ''
    const discs: Point[] = [[-7, 2], [7, 3], [0, -6]]
    discs.forEach(([dx, dy], k) => {
      head += paper(shape(`pink${i}_${k}`, facetEllipse(x + 10 + dx, hy - 8 + dy, 11, 10, 9, 60 + i * 3 + k)), 'bloom', 2)
    })
    out += moving('nod', stem + head, 6 + i * 1.5, i * 2, [x, 1012])
  }
  tuft('l', 11, -40, 20, 30, 51)
  pink(0, 70, 808)
  pink(1, 132, 850)
  tuft('r', 8, 1652, -19, -40, 61)
  pink(2, 1572, 818)
  return out
}

function fleckPath(): string {
  let d = ''
  for (let i = 0; i < 26; i += 1) {
    const x = Math.round(hash(i, 41) * 168)
    const y = Math.round(hash(i, 42) * 206)
    const angle = hash(i, 43) * Math.PI
    const reach = 2 + hash(i, 44) * 3
    d += `M${x} ${y}l${fixed(Math.cos(angle) * reach)} ${fixed(Math.sin(angle) * reach)}l1 1z`
  }
  return d
}

function paintRules(mode: 0 | 1): string {
  return Object.entries(PAINTS).map(([name, values]) => `.${name}{fill:${values[mode]}}`).join('')
}

/** The beam turns like a lens seen from the side: its length is cos(angle), so it passes the viewer, then swings round behind. */
const MOTION =
  `.sweep{transform-origin:${LAMP[0]}px ${LAMP[1]}px;animation:sweep 16s linear infinite}` +
  '.glow{animation:flash 16s linear infinite}' +
  '.spin{animation:spin 90s linear infinite}' +
  '.breathe{animation:breathe 9s ease-in-out infinite alternate}' +
  '.drift{animation:drift 45s ease-in-out infinite alternate}' +
  '.fly{animation:fly 50s linear infinite}' +
  '.glide{animation:glide 5s ease-in-out infinite alternate}' +
  '.flap{animation:flap 1.2s ease-in-out infinite alternate}' +
  '.twinkle{animation:twinkle 4s ease-in-out infinite alternate}' +
  '.swell{animation:swell 14s ease-in-out infinite alternate}' +
  '.swellBob{animation:swellBob 10s ease-in-out infinite alternate}' +
  '.bob{animation:bob 4.5s ease-in-out infinite alternate}' +
  '.sailAcross{animation:sailAcross 70s ease-in-out infinite alternate}' +
  '.cross{animation:cross 140s linear infinite}' +
  '.wave{animation:wave 2.4s ease-in-out infinite alternate}' +
  '.sway{animation:sway 6s ease-in-out infinite alternate}' +
  '.swayBack{animation:swayBack 7s ease-in-out infinite alternate}' +
  '.nod{animation:nod 7s ease-in-out infinite alternate}' +
  '@keyframes sweep{0%{transform:scaleX(1)}10%{transform:scaleX(.81)}20%{transform:scaleX(.31)}25%{transform:scaleX(.02)}' +
  '30%{transform:scaleX(-.31)}40%{transform:scaleX(-.81)}50%{transform:scaleX(-1)}60%{transform:scaleX(-.81)}' +
  '70%{transform:scaleX(-.31)}75%{transform:scaleX(-.02)}80%{transform:scaleX(.31)}90%{transform:scaleX(.81)}100%{transform:scaleX(1)}}' +
  '@keyframes flash{0%,15%{opacity:.45}25%{opacity:1}35%,100%{opacity:.45}}' +
  '@keyframes spin{to{transform:rotate(360deg)}}' +
  '@keyframes breathe{from{transform:scale(.97)}to{transform:scale(1.04)}}' +
  '@keyframes drift{from{transform:translate(-80px,0)}to{transform:translate(80px,-6px)}}' +
  '@keyframes fly{from{transform:translate(260px,30px)}to{transform:translate(-1700px,-40px)}}' +
  '@keyframes glide{from{transform:translateY(-6px) rotate(-4deg)}to{transform:translateY(8px) rotate(4deg)}}' +
  '@keyframes flap{from{transform:scaleY(1)}to{transform:scaleY(-.35)}}' +
  '@keyframes twinkle{from{opacity:.25}to{opacity:1}}' +
  '@keyframes swell{from{transform:translate(-36px,0)}to{transform:translate(36px,3px)}}' +
  '@keyframes swellBob{from{transform:translate(-44px,5px)}to{transform:translate(44px,-6px)}}' +
  '@keyframes bob{from{transform:translateY(5px) rotate(-5deg)}to{transform:translateY(-6px) rotate(5deg)}}' +
  '@keyframes sailAcross{from{transform:translateX(-20px)}to{transform:translateX(70px)}}' +
  '@keyframes cross{from{transform:translateX(-1200px)}to{transform:translateX(900px)}}' +
  '@keyframes wave{from{transform:scaleX(.7) skewY(4deg)}to{transform:scaleX(1.05) skewY(-4deg)}}' +
  '@keyframes sway{from{transform:rotate(-5deg)}to{transform:rotate(5.5deg)}}' +
  '@keyframes swayBack{from{transform:rotate(5deg)}to{transform:rotate(-5deg)}}' +
  '@keyframes nod{from{transform:rotate(-7deg)}to{transform:rotate(6deg)}}'

/** Day or night: the mod picks one from the system's appearance. */
export type Look = 'day' | 'night'

/**
 * One look's stylesheet. Nothing here depends on the color scheme (no prefers-color-scheme block, no light-dark(),
 * no color-scheme property): on Desktop 5.11492.5 any of them held the whole scene still, Paper Garden's too.
 */
function style(look: Look): string {
  const m = look === 'night' ? 1 : 0
  return paintRules(m) + TONES[m] + (look === 'night' ? '.day{display:none}' : '.night{display:none}') +
    MOTION + motionRules.join('') + '@media (prefers-reduced-motion: reduce){*{animation:none!important}}'
}

export function mayakSvg(look: Look = 'day'): string {
  shapes.length = 0
  motionRules.length = 0
  const body = sky() + beam() + sea()
  const defs =
    shapes.map(([id, d]) => `<path id="${id}" d="${d}"/>`).join('') +
    `<linearGradient id="beamFade" gradientUnits="userSpaceOnUse" x1="${LAMP[0]}" y1="0" x2="-160" y2="0">` +
    '<stop offset="0" stop-color="#ffe6a6" stop-opacity=".38"/><stop offset=".45" stop-color="#ffe6a6" stop-opacity=".12"/><stop offset="1" stop-color="#ffe6a6" stop-opacity="0"/></linearGradient>' +
    '<radialGradient id="halo"><stop offset="0" stop-color="#ffe3a0" stop-opacity=".9"/><stop offset=".3" stop-color="#ffd98a" stop-opacity=".4"/><stop offset="1" stop-color="#ffd98a" stop-opacity="0"/></radialGradient>' +
    '<radialGradient id="mist"><stop offset="0" class="mistStop" stop-opacity=".82"/><stop offset=".55" class="mistStop" stop-opacity=".62"/><stop offset="1" class="mistStop" stop-opacity="0"/></radialGradient>' +
    `<pattern id="flecks" width="173" height="211" patternUnits="userSpaceOnUse"><path class="fleck" opacity="0.09" d="${fleckPath()}"/></pattern>`
  return (
    // The root carries its own font-family and color: the desktop app writes its current ink into a root that lacks them,
    // so the source changes whenever the ink does and the frame reloads, restarting every animation (Desktop 5.11492.5).
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" width="100%" height="100%" preserveAspectRatio="xMaxYMid slice" font-family="system-ui" color="#888">' +
    `<style>${style(look)}</style><defs>${defs}</defs>` +
    '<rect x="-200" width="2000" height="1000" class="ground"/><rect x="-200" width="2000" height="1000" fill="url(#flecks)"/>' +
    body +
    '</svg>'
  )
}
