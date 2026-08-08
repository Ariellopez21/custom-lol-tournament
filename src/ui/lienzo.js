/**
 * ui/lienzo.js — Utilidades de <canvas> compartidas por las tarjetas PNG
 * (combate/tarjeta.js y temporadas/tarjetaTemporada.js). Sin librerías externas:
 * respeta el ethos open-source/offline y el CSP futuro.
 *
 * Todo lo que se dibuja usa recursos del MISMO origen (los retratos de `champs/`
 * los bundlea Vite), así el canvas no queda "tainted" y `toBlob()` funciona.
 */

/** Paleta del design system (tokens equivalentes a los de app.css). */
export const COL = {
  abismo: '#070b12',
  oro: '#c8aa6e',
  oroClaro: '#f0e6d2',
  arcano: '#0ac8b9',
  sangre: '#c0455c',
  humo: '#7a8aa0',
}

/** Inicial en mayúscula de un nombre (para avatares/fallbacks). */
export const inicial = (/** @type {string} */ n) => (n?.trim()[0] ?? '?').toUpperCase()

/** Carga una imagen; resuelve a null si no hay src o falla (no rompe la tarjeta). */
export function cargarImagen(/** @type {string} */ src) {
  return new Promise((resolve) => {
    if (!src) return resolve(null)
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

/** Rectángulo redondeado (trazado; el caller hace fill/stroke/clip). */
export function rrect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
}

/** Espera a que las fuentes (Cinzel/Barlow) estén listas; si no, cae al sistema. */
export async function fuentesListas() {
  try {
    if (typeof document !== 'undefined' && document.fonts) {
      await Promise.all([
        document.fonts.load('900 64px Cinzel'),
        document.fonts.load('700 34px Cinzel'),
        document.fonts.load('500 20px "Barlow Semi Condensed"'),
      ])
      await document.fonts.ready
    }
  } catch {
    /* fuentes del sistema como respaldo */
  }
}

/**
 * Dibuja un avatar circular: el icono del invocador (`img`) si se pasa, o la
 * inicial `letra` como respaldo. Aro dorado grueso si `destacado`.
 * @param {HTMLImageElement|null} [img]  icono ya cargado (data URL, mismo origen)
 */
export function dibujarAvatar(ctx, cx, cy, r, letra, destacado = false, img = null) {
  if (img) {
    ctx.save()
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.clip()
    ctx.drawImage(img, cx - r, cy - r, r * 2, r * 2)
    ctx.restore()
  } else {
    const g = ctx.createRadialGradient(cx, cy - r * 0.5, r * 0.2, cx, cy, r)
    g.addColorStop(0, 'rgba(200,170,110,0.35)')
    g.addColorStop(1, 'rgba(7,11,18,0.85)')
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.fillStyle = g
    ctx.fill()
    ctx.fillStyle = destacado ? COL.oroClaro : COL.oro
    ctx.font = `800 ${Math.round(r * 0.9)}px Cinzel, serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(letra, cx, cy + 2)
    ctx.textBaseline = 'alphabetic'
  }
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.lineWidth = destacado ? 4 : 2
  ctx.strokeStyle = destacado ? COL.oro : 'rgba(200,170,110,0.4)'
  ctx.stroke()
}

/**
 * Dibuja un retrato cuadrado redondeado con la imagen `img` (o un fallback con
 * la inicial de `alt`). No carga la imagen: recibe el `HTMLImageElement|null` ya
 * resuelto (usa `cargarImagen`). `s` = lado del recuadro.
 */
export function dibujarRetrato(ctx, img, x, y, s, alt = '?', r = 8) {
  ctx.save()
  rrect(ctx, x, y, s, s, r)
  ctx.clip()
  if (img) {
    ctx.drawImage(img, x, y, s, s)
  } else {
    ctx.fillStyle = 'rgba(7,11,18,0.6)'
    ctx.fillRect(x, y, s, s)
    ctx.fillStyle = COL.oro
    ctx.font = `800 ${Math.round(s * 0.4)}px Cinzel, serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(inicial(alt), x + s / 2, y + s / 2)
    ctx.textBaseline = 'alphabetic'
  }
  ctx.restore()
  ctx.lineWidth = 1
  ctx.strokeStyle = 'rgba(200,170,110,0.35)'
  rrect(ctx, x, y, s, s, r)
  ctx.stroke()
}
