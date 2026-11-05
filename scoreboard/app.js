// The saved score lives in score.json. K and S add points on top until the next reload.
const SOURCE = 'score.json'
const HOLES = 40

// 5 × 7 lamp numerals.
const GLYPHS = {
  0: ['01110', '11011', '11011', '11011', '11011', '11011', '01110'],
  1: ['00110', '01110', '00110', '00110', '00110', '00110', '01111'],
  2: ['01110', '11011', '00011', '00110', '01100', '11000', '11111'],
  3: ['11110', '00011', '00011', '01110', '00011', '00011', '11110'],
  4: ['00110', '01110', '11010', '11010', '11111', '00010', '00010'],
  5: ['11111', '11000', '11110', '00011', '00011', '11011', '01110'],
  6: ['01110', '11000', '11000', '11110', '11011', '11011', '01110'],
  7: ['11111', '00011', '00110', '00110', '01100', '01100', '01100'],
  8: ['01110', '11011', '11011', '01110', '11011', '11011', '01110'],
  9: ['01110', '11011', '11011', '01111', '00011', '00011', '01110'],
}

const stage = document.querySelector('.stage')
const seam = document.querySelector('.seam')
const vs = document.querySelector('.vs')
const rail = document.querySelector('.rail')
const note = document.querySelector('.note')
const dimmer = document.querySelector('.dim')
const corners = {
  player: document.querySelector('.corner.player'),
  opponent: document.querySelector('.corner.opponent'),
}

const pad = (n) => String(n).padStart(2, '0')
const cols = (text) => text.length * 6 - 1

const state = { player: '', opponent: '', log: '', dim: 0 }

function makeDigit() {
  const digit = document.createElement('div')
  digit.className = 'digit'
  for (let i = 0; i < 35; i++) {
    const lamp = document.createElement('i')
    lamp.className = 'lamp'
    lamp.style.setProperty('--col', i % 5)
    digit.append(lamp)
  }
  return digit
}

// A ring of small bulbs round the lamp box. It runs once when a point lands, then holds steady.
function drawMarquee(marquee, width) {
  const across = width + 2
  const down = 8
  const spots = []
  for (let i = 0; i <= across; i++) spots.push([i, 0])
  for (let i = 1; i <= down; i++) spots.push([across, i])
  for (let i = across - 1; i >= 0; i--) spots.push([i, down])
  for (let i = down - 1; i >= 1; i--) spots.push([0, i])
  marquee.replaceChildren(
    ...spots.map(([x, y], i) => {
      const bulb = document.createElement('i')
      bulb.style.setProperty('--x', x)
      bulb.style.setProperty('--y', y)
      bulb.style.setProperty('--i', i)
      return bulb
    }),
  )
}

function drawCorner(corner, value) {
  const text = pad(value)
  const box = corner.querySelector('.box')
  const digits = corner.querySelector('.digits')
  if (digits.children.length !== text.length) {
    while (digits.children.length < text.length) digits.append(makeDigit())
    while (digits.children.length > text.length) digits.lastChild.remove()
    box.style.setProperty('--cols', cols(text))
    drawMarquee(corner.querySelector('.marquee'), cols(text))
  }
  // Lamps stay in place and only switch, so each change fades across the digit.
  ;[...text].forEach((char, d) => {
    const pattern = GLYPHS[char].join('')
    ;[...digits.children[d].children].forEach((lamp, i) => {
      lamp.classList.toggle('on', pattern[i] === '1')
    })
  })
}

function fitNames(unit) {
  const limit = (name) => {
    const range = document.createRange()
    range.selectNodeContents(name)
    const perPixel = range.getBoundingClientRect().width / parseFloat(getComputedStyle(name).fontSize)
    return name.parentNode.clientWidth / perPixel
  }
  // Both names share one size, set by whichever is longest for its box.
  const names = [...document.querySelectorAll('.name')]
  const size = Math.floor(Math.min(unit * 2.5, ...names.map(limit)))
  names.forEach((name) => { name.style.fontSize = `${size}px` })
}

function score() {
  const player = state.log.split('r').length - 1
  return { player, opponent: state.log.length - player }
}

function fit() {
  const { player, opponent } = score()
  const a = cols(pad(player))
  const b = cols(pad(opponent))
  // Same test as the orientation media query in styles.css.
  const tall = innerHeight >= innerWidth
  // Wide: both boxes side by side, so across is both boxes and the vs gap, down is name, box, rail.
  // Tall: boxes stacked, so across is the wider box, down is both corners, the vs gap and the rail.
  const across = tall ? Math.max(a, b) + 3.8 : a + b + 10.5
  const down = tall ? 33.6 : 17.6
  const unit = Math.floor(Math.min((innerWidth * 0.92) / across, (innerHeight * 0.92) / down))
  stage.style.setProperty('--u', `${unit}px`)
  // The seam follows the VS badge: sideways when digit counts differ, or up past the rail when tall.
  stage.style.setProperty('--split', `calc(50% + ${tall ? -1.37 : (a - b) / 2} * var(--u))`)
  fitNames(unit)
}

function draw() {
  const { player, opponent } = score()
  drawCorner(corners.player, player)
  drawCorner(corners.opponent, opponent)
  corners.player.querySelector('.name').textContent = state.player
  corners.opponent.querySelector('.name').textContent = state.opponent
  document.querySelector('#title').textContent = `${state.player} vs ${state.opponent}`
  document.querySelector('#live').textContent = `${state.player} ${player}, ${state.opponent} ${opponent}`
  const shown = state.log.slice(-HOLES)
  ;[...rail.children].forEach((hole, i) => {
    hole.className = shown[i] === 'r' ? 'player' : shown[i] === 'w' ? 'opponent' : ''
  })
  dimmer.style.opacity = state.dim
  fit()
}

function restart(element, apply) {
  element.classList.remove('chase')
  element.removeAttribute('data-knock')
  void element.offsetWidth
  apply()
}

function celebrate(side) {
  const flash = document.createElement('div')
  flash.className = `flash ${side}`
  flash.addEventListener('animationend', () => flash.remove())
  seam.before(flash)
  const marquee = corners[side].querySelector('.marquee')
  restart(marquee, () => marquee.classList.add('chase'))
  restart(vs, () => vs.setAttribute('data-knock', 'true'))
}

async function read() {
  try {
    const response = await fetch(`${SOURCE}?t=${Date.now()}`, { cache: 'no-store' })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const file = await response.json()
    if ([file.player, file.opponent, file.guesses].some((value) => typeof value !== 'string')) {
      throw new Error('player, opponent and guesses must be text')
    }
    Object.assign(state, {
      player: file.player,
      opponent: file.opponent,
      log: file.guesses.toLowerCase().replace(/[^rw]/g, ''),
      dim: Math.min(0.7, Math.max(0, Number(file.dim) || 0)),
    })
    note.hidden = true
    draw()
  } catch (error) {
    note.textContent = `Could not read ${SOURCE}: ${error.message}`
    note.hidden = false
  }
}

// Sounds are generated here, so there are no audio files. A key press lets the browser play them.
let audio

function tone({ type, from, to = from, start, length, level }) {
  const at = audio.currentTime + start
  const oscillator = audio.createOscillator()
  const gain = audio.createGain()
  oscillator.type = type
  oscillator.frequency.setValueAtTime(from, at)
  oscillator.frequency.exponentialRampToValueAtTime(to, at + length)
  gain.gain.setValueAtTime(0.0001, at)
  gain.gain.exponentialRampToValueAtTime(level, at + 0.012)
  gain.gain.exponentialRampToValueAtTime(0.0001, at + length)
  oscillator.connect(gain).connect(audio.destination)
  oscillator.start(at)
  oscillator.stop(at + length)
}

function playPoint(side) {
  audio ??= new AudioContext()
  audio.resume()
  if (side === 'player') {
    // A rising bell.
    tone({ type: 'triangle', from: 784, start: 0, length: 0.22, level: 0.35 })
    tone({ type: 'triangle', from: 1175, start: 0.1, length: 0.5, level: 0.35 })
    tone({ type: 'sine', from: 2350, start: 0.1, length: 0.3, level: 0.08 })
  } else {
    // A falling buzzer.
    tone({ type: 'sawtooth', from: 196, to: 165, start: 0, length: 0.2, level: 0.18 })
    tone({ type: 'sawtooth', from: 147, to: 98, start: 0.2, length: 0.45, level: 0.2 })
  }
}

addEventListener('keydown', (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return
  const key = e.key.toLowerCase()
  if (key !== 'k' && key !== 's') return
  const side = key === 'k' ? 'player' : 'opponent'
  state.log += key === 'k' ? 'r' : 'w'
  draw()
  celebrate(side)
  playPoint(side)
})

let idleTimer
function wake() {
  stage.classList.remove('idle')
  clearTimeout(idleTimer)
  idleTimer = setTimeout(() => stage.classList.add('idle'), 2000)
}

rail.append(...Array.from({ length: HOLES }, () => document.createElement('li')))
addEventListener('resize', fit)
addEventListener('mousemove', wake)
document.fonts?.ready.then(fit)
draw()
wake()
read()
