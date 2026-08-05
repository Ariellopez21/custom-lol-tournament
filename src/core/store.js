/**
 * core/store.js — La "memoria": persistencia local versionada.
 *
 * Todo el estado de la app vive como UN solo objeto JSON bajo una clave de
 * localStorage. Ventajas: el respaldo/restauración (core/export.js) es trivial
 * y las migraciones de esquema se concentran en un único punto.
 *
 * Agnóstico del framework a propósito (core/ = datos). El puente reactivo con
 * Svelte se añadirá cuando la UI lo necesite.
 *
 * Para subir el esquema en el futuro:
 *   1. incrementa SCHEMA_VERSION,
 *   2. añade la migración vN -> vN+1 en MIGRACIONES,
 *   3. (si añades una colección nueva) ponla también en estadoInicial().
 */

/** Clave única en localStorage. Prefijo `clt` = custom-lol-tournament. */
export const STORAGE_KEY = 'clt:estado'

/** Versión actual del esquema de datos. */
export const SCHEMA_VERSION = 1

/** Estado vacío por defecto. La forma canónica de "la memoria". */
export function estadoInicial() {
  return {
    version: SCHEMA_VERSION,
    participantes: [], // Participante[]
    reglas: [], // presets de Reglas
    duelos: [], // Duelo[] (historial de combates)
    torneos: [], // Torneo[]
    temporadas: [], // Temporada[]
    ajustes: {
      sonido: true, // combate con audio (fase 1.12)
    },
  }
}

/**
 * Migraciones de esquema. `MIGRACIONES[n]` transforma un estado de la versión
 * `n` a la `n+1`. Hoy no hay ninguna (estamos en v1); se irán añadiendo.
 * @type {Record<number, (estado: any) => any>}
 */
const MIGRACIONES = {
  // 1: (estado) => ({ ...estado, /* cambios v1 -> v2 */ }),
}

/** localStorage de forma segura (puede no existir o estar bloqueado). */
function almacen() {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null
  } catch {
    return null
  }
}

/**
 * Lleva unos datos cualesquiera al esquema actual: aplica migraciones paso a
 * paso y reconcilia con los valores por defecto (para que aparezcan colecciones
 * o ajustes nuevos aunque el respaldo sea viejo).
 * @param {any} datos
 */
export function migrar(datos) {
  let estado = datos && typeof datos === 'object' ? datos : {}
  let v = Number(estado.version) || 0

  if (v > SCHEMA_VERSION) {
    console.warn(
      `[store] Estado de una versión más nueva (v${v} > v${SCHEMA_VERSION}); ` +
        'se usa tal cual, puede faltar soporte.'
    )
  }

  while (v < SCHEMA_VERSION) {
    const paso = MIGRACIONES[v]
    if (!paso) break // sin migración definida: reconciliamos con defaults abajo
    estado = paso(estado)
    v++
    estado.version = v
  }

  const base = estadoInicial()
  return {
    ...base,
    ...estado,
    // fusión superficial de ajustes: conserva nuevos defaults + preferencias del usuario
    ajustes: { ...base.ajustes, ...(estado.ajustes || {}) },
    version: SCHEMA_VERSION,
  }
}

/** Carga el estado desde localStorage (migrado). Nunca lanza: ante fallo, estado limpio. */
export function cargar() {
  const ls = almacen()
  if (!ls) return estadoInicial()

  const bruto = ls.getItem(STORAGE_KEY)
  if (!bruto) return estadoInicial()

  try {
    return migrar(JSON.parse(bruto))
  } catch (e) {
    console.warn('[store] Estado corrupto en localStorage; se reinicia.', e)
    return estadoInicial()
  }
}

/**
 * Guarda el estado completo. Devuelve `true` si se persistió.
 * Sella siempre la versión actual.
 * @param {object} estado
 */
export function guardar(estado) {
  const ls = almacen()
  if (!ls) return false

  try {
    ls.setItem(STORAGE_KEY, JSON.stringify({ ...estado, version: SCHEMA_VERSION }))
    return true
  } catch (e) {
    // Típicamente cuota llena (QuotaExceededError).
    console.error('[store] No se pudo guardar (¿almacenamiento lleno?).', e)
    return false
  }
}

/** Borra el estado persistido y devuelve uno limpio. */
export function reiniciar() {
  const ls = almacen()
  try {
    ls?.removeItem(STORAGE_KEY)
  } catch {
    /* nada que hacer */
  }
  return estadoInicial()
}

/**
 * Notifica cuando el estado cambia en OTRA pestaña (evento `storage`).
 * Útil para mantener sincronizadas varias pestañas. Devuelve una función para
 * cancelar la suscripción.
 * @param {(estado: any) => void} callback
 */
export function alCambiar(callback) {
  if (typeof window === 'undefined') return () => {}
  const manejar = (/** @type {StorageEvent} */ e) => {
    if (e.key === STORAGE_KEY) callback(cargar())
  }
  window.addEventListener('storage', manejar)
  return () => window.removeEventListener('storage', manejar)
}
