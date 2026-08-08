/**
 * ui/overlay.svelte.js — Estado del "modo Overlay/OBS" (Fase 1.12).
 *
 * Al activarlo, la app se despoja de su cromo (barra, pie, contenido) y el
 * combate por ruleta queda solo, sobre un fondo transparente (para OBS Browser
 * Source, que respeta el alfa) o de color chroma (verde/magenta/negro, para
 * capturas de ventana con chroma key). El streamer opera la MISMA ventana.
 */
export const overlay = $state({
  activo: false,
  /** 'transparente' | 'verde' | 'magenta' | 'negro' */
  fondo: 'transparente',
})

/** Entra en modo overlay (opcionalmente fija el fondo). */
export function entrarOverlay(fondo) {
  if (fondo) overlay.fondo = fondo
  overlay.activo = true
}

/** Sale del modo overlay. */
export function salirOverlay() {
  overlay.activo = false
}

/** Cambia el color de fondo del overlay. */
export function setFondoOverlay(fondo) {
  overlay.fondo = fondo
}
