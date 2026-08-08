/**
 * temporadas/tarjetaTemporada.js — Tarjeta resumen de una TEMPORADA (Fase 4.4a),
 * exportable como PNG para compartir (el "wrapped" de la temporada). Misma técnica
 * que combate/tarjeta.js: <canvas> nativo, sin librerías, retratos del mismo
 * origen (champs/) para que toBlob() funcione.
 *
 * No calcula nada: recibe el `resumen` ya hecho por core/estadisticas.js y lo
 * dibuja. Los nombres de jugador se resuelven contra el estado en vivo.
 */
import { estado } from '../core/estado.svelte.js'
import { getChampion } from '../core/champions.js'
import { COL, inicial, cargarImagen, rrect, fuentesListas, dibujarAvatar, dibujarRetrato } from '../ui/lienzo.js'

const nombreDe = (/** @type {string} */ id) =>
  estado.participantes.find((p) => p.id === id)?.nombre ?? '—'
const avatarDe = (/** @type {string} */ id) =>
  estado.participantes.find((p) => p.id === id)?.avatar || ''

const MEDALLAS = ['🥇', '🥈', '🥉']

function fechaCorta(/** @type {string} */ iso) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
  } catch {
    return ''
  }
}

/** Recorta un texto a `max` px añadiendo elipsis (usa la fuente ya fijada en ctx). */
function truncar(ctx, txt, max) {
  if (ctx.measureText(txt).width <= max) return txt
  let t = txt
  while (t.length > 1 && ctx.measureText(t + '…').width > max) t = t.slice(0, -1)
  return t + '…'
}

/**
 * Construye el canvas de la tarjeta resumen de la temporada.
 * @param {{ temporada:any, resumen:any, nTorneos?:number }} datos
 * @returns {Promise<HTMLCanvasElement>}
 */
export async function generarTarjetaTemporada({ temporada, resumen, nTorneos = 0 } = {}) {
  await fuentesListas()

  const W = 1200
  const H = 675
  const S = 2
  const canvas = document.createElement('canvas')
  canvas.width = W * S
  canvas.height = H * S
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas
  ctx.scale(S, S)

  const d = resumen?.destacados ?? {}
  const filas = resumen?.filas ?? []
  const tot = resumen?.totales ?? { duelos: 0, games: 0, jugadores: 0 }

  // Precargar los retratos que se usan (one-trick + campeón estrella).
  const [imgOneTrick, imgCampeon] = await Promise.all([
    cargarImagen(d.oneTrick ? getChampion(d.oneTrick.campeon)?.img : ''),
    cargarImagen(d.campeonMasJugado ? getChampion(d.campeonMasJugado.id)?.img : ''),
  ])

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

  // ── Cabecera ──
  ctx.textAlign = 'center'
  ctx.fillStyle = COL.arcano
  ctx.font = '500 20px "Barlow Semi Condensed", sans-serif'
  ctx.fillText('RESUMEN DE TEMPORADA', W / 2, 62)

  ctx.fillStyle = COL.oroClaro
  ctx.font = '900 46px Cinzel, serif'
  ctx.fillText(truncar(ctx, temporada?.nombre ?? 'Temporada', W - 160), W / 2, 108)

  const rango = `${fechaCorta(temporada?.inicio)} — ${temporada?.fin ? fechaCorta(temporada.fin) : 'en curso'}`
  const conteos = `${nTorneos} torneos · ${tot.duelos} duelos · ${tot.games} games · ${tot.jugadores} jugadores`
  ctx.fillStyle = COL.humo
  ctx.font = '500 15px "Barlow Semi Condensed", sans-serif'
  ctx.fillText(`${rango}   ·   ${conteos}`, W / 2, 138)

  // Línea divisoria
  ctx.strokeStyle = 'rgba(200,170,110,0.25)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(60, 162)
  ctx.lineTo(W - 60, 162)
  ctx.stroke()

  // ── Columna izquierda: PODIO ──
  const colX = 70
  ctx.textAlign = 'left'
  ctx.fillStyle = COL.oro
  ctx.font = '700 20px Cinzel, serif'
  ctx.fillText('PODIO', colX, 205)

  const podio = filas.slice(0, 3)
  const avataresPodio = await Promise.all(podio.map((f) => cargarImagen(avatarDe(f.participanteId))))
  let py = 250
  if (podio.length === 0) {
    ctx.fillStyle = COL.humo
    ctx.font = '500 16px "Barlow Semi Condensed", sans-serif'
    ctx.fillText('Sin combates registrados.', colX, py)
  }
  for (let i = 0; i < podio.length; i++) {
    const f = podio[i]
    const nombre = nombreDe(f.participanteId)
    const cy = py + i * 118
    // Medalla
    ctx.textAlign = 'left'
    ctx.font = '34px serif'
    ctx.fillText(MEDALLAS[i], colX, cy + 12)
    // Avatar
    dibujarAvatar(ctx, colX + 78, cy, 34, inicial(nombre), i === 0, avataresPodio[i])
    // Nombre
    ctx.textAlign = 'left'
    ctx.fillStyle = i === 0 ? COL.oroClaro : COL.oro
    ctx.font = '700 27px Cinzel, serif'
    ctx.fillText(truncar(ctx, nombre, 320), colX + 122, cy - 4)
    // Récord
    const wr = Math.round((f.winrate ?? 0) * 100)
    ctx.fillStyle = COL.humo
    ctx.font = '500 15px "Barlow Semi Condensed", sans-serif'
    ctx.fillText(`${f.pg}V · ${f.pe}E · ${f.pp}D  ·  ${wr}% WR`, colX + 122, cy + 20)
  }

  // ── Columna derecha: DESTACADOS ──
  const dx = 650
  const dw = W - 60 - dx
  ctx.textAlign = 'left'
  ctx.fillStyle = COL.oro
  ctx.font = '700 20px Cinzel, serif'
  ctx.fillText('DESTACADOS', dx, 205)

  /** Cada destacado presente se apila en una tarjetita. */
  const items = []
  if (d.mejorRacha)
    items.push({ ico: '🔥', lbl: 'Mejor racha', val: nombreDe(d.mejorRacha.id), sub: `${d.mejorRacha.n} victorias seguidas` })
  if (d.invictos?.length)
    items.push({ ico: '🛡️', lbl: 'Invicto', val: nombreDe(d.invictos[0].participanteId), sub: `${d.invictos[0].pg}-0 · sin perder` })
  if (d.oneTrick)
    items.push({
      ico: '🎯', lbl: 'One-trick', val: nombreDe(d.oneTrick.jugador),
      sub: `${getChampion(d.oneTrick.campeon)?.nombre ?? d.oneTrick.campeon} · ${d.oneTrick.n} veces`, img: imgOneTrick, alt: d.oneTrick.campeon,
    })
  if (d.nemesis)
    items.push({ ico: '😈', lbl: 'Némesis', val: nombreDe(d.nemesis.verdugo), sub: `le ganó ${d.nemesis.n}× a ${nombreDe(d.nemesis.victima)}` })
  if (d.campeonMasJugado)
    items.push({
      ico: '⭐', lbl: 'Campeón estrella', val: getChampion(d.campeonMasJugado.id)?.nombre ?? d.campeonMasJugado.id,
      sub: `jugado ${d.campeonMasJugado.n} veces`, img: imgCampeon, alt: d.campeonMasJugado.id,
    })

  const filaAlto = 76
  const maxItems = 5
  let iy = 230
  for (const it of items.slice(0, maxItems)) {
    ctx.fillStyle = 'rgba(7,11,18,0.45)'
    rrect(ctx, dx, iy, dw, filaAlto - 12, 6)
    ctx.fill()
    ctx.strokeStyle = 'rgba(200,170,110,0.2)'
    ctx.lineWidth = 1
    rrect(ctx, dx, iy, dw, filaAlto - 12, 6)
    ctx.stroke()

    const pad = 14
    let tx = dx + pad
    // Icono
    ctx.textAlign = 'left'
    ctx.font = '22px serif'
    ctx.fillStyle = COL.oroClaro
    ctx.fillText(it.ico, tx, iy + 40)
    tx += 38
    // Retrato opcional
    if (it.img !== undefined) {
      dibujarRetrato(ctx, it.img, tx, iy + 12, 40, it.alt ?? '?', 6)
      tx += 52
    }
    // Etiqueta + valor + sub
    ctx.fillStyle = COL.humo
    ctx.font = '500 12px "Barlow Semi Condensed", sans-serif'
    ctx.fillText(it.lbl.toUpperCase(), tx, iy + 20)
    const anchoTexto = dx + dw - pad - tx
    ctx.fillStyle = COL.oro
    ctx.font = '700 20px Cinzel, serif'
    ctx.fillText(truncar(ctx, it.val, anchoTexto), tx, iy + 42)
    ctx.fillStyle = COL.humo
    ctx.font = '500 13px "Barlow Semi Condensed", sans-serif'
    ctx.fillText(truncar(ctx, it.sub, anchoTexto), tx, iy + 58)

    iy += filaAlto
  }

  // ── Pie ──
  ctx.textAlign = 'center'
  ctx.fillStyle = 'rgba(122,138,160,0.6)'
  ctx.font = '500 15px "Barlow Semi Condensed", sans-serif'
  ctx.fillText('⚔  Custom LoL Tournament  ·  local-first  ·  open-source', W / 2, H - 34)

  return canvas
}

/** Genera la tarjeta de temporada y dispara la descarga del PNG. */
export async function descargarTarjetaTemporada(datos = {}) {
  const canvas = await generarTarjetaTemporada(datos)
  const slug = (datos.temporada?.nombre ?? 'temporada').replace(/[^\w-]+/g, '_').slice(0, 40)
  const nombre = `temporada_${slug}.png`
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
