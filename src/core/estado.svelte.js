/**
 * core/estado.svelte.js — Puente reactivo entre la "memoria" y la UI.
 *
 * `store.js` es agnóstico del framework (cargar/guardar/migrar sobre
 * localStorage). Aquí lo envolvemos en un rune `$state` para que la UI reaccione,
 * y exponemos las operaciones de dominio (CRUD) que mutan el estado y lo
 * persisten al instante.
 *
 * Local-first: cada cambio se guarda de inmediato. No hay "botón de guardar".
 */

import { cargar, guardar } from './store.js'
import { CHAMPION_IDS } from './champions.js'

/**
 * Estado reactivo de toda la app (participantes, torneos, duelos, ajustes…).
 * Leerlo dentro de un componente lo suscribe a los cambios.
 */
export const estado = $state(cargar())

/** Vuelca el estado reactivo a localStorage (snapshot plano, sin los proxies de $state). */
export function persistir() {
  guardar($state.snapshot(estado))
}

/** Id único y estable para entidades nuevas. */
function nuevoId(prefijo = 'id') {
  const uuid = globalThis.crypto?.randomUUID?.()
  return uuid
    ? `${prefijo}_${uuid}`
    : `${prefijo}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
}

/* ── Participantes (Fase 2) ──────────────────────────────────── */

/**
 * Crea un participante y lo persiste.
 * `championPool` vacío = "todos los 173" (ver ROADMAP, modelo de datos).
 * @param {string} nombre
 * @returns {object|null} el participante creado, o `null` si el nombre queda vacío.
 */
export function crearParticipante(nombre) {
  const limpio = (nombre ?? '').trim()
  if (!limpio) return null

  const participante = {
    id: nuevoId('part'),
    nombre: limpio,
    avatar: null, // subida de avatar: más adelante
    championPool: [], // ids de campeones; vacío = todos
    creadoEn: new Date().toISOString(),
  }
  estado.participantes.push(participante)
  persistir()
  return participante
}

/** Renombra un participante. Ignora nombres vacíos. */
export function renombrarParticipante(id, nombre) {
  const limpio = (nombre ?? '').trim()
  if (!limpio) return
  const participante = estado.participantes.find((p) => p.id === id)
  if (participante) {
    participante.nombre = limpio
    persistir()
  }
}

/** Borra un participante por id. */
export function borrarParticipante(id) {
  const i = estado.participantes.findIndex((p) => p.id === id)
  if (i !== -1) {
    estado.participantes.splice(i, 1)
    persistir()
  }
}

/**
 * Define el champion pool de un participante a partir de una lista de ids.
 * Normaliza el caso "todos": si están los 173, se guarda `[]` (canónico "todos",
 * y a prueba de futuros campeones nuevos). Ignora ids repetidos.
 * @param {string} id  id del participante
 * @param {string[]} championIds  ids de campeones seleccionados
 */
export function definirPool(id, championIds) {
  const participante = estado.participantes.find((p) => p.id === id)
  if (!participante) return
  const set = new Set(championIds)
  participante.championPool = set.size >= CHAMPION_IDS.length ? [] : [...set]
  persistir()
}
