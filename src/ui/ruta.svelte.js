/**
 * ui/ruta.svelte.js — Router mínimo por hash (#/seccion).
 *
 * Por qué hash y no rutas "de verdad": la app se sirve como estático en GitHub
 * Pages, sin servidor que reescriba URLs. El hash vive solo en el navegador, así
 * que funciona al refrescar y permite compartir un enlace a una sección.
 *
 * El estado es reactivo (rune $state en un módulo .svelte.js): cualquier
 * componente que lea `ruta.actual` se re-renderiza al navegar.
 */

/** Lee la sección desde el hash actual (p. ej. "#/torneos" -> "torneos"). */
function leerHash() {
  if (typeof location === 'undefined') return 'combate'
  return location.hash.replace(/^#\/?/, '') || 'combate'
}

/** Sección activa. Mutar `ruta.actual` es reactivo en toda la app. */
export const ruta = $state({ actual: leerHash() })

/**
 * Navega a una sección de forma programática.
 * @param {string} id
 */
export function irA(id) {
  location.hash = `#/${id}`
}

// Mantener `ruta.actual` sincronizado con la barra de direcciones.
if (typeof window !== 'undefined') {
  addEventListener('hashchange', () => {
    ruta.actual = leerHash()
  })
}
