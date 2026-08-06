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
import { construirBracket, localizarLlave, ladoDestino } from './bracket.js'

/**
 * @typedef {{ id:string, nombre:string, avatar:string|null, championPool:string[], creadoEn:string }} Participante
 * @typedef {{ resolucion:string, formato:string, mirror:boolean, championPool:boolean, restock:boolean, hechizos:string, runas:string, mapa:string, modo:string, victoria:{ creeps:number, kills:number, torres:number } }} ReglasCombate
 * @typedef {{ id:string, torneoId:string, etapaId:string, participantes:string[], reglas:ReglasCombate, marcador:{ a:number, b:number }, games:any[], ganador:string|null, estado:string, jugadoEn?:string }} Duelo
 * @typedef {{ id:string, nombre:string, tipo:string, estado:string, participantes:string[], duelos:string[], grupos?:any[], bracket?:{ rondas:any[] } }} Etapa
 * @typedef {{ id:string, nombre:string, estado:string, reglas:ReglasCombate, participantes:string[], puntos:{ victoria:number, empate:number, derrota:number }, etapas:Etapa[], campeon:string|null, creadoEn:string, actualizadoEn:string, temporadaId?:string }} Torneo
 * @typedef {{ version:number, participantes:Participante[], reglas:any[], duelos:Duelo[], torneos:Torneo[], temporadas:any[], ajustes:{ sonido:boolean } }} AppEstado
 */

/**
 * Estado reactivo de toda la app (participantes, torneos, duelos, ajustes…).
 * Leerlo dentro de un componente lo suscribe a los cambios.
 * @type {AppEstado}
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

/* ── Torneos (Fase 3) ────────────────────────────────────────── */

/**
 * Reglas de combate por defecto (el "ruleset" que hereda la ruleta).
 * @returns {ReglasCombate}
 */
export function reglasPorDefecto() {
  return {
    resolucion: 'manual', // 3.7 — la ruleta (teatral) llega con la Fase 1
    formato: 'Bo1',
    mirror: true,
    championPool: false,
    restock: false,
    hechizos: 'predefinido',
    runas: 'predefinido',
    mapa: 'ARAM',
    modo: '1v1',
    victoria: { creeps: 100, kills: 1, torres: 1 },
  }
}

/**
 * Puntuación por defecto: victoria 3, empate 1, derrota 0 (empates permitidos).
 * @returns {{ victoria:number, empate:number, derrota:number }}
 */
export function puntosPorDefecto() {
  return { victoria: 3, empate: 1, derrota: 0 }
}

/** @type {Record<string, string>} */
const NOMBRE_ETAPA = {
  tabla: 'Liga',
  grupos: 'Fase de grupos',
  bracket: 'Eliminatoria',
  suizo: 'Suizo',
}

/**
 * Crea un torneo con su primera etapa. La estructura interna (sorteo de grupos,
 * llaves del bracket, la tabla) la llenan los puntos 3.2/3.3/3.5.
 * @param {{ nombre:string, participantes?:string[], sistema?:string,
 *           reglas?:object, puntos?:object }} datos
 * @returns {object|null}
 */
export function crearTorneo({ nombre, participantes = [], sistema = 'tabla', reglas, puntos } = {}) {
  const limpio = (nombre ?? '').trim()
  if (!limpio) return null

  const etapa = /** @type {Etapa} */ ({
    id: nuevoId('etapa'),
    nombre: NOMBRE_ETAPA[sistema] ?? 'Etapa',
    tipo: sistema,
    estado: 'en_curso',
    participantes: [...participantes],
    duelos: [],
    ...(sistema === 'grupos' ? { grupos: [] } : {}),
    ...(sistema === 'bracket' ? { bracket: { rondas: [] } } : {}),
  })

  const ahora = new Date().toISOString()
  const torneo = /** @type {Torneo} */ ({
    id: nuevoId('torneo'),
    nombre: limpio,
    estado: 'en_curso',
    reglas: reglas ?? reglasPorDefecto(),
    participantes: [...participantes],
    puntos: puntos ?? puntosPorDefecto(),
    etapas: [etapa],
    campeon: null,
    creadoEn: ahora,
    actualizadoEn: ahora,
  })
  estado.torneos.push(torneo)
  persistir()
  return torneo
}

/** Borra un torneo y, con él, sus duelos asociados. */
export function borrarTorneo(id) {
  const i = estado.torneos.findIndex((t) => t.id === id)
  if (i === -1) return
  estado.torneos.splice(i, 1)
  estado.duelos = estado.duelos.filter((d) => d.torneoId !== id)
  persistir()
}

/* ── Duelos / resultados (Fase 3.5) ──────────────────────────── */

/**
 * Registra el resultado de un enfrentamiento en una etapa. El ganador se infiere
 * del marcador (empate si van iguales). Devuelve el duelo creado o null.
 * @param {string} torneoId
 * @param {string} etapaId
 * @param {string} aId
 * @param {string} bId
 * @param {{a:number, b:number}} marcador  games ganados por cada lado
 * @param {string|null} [grupoId]  si la etapa es de grupos, el grupo del combate
 */
export function registrarResultado(torneoId, etapaId, aId, bId, marcador, grupoId = null) {
  const torneo = estado.torneos.find((t) => t.id === torneoId)
  if (!torneo) return null
  const etapa = torneo.etapas.find((e) => e.id === etapaId)
  if (!etapa) return null

  const ga = Math.max(0, Math.trunc(marcador?.a ?? 0))
  const gb = Math.max(0, Math.trunc(marcador?.b ?? 0))
  if (ga === 0 && gb === 0) return null // sin resultado que registrar

  const ganador = ga > gb ? aId : gb > ga ? bId : null // null = empate
  const ahora = new Date().toISOString()
  const duelo = /** @type {Duelo} */ ({
    id: nuevoId('duelo'),
    torneoId,
    etapaId,
    participantes: [aId, bId],
    reglas: $state.snapshot(torneo.reglas), // heredadas (copia plana)
    marcador: { a: ga, b: gb },
    games: [], // se llenan si resolucion="ruleta" (Fase 1)
    ganador,
    estado: 'terminado',
    jugadoEn: ahora,
  })
  estado.duelos.push(duelo)
  if (!etapa.duelos.includes(duelo.id)) etapa.duelos.push(duelo.id)
  if (grupoId) {
    const grupo = etapa.grupos?.find((g) => g.id === grupoId)
    if (grupo && !grupo.duelos.includes(duelo.id)) grupo.duelos.push(duelo.id)
  }
  torneo.actualizadoEn = ahora
  persistir()
  return duelo
}

/** Borra un duelo (deshacer un resultado) y lo quita de su etapa (y grupo). */
export function borrarDuelo(id) {
  const i = estado.duelos.findIndex((d) => d.id === id)
  if (i === -1) return
  const [duelo] = estado.duelos.splice(i, 1)
  const torneo = estado.torneos.find((t) => t.id === duelo.torneoId)
  const etapa = torneo?.etapas.find((e) => e.id === duelo.etapaId)
  if (etapa) {
    etapa.duelos = etapa.duelos.filter((x) => x !== id)
    etapa.grupos?.forEach((g) => (g.duelos = g.duelos.filter((x) => x !== id)))
  }
  persistir()
}

/* ── Bracket / eliminatoria (Fase 3.2) ───────────────────────── */

/**
 * Siembra el bracket de una etapa de tipo "bracket" con un orden dado (ids de
 * participantes, longitud potencia de 2). Construye todas las rondas/llaves.
 * @param {string} torneoId
 * @param {string} etapaId
 * @param {string[]} orden
 */
export function sembrarBracket(torneoId, etapaId, orden) {
  const torneo = estado.torneos.find((t) => t.id === torneoId)
  if (!torneo) return
  const etapa = torneo.etapas.find((e) => e.id === etapaId)
  if (!etapa || etapa.tipo !== 'bracket') return
  etapa.bracket = construirBracket(orden, nuevoId)
  torneo.actualizadoEn = new Date().toISOString()
  persistir()
}

/**
 * Vacía el bracket para volver a sembrarlo. Solo permitido si aún no se jugó
 * ningún combate en la etapa (si no, hay que deshacer los resultados antes).
 * @param {string} torneoId
 * @param {string} etapaId
 */
export function limpiarBracket(torneoId, etapaId) {
  const torneo = estado.torneos.find((t) => t.id === torneoId)
  if (!torneo) return
  const etapa = torneo.etapas.find((e) => e.id === etapaId)
  if (!etapa || etapa.tipo !== 'bracket') return
  if (etapa.duelos.length > 0) return // hay combates jugados: no tocar
  etapa.bracket = { rondas: [] }
  torneo.actualizadoEn = new Date().toISOString()
  persistir()
}

/**
 * Resuelve una llave del bracket: crea el duelo, marca al ganador y lo hace
 * avanzar a la ronda siguiente. Sin empates (en eliminatoria siempre avanza uno).
 * @param {string} torneoId
 * @param {string} etapaId
 * @param {string} llaveId
 * @param {{a:number, b:number}} marcador
 */
export function resolverLlave(torneoId, etapaId, llaveId, marcador) {
  const torneo = estado.torneos.find((t) => t.id === torneoId)
  if (!torneo) return null
  const etapa = torneo.etapas.find((e) => e.id === etapaId)
  if (!etapa?.bracket) return null
  const loc = localizarLlave(etapa.bracket, llaveId)
  if (!loc) return null
  const { li, llave } = loc
  if (!llave.a || !llave.b || llave.ganador) return null // faltan rivales o ya resuelta

  const ga = Math.max(0, Math.trunc(marcador?.a ?? 0))
  const gb = Math.max(0, Math.trunc(marcador?.b ?? 0))
  if (ga === gb) return null // sin empates en eliminatoria

  const ganador = ga > gb ? llave.a : llave.b
  const ahora = new Date().toISOString()
  const duelo = /** @type {Duelo} */ ({
    id: nuevoId('duelo'),
    torneoId,
    etapaId,
    participantes: [llave.a, llave.b],
    reglas: $state.snapshot(torneo.reglas),
    marcador: { a: ga, b: gb },
    games: [],
    ganador,
    estado: 'terminado',
    jugadoEn: ahora,
  })
  estado.duelos.push(duelo)
  if (!etapa.duelos.includes(duelo.id)) etapa.duelos.push(duelo.id)
  llave.dueloId = duelo.id
  llave.ganador = ganador

  // Propagar el ganador al hueco correspondiente de la ronda siguiente.
  if (llave.avanzaA) {
    const dest = localizarLlave(etapa.bracket, llave.avanzaA)
    if (dest) dest.llave[ladoDestino(li)] = ganador
  }
  torneo.actualizadoEn = ahora
  persistir()
  return duelo
}

/**
 * Deshace el resultado de una llave (borra su duelo y limpia el hueco propagado).
 * Bloqueado si la llave siguiente ya se jugó: primero hay que deshacer esa.
 * @param {string} torneoId
 * @param {string} etapaId
 * @param {string} llaveId
 */
export function deshacerLlave(torneoId, etapaId, llaveId) {
  const torneo = estado.torneos.find((t) => t.id === torneoId)
  if (!torneo) return
  const etapa = torneo.etapas.find((e) => e.id === etapaId)
  if (!etapa?.bracket) return
  const loc = localizarLlave(etapa.bracket, llaveId)
  if (!loc) return
  const { li, llave } = loc
  if (!llave.ganador) return

  // Si la llave destino ya tiene resultado, no se puede deshacer esta todavía.
  const dest = llave.avanzaA ? localizarLlave(etapa.bracket, llave.avanzaA) : null
  if (dest?.llave.ganador) return

  // Quitar el duelo asociado.
  if (llave.dueloId) {
    const i = estado.duelos.findIndex((d) => d.id === llave.dueloId)
    if (i !== -1) estado.duelos.splice(i, 1)
    etapa.duelos = etapa.duelos.filter((x) => x !== llave.dueloId)
  }
  const ganadorPrevio = llave.ganador
  llave.dueloId = null
  llave.ganador = null

  // Limpiar el hueco propagado en la ronda siguiente.
  if (dest && dest.llave[ladoDestino(li)] === ganadorPrevio) {
    dest.llave[ladoDestino(li)] = null
  }
  torneo.actualizadoEn = new Date().toISOString()
  persistir()
}

/* ── Fase de grupos (Fase 3.3) ───────────────────────────────── */

/**
 * Siembra los grupos de una etapa de tipo "grupos". `grupos` es una lista de
 * `{ nombre?, participantes:[id] }`; aquí se les asigna id y una lista de duelos.
 * @param {string} torneoId
 * @param {string} etapaId
 * @param {{ nombre?:string, participantes:string[] }[]} grupos
 */
export function sembrarGrupos(torneoId, etapaId, grupos) {
  const torneo = estado.torneos.find((t) => t.id === torneoId)
  if (!torneo) return
  const etapa = torneo.etapas.find((e) => e.id === etapaId)
  if (!etapa || etapa.tipo !== 'grupos') return
  etapa.grupos = grupos.map((g, i) => ({
    id: nuevoId('grupo'),
    nombre: g.nombre?.trim() || `Grupo ${String.fromCharCode(65 + i)}`,
    participantes: [...g.participantes],
    duelos: [],
  }))
  torneo.actualizadoEn = new Date().toISOString()
  persistir()
}

/**
 * Vacía los grupos para volver a sortearlos. Solo si aún no se jugó nada.
 * @param {string} torneoId
 * @param {string} etapaId
 */
export function limpiarGrupos(torneoId, etapaId) {
  const torneo = estado.torneos.find((t) => t.id === torneoId)
  if (!torneo) return
  const etapa = torneo.etapas.find((e) => e.id === etapaId)
  if (!etapa || etapa.tipo !== 'grupos') return
  if (etapa.duelos.length > 0) return
  etapa.grupos = []
  torneo.actualizadoEn = new Date().toISOString()
  persistir()
}

/* ── Etapas (Fase 3.3 — multi-etapa) ─────────────────────────── */

/**
 * Cierra una etapa (sin finalizar el torneo). Permite luego abrir otra etapa.
 * @param {string} torneoId
 * @param {string} etapaId
 */
export function finalizarEtapa(torneoId, etapaId) {
  const torneo = estado.torneos.find((t) => t.id === torneoId)
  if (!torneo) return
  const etapa = torneo.etapas.find((e) => e.id === etapaId)
  if (!etapa) return
  etapa.estado = 'finalizada'
  torneo.actualizadoEn = new Date().toISOString()
  persistir()
}

/** Reabre una etapa cerrada (para seguir editando resultados). */
export function reabrirEtapa(torneoId, etapaId) {
  const torneo = estado.torneos.find((t) => t.id === torneoId)
  if (!torneo) return
  const etapa = torneo.etapas.find((e) => e.id === etapaId)
  if (!etapa) return
  etapa.estado = 'en_curso'
  torneo.actualizadoEn = new Date().toISOString()
  persistir()
}

/**
 * Añade una nueva etapa al torneo (avance manual entre etapas: el humano elige
 * quiénes pasan). Devuelve la etapa creada.
 * @param {string} torneoId
 * @param {{ tipo:string, participantes:string[], nombre?:string }} datos
 */
export function agregarEtapa(torneoId, { tipo, participantes, nombre } = {}) {
  const torneo = estado.torneos.find((t) => t.id === torneoId)
  if (!torneo) return null
  const etapa = /** @type {Etapa} */ ({
    id: nuevoId('etapa'),
    nombre: nombre?.trim() || NOMBRE_ETAPA[tipo] || 'Etapa',
    tipo,
    estado: 'en_curso',
    participantes: [...participantes],
    duelos: [],
    ...(tipo === 'grupos' ? { grupos: [] } : {}),
    ...(tipo === 'bracket' ? { bracket: { rondas: [] } } : {}),
  })
  torneo.etapas.push(etapa)
  torneo.actualizadoEn = new Date().toISOString()
  persistir()
  return etapa
}

/**
 * Elimina una etapa del torneo (y sus duelos). No permite borrar la 1ª etapa.
 * @param {string} torneoId
 * @param {string} etapaId
 */
export function borrarEtapa(torneoId, etapaId) {
  const torneo = estado.torneos.find((t) => t.id === torneoId)
  if (!torneo) return
  const i = torneo.etapas.findIndex((e) => e.id === etapaId)
  if (i <= 0) return // no se borra la etapa base
  torneo.etapas.splice(i, 1)
  estado.duelos = estado.duelos.filter((d) => d.etapaId !== etapaId)
  torneo.actualizadoEn = new Date().toISOString()
  persistir()
}

/**
 * Cierra un torneo y fija su campeón.
 * @param {string} id
 * @param {string|null} [campeonId]
 */
export function finalizarTorneo(id, campeonId = null) {
  const torneo = estado.torneos.find((t) => t.id === id)
  if (!torneo) return
  torneo.estado = 'finalizado'
  torneo.campeon = campeonId
  torneo.etapas.forEach((e) => (e.estado = 'finalizada'))
  torneo.actualizadoEn = new Date().toISOString()
  persistir()
}

/** Reabre un torneo finalizado (para seguir jugando o añadir una etapa). */
export function reabrirTorneo(id) {
  const torneo = estado.torneos.find((t) => t.id === id)
  if (!torneo) return
  torneo.estado = 'en_curso'
  torneo.campeon = null
  const ultima = torneo.etapas[torneo.etapas.length - 1]
  if (ultima) ultima.estado = 'en_curso'
  torneo.actualizadoEn = new Date().toISOString()
  persistir()
}
