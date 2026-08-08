/**
 * combate/tarjeta.js — Tarjeta de resultado del duelo (Fase 1.13), exportable
 * como imagen PNG para compartir. Se dibuja con el `<canvas>` nativo (sin
 * librerías externas: respeta el ethos open-source/offline y el CSP futuro).
 *
 * Los retratos de `champs/` son del MISMO origen (los bundlea Vite), así que el
 * canvas no queda "tainted" y `toBlob()` funciona. Se usa el estado en vivo del
 * combate (nombres, marcador y campeones jugados), no el duelo persistido —por
 * eso funciona ya, sin esperar a 1.10.
 */
import { estado } from '../core/estado.svelte.js'
import { getChampion } from '../core/champions.js'
import { COL, inicial, cargarImagen, rrect, fuentesListas, dibujarAvatar, dibujarRetrato } from '../ui/lienzo.js'

const nombreDe = (/** @type {string} */ id) =>
  estado.participantes.find((p) => p.id === id)?.nombre ?? '—'
const avatarDe = (/** @type {string} */ id) =>
  estado.participantes.find((p) => p.id === id)?.avatar || ''

/** Dibuja la tira de campeones jugados centrada en `cx`, empezando en `y`. */
async function dibujarTira(ctx, ids, cx, y, lado) {
  const lista = (ids ?? []).slice(0, 6)
  if (!lista.length) return
  const s = 60
  const gap = 10
  const ancho = lista.length * s + (lista.length - 1) * gap
  let x = cx - ancho / 2
  const imgs = await Promise.all(lista.map((id) => cargarImagen(getChampion(id)?.img)))
  for (let i = 0; i < lista.length; i++) {
    dibujarRetrato(ctx, imgs[i], x, y, s, getChampion(lista[i])?.nombre ?? '?', 8)
    x += s + gap
  }
}

/**
 * Construye el canvas de la tarjeta a partir del estado en vivo del combate.
 * @returns {Promise<HTMLCanvasElement>}
 */
export async function generarTarjeta({ a, b, ga = 0, gb = 0, jugadosA = [], jugadosB = [], titulo = '' } = {}) {
  await fuentesListas()

  const W = 1200
  const H = 675
  const S = 2 // supersampling para nitidez
  const canvas = document.createElement('canvas')
  canvas.width = W * S
  canvas.height = H * S
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas
  ctx.scale(S, S)

  // ── Fondo ──
  const fg = ctx.createLinearGradient(0, 0, 0, H)
  fg.addColorStop(0, '#0e1b2e')
  fg.addColorStop(1, COL.abismo)
  ctx.fillStyle = fg
  ctx.fillRect(0, 0, W, H)
  const rg = ctx.createRadialGradient(W / 2, -60, 80, W / 2, H * 0.15, 900)
  rg.addColorStop(0, 'rgba(22,48,74,0.55)')
  rg.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = rg
  ctx.fillRect(0, 0, W, H)

  // Marco dorado
  ctx.strokeStyle = 'rgba(200,170,110,0.5)'
  ctx.lineWidth = 2
  rrect(ctx, 16, 16, W - 32, H - 32, 12)
  ctx.stroke()

  // ── Datos ──
  const nA = nombreDe(a)
  const nB = nombreDe(b)
  const [avA, avB] = await Promise.all([cargarImagen(avatarDe(a)), cargarImagen(avatarDe(b))])
  const ganador = ga > gb ? 'a' : gb > ga ? 'b' : null
  const terminado = ga > 0 || gb > 0

  // ── Cabecera ──
  ctx.textAlign = 'center'
  ctx.fillStyle = COL.arcano
  ctx.font = '500 20px "Barlow Semi Condensed", sans-serif'
  ctx.fillText((titulo || 'Custom LoL Tournament').toUpperCase().slice(0, 60), W / 2, 66)
  ctx.fillStyle = COL.humo
  ctx.font = '500 15px "Barlow Semi Condensed", sans-serif'
  ctx.fillText('RESULTADO DEL DUELO · ARAM 1v1', W / 2, 92)

  // ── Columnas ──
  const colA = 320
  const colB = 880
  const avY = 210
  const avR = 62

  dibujarAvatar(ctx, colA, avY, avR, inicial(nA), ganador === 'a', avA)
  dibujarAvatar(ctx, colB, avY, avR, inicial(nB), ganador === 'b', avB)

  // Coronas / medallas
  ctx.font = '40px serif'
  if (ganador === 'a') ctx.fillText('👑', colA, avY - avR - 18)
  if (ganador === 'b') ctx.fillText('👑', colB, avY - avR - 18)

  // Nombres
  const pintaNombre = (nombre, cx, gana) => {
    ctx.font = '700 34px Cinzel, serif'
    ctx.fillStyle = gana ? COL.oroClaro : ganador ? COL.humo : COL.oroClaro
    const txt = nombre.length > 16 ? nombre.slice(0, 15) + '…' : nombre
    ctx.fillText(txt, cx, avY + avR + 46)
  }
  pintaNombre(nA, colA, ganador === 'a')
  pintaNombre(nB, colB, ganador === 'b')

  // ── Centro: VS + marcador ──
  ctx.fillStyle = COL.sangre
  ctx.font = '900 30px Cinzel, serif'
  ctx.fillText('VS', W / 2, avY - 34)
  ctx.fillStyle = COL.oroClaro
  ctx.font = '900 78px Cinzel, serif'
  ctx.fillText(terminado ? `${ga} : ${gb}` : '—', W / 2, avY + 40)
  if (terminado && !ganador) {
    ctx.fillStyle = COL.arcano
    ctx.font = '600 20px "Barlow Semi Condensed", sans-serif'
    ctx.fillText('EMPATE', W / 2, avY + 74)
  }

  // ── Tiras de campeones jugados ──
  ctx.fillStyle = COL.humo
  ctx.font = '500 15px "Barlow Semi Condensed", sans-serif'
  const tieneChamps = (jugadosA?.length ?? 0) + (jugadosB?.length ?? 0) > 0
  if (tieneChamps) {
    ctx.fillText('CAMPEONES JUGADOS', W / 2, 400)
  }
  const tiraY = 420
  await dibujarTira(ctx, jugadosA, colA, tiraY, 'a')
  await dibujarTira(ctx, jugadosB, colB, tiraY, 'b')

  // ── Pie ──
  ctx.fillStyle = 'rgba(122,138,160,0.6)'
  ctx.font = '500 15px "Barlow Semi Condensed", sans-serif'
  ctx.fillText('⚔  Custom LoL Tournament  ·  local-first  ·  open-source', W / 2, H - 34)

  return canvas
}

/** Genera la tarjeta y dispara la descarga del PNG. */
export async function descargarTarjeta(datos = {}) {
  const canvas = await generarTarjeta(datos)
  const nA = nombreDe(datos.a).replace(/[^\w-]+/g, '_')
  const nB = nombreDe(datos.b).replace(/[^\w-]+/g, '_')
  const nombre = `duelo_${nA}_vs_${nB}.png`
  await new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) return resolve(null)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = nombre
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1500)
      resolve(null)
    }, 'image/png')
  })
}
