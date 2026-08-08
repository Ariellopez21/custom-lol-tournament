/**
 * core/estadisticas.js — Estadísticas DERIVADAS de una lista de duelos (Fase 4.3).
 *
 * Misma filosofía que clasificacion.js: nada se guarda, todo se CALCULA a partir
 * de los resultados (única fuente de verdad). Funciones puras, sin estado ni
 * framework, reutilizables por torneo (TorneoDetalle) o por temporada
 * (TemporadaDetalle) y por la tarjeta resumen (4.4a).
 *
 * Reutiliza los primitivos de clasificacion.js (`clasificar`, `nemesis`) y añade
 * lo que falta para 4.3: winrate, uso de campeones y los "destacados" jugosos
 * (mejor racha, invicto, one-trick, némesis, campeón más jugado…).
 */

import { clasificar, nemesis } from './clasificacion.js'

// Puntuación neutra para agregar entre torneos con reglas distintas: aquí sólo
// nos interesan pj/pg/pe/pp, la mejor racha y el invicto (independientes de los
// puntos), no una tabla de liga. La usamos para ordenar la clasificación resumida.
const PUNTOS_NEUTRO = { victoria: 3, empate: 1, derrota: 0 }

/** Ids únicos que aparecen como participantes en los duelos. */
function idsDeDuelos(/** @type {any[]} */ duelos) {
  const set = new Set()
  for (const d of duelos) for (const p of d.participantes ?? []) if (p) set.add(p)
  return [...set]
}

/**
 * Cuenta cuántas veces jugó cada jugador cada campeón (de `duelo.games`, 1.10).
 * El campeón del lado `a` es de `participantes[0]`; el del lado `b`, de `[1]`.
 * @returns {{ global: Map<string,number>, porJugador: Map<string, Map<string,number>>, totalGames: number }}
 */
function usoCampeones(/** @type {any[]} */ duelos) {
  const global = new Map()
  const porJugador = new Map()
  let totalGames = 0

  const suma = (mapa, clave, n = 1) => mapa.set(clave, (mapa.get(clave) || 0) + n)
  const sumaJugador = (jid, cid) => {
    if (!porJugador.has(jid)) porJugador.set(jid, new Map())
    suma(porJugador.get(jid), cid)
    suma(global, cid)
  }

  for (const d of duelos) {
    const [aId, bId] = d.participantes ?? []
    for (const g of d.games ?? []) {
      const ca = g?.campeones?.a
      const cb = g?.campeones?.b
      if (ca && aId) sumaJugador(aId, ca)
      if (cb && bId) sumaJugador(bId, cb)
      if (ca || cb) totalGames++
    }
  }
  return { global, porJugador, totalGames }
}

/** El máximo de un Map<clave,n> como { id, n } (o null si está vacío). */
function maxDe(/** @type {Map<string,number>} */ mapa) {
  let mejor = null
  for (const [id, n] of mapa) if (!mejor || n > mejor.n) mejor = { id, n }
  return mejor
}

/**
 * Resumen estadístico completo de una lista de duelos terminados.
 * @param {any[]} duelos  duelos TERMINADOS (en cualquier orden; se ordenan aquí)
 * @param {string[]} [idsExtra]  participantes a incluir aunque no hayan jugado
 * @returns {{
 *   filas: any[],
 *   totales: { duelos:number, games:number, jugadores:number },
 *   uso: { global: Map<string,number>, porJugador: Map<string, Map<string,number>> },
 *   destacados: Record<string, any>,
 *   duelos: any[],
 * }}
 */
export function resumenEstadisticas(duelos = [], idsExtra = []) {
  // Cronológico ascendente: las rachas de clasificar() dependen del orden.
  const cronologicos = [...duelos].sort((a, b) => (a.jugadoEn ?? '').localeCompare(b.jugadoEn ?? ''))
  const ids = [...new Set([...idsDeDuelos(cronologicos), ...idsExtra])]

  const base = clasificar(ids, cronologicos, PUNTOS_NEUTRO)
  const uso = usoCampeones(cronologicos)

  // Campeón top de cada jugador (para la tabla) + winrate.
  const campeonTopDe = (/** @type {string} */ jid) => maxDe(uso.porJugador.get(jid) ?? new Map())
  const filas = base.map((f) => ({
    ...f,
    winrate: f.pj > 0 ? f.pg / f.pj : 0,
    campeonTop: campeonTopDe(f.participanteId),
  }))
  // Sólo quienes jugaron algo salen en la tabla (los 0 partidos estorban).
  const conJuego = filas.filter((f) => f.pj > 0)

  // ── Destacados (todos con guardas: pueden faltar si hay pocos datos) ──
  const nMin = Math.min(3, Math.max(...conJuego.map((f) => f.pj), 0)) // umbral winrate

  const porMax = (arr, sel, minN = 1) => {
    let mejor = null
    for (const f of arr) {
      const n = sel(f)
      if (n >= minN && (!mejor || n > mejor.n)) mejor = { id: f.participanteId, n, fila: f }
    }
    return mejor
  }

  const masVictorias = porMax(conJuego, (f) => f.pg, 1)
  const masDerrotas = porMax(conJuego, (f) => f.pp, 1)
  const mejorRacha = porMax(conJuego, (f) => f.mejorRachaV, 2)

  const invictos = conJuego
    .filter((f) => f.invicto && f.pg >= 1)
    .sort((a, b) => b.pg - a.pg || b.pj - a.pj)

  const elegibles = conJuego.filter((f) => f.pj >= nMin && f.pj > 0)
  let mejorWinrate = null
  for (const f of elegibles) {
    if (!mejorWinrate || f.winrate > mejorWinrate.winrate || (f.winrate === mejorWinrate.winrate && f.pj > mejorWinrate.pj)) {
      mejorWinrate = { id: f.participanteId, winrate: f.winrate, pj: f.pj, pg: f.pg }
    }
  }

  const campeonMasJugado = maxDe(uso.global)

  // One-trick: la mayor cantidad de veces que alguien repitió un mismo campeón.
  let oneTrick = null
  for (const [jid, mapa] of uso.porJugador) {
    const top = maxDe(mapa)
    if (top && top.n >= 2 && (!oneTrick || top.n > oneTrick.n)) {
      oneTrick = { jugador: jid, campeon: top.id, n: top.n }
    }
  }

  const nem = nemesis(cronologicos)

  return {
    filas: conJuego,
    totales: {
      duelos: cronologicos.length,
      games: uso.totalGames,
      jugadores: conJuego.length,
    },
    uso: { global: uso.global, porJugador: uso.porJugador },
    destacados: {
      masVictorias,
      masDerrotas,
      mejorRacha,
      invictos,
      mejorWinrate,
      campeonMasJugado,
      oneTrick,
      nemesis: nem, // { verdugo, victima, n } | null
    },
    duelos: cronologicos,
  }
}

/** Top-N campeones (globales) como [{ id, n }], de más a menos jugado. */
export function campeonesRanking(/** @type {Map<string,number>} */ global, n = 8) {
  return [...global.entries()]
    .map(([id, veces]) => ({ id, n: veces }))
    .sort((a, b) => b.n - a.n || a.id.localeCompare(b.id))
    .slice(0, n)
}
