/**
 * ui/ruta.svelte.js — Router mínimo por hash (#/seccion/param).
 *
 * Por qué hash y no rutas "de verdad": la app se sirve como estático en GitHub
 * Pages, sin servidor que reescriba URLs. El hash vive solo en el navegador, así
 * que funciona al refrescar y permite compartir un enlace a una sección.
 *
 * Soporta un segundo segmento opcional (`#/torneos/<id>`) para abrir el detalle
 * de una entidad. El estado es reactivo (rune $state en un módulo .svelte.js):
 * cualquier componente que lea `ruta.seccion` / `ruta.param` se re-renderiza.
 */

/** Parte el hash en { seccion, param }. Ej: "#/torneos/abc" → { torneos, abc }. */
function leerRuta() {
  if (typeof location === 'undefined') return { seccion: 'combate', param: null }
  const bruto = location.hash.replace(/^#\/?/, '')
  const barra = bruto.indexOf('/')
  const seccion = (barra === -1 ? bruto : bruto.slice(0, barra)) || 'combate'
  const param = barra === -1 ? null : bruto.slice(barra + 1) || null
  return { seccion, param }
}

/** Ruta activa. Mutar `ruta.seccion` / `ruta.param` es reactivo en toda la app. */
export const ruta = $state(leerRuta())

/**
 * Navega de forma programática. Acepta "torneos" o "torneos/abc".
 * @param {string} destino
 */
export function irA(destino) {
  location.hash = `#/${destino}`
}

// Mantener `ruta` sincronizada con la barra de direcciones.
if (typeof window !== 'undefined') {
  addEventListener('hashchange', () => {
    const r = leerRuta()
    ruta.seccion = r.seccion
    ruta.param = r.param
  })
}
