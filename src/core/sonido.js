/**
 * core/sonido.js — Motor de sonido del combate (Fase 1.11), 100% sintetizado con
 * la Web Audio API. Sin archivos ni licencias: encaja con open-source/local-first
 * y funciona offline (nada que descargar, no pesa en el bundle).
 *
 * El `AudioContext` se crea PEREZOSAMENTE en el primer gesto del usuario (al
 * girar), como exige la política de autoplay de los navegadores.
 *
 * Respeta el ajuste `estado.ajustes.sonido` (toggle de silencio): si está en
 * false, las funciones no suenan.
 *
 * Extensible: si algún día se quieren SFX reales (CC0), basta reemplazar por
 * dentro `giro()`/`revelacion()`/`anotar()` con reproducción de AudioBuffers,
 * sin tocar a quien las llama (DueloRuleta).
 */
import { estado } from './estado.svelte.js'

/** @type {AudioContext | null} */
let ctx = null
/** @type {GainNode | null} */
let master = null

/** Crea (o reanuda) el AudioContext perezosamente. Devuelve null si no hay soporte. */
function motor() {
  const AC = globalThis.AudioContext || /** @type {any} */ (globalThis).webkitAudioContext
  if (!AC) return null
  if (!ctx) {
    ctx = new AC()
    master = ctx.createGain()
    master.gain.value = 0.9
    master.connect(ctx.destination)
  }
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

/** ¿El sonido está activado? (ajuste del usuario; por defecto sí). */
const activo = () => estado.ajustes?.sonido !== false

/**
 * Una "voz": oscilador con envolvente sencilla (attack rápido + caída
 * exponencial). Se auto-limpia al terminar. Las rampas exponenciales nunca tocan
 * 0 (usamos 0.0001) porque la Web Audio lo prohíbe.
 * @param {number} freq   frecuencia en Hz
 * @param {number} t0     instante de inicio (AudioContext time)
 * @param {number} dur    duración en segundos
 */
function voz(freq, t0, dur, { tipo = 'sine', gain = 0.2, glideTo = null, ataque = 0.006 } = {}) {
  if (!ctx || !master) return
  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  osc.type = tipo
  osc.frequency.setValueAtTime(freq, t0)
  if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, t0 + dur)
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(gain, t0 + ataque)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  osc.connect(g).connect(master)
  osc.start(t0)
  osc.stop(t0 + dur + 0.03)
}

/** Un "tic" del tambor: blip corto y agudo. */
function tic(t0, freq) {
  voz(freq, t0, 0.05, { tipo: 'triangle', gain: 0.07, ataque: 0.002 })
}

/**
 * Sonido del giro de la ruleta: una ráfaga de tics que **decelera** (denso al
 * inicio, se van separando hacia el final) para acompañar el frenado del tambor,
 * con el tono cayendo un poco. `durMs` debe coincidir con la duración visual.
 * @param {number} durMs
 */
export function giro(durMs = 5200) {
  if (!activo()) return
  const c = motor()
  if (!c) return
  const t0 = c.currentTime
  const T = durMs / 1000
  const N = Math.max(6, Math.round(durMs / 120)) // ~43 tics en 5.2 s; ~7 en 0.9 s
  for (let i = 0; i < N; i++) {
    const p = i / N
    // p^2.2 = ease-in: los tics arrancan juntos y se separan al final (decelera).
    const when = t0 + T * Math.pow(p, 2.2)
    const freq = 1250 - 520 * p // el tono baja al frenar
    tic(when, freq)
  }
}

/**
 * Fanfarria de revelación: arpegio ascendente + acorde mayor sostenido con
 * brillo. Se dispara al aterrizar el/los campeón(es).
 */
export function revelacion() {
  if (!activo()) return
  const c = motor()
  if (!c) return
  const t0 = c.currentTime + 0.02
  const arpegio = [523.25, 659.25, 783.99, 1046.5] // C5 · E5 · G5 · C6
  arpegio.forEach((f, i) => voz(f, t0 + i * 0.085, 0.5, { tipo: 'triangle', gain: 0.17 }))
  // Acorde final (Do mayor) sostenido + una quinta aguda de brillo.
  const t1 = t0 + arpegio.length * 0.085
  ;[523.25, 659.25, 783.99].forEach((f) => voz(f, t1, 0.95, { tipo: 'triangle', gain: 0.13 }))
  voz(1567.98, t1, 0.8, { tipo: 'sine', gain: 0.07 })
}

/** «Anotar» un campeón en la fila 2: dos notas cortas y positivas (G5 → C6). */
export function anotar() {
  if (!activo()) return
  const c = motor()
  if (!c) return
  const t0 = c.currentTime + 0.01
  voz(783.99, t0, 0.12, { tipo: 'triangle', gain: 0.15 })
  voz(1046.5, t0 + 0.075, 0.16, { tipo: 'triangle', gain: 0.15 })
}

/** Clic sutil de interfaz (opcional). */
export function clic() {
  if (!activo()) return
  const c = motor()
  if (!c) return
  voz(300, c.currentTime, 0.04, { tipo: 'square', gain: 0.045 })
}
