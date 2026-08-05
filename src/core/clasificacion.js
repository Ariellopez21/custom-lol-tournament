/**
 * core/clasificacion.js — Todo lo DERIVADO de una tabla de puntuación (Fase 3.5).
 *
 * Decisión de diseño: la tabla NO se guarda. Se CALCULA a partir de la lista de
 * duelos terminados. Así hay una sola fuente de verdad (los resultados) y nunca
 * se desincroniza. Funciones puras, sin estado ni framework.
 *
 * Un duelo terminado con `ganador: null` = EMPATE.
 */

/** @typedef {{ tipo: 'V'|'D'|'E'|null, n: number }} Racha */

/**
 * @typedef {Object} Fila
 * @property {string} participanteId
 * @property {number} pj
 * @property {number} pg
 * @property {number} pe
 * @property {number} pp
 * @property {number} gf
 * @property {number} gc
 * @property {number} difGames
 * @property {number} pts
 * @property {Racha} racha
 * @property {number} mejorRachaV
 * @property {boolean} invicto
 * @property {number} [pos]
 */

/** @typedef {{ participantes: string[], marcador?: { a: number, b: number }, ganador: string|null }} DueloLite */

/** Clave estable de un enfrentamiento, sin importar el orden. */
function clavePar(a, b) {
  return [a, b].sort().join('|')
}

/**
 * Fila vacía de la tabla para un participante.
 * @param {string} id
 * @returns {Fila}
 */
function filaVacia(id) {
  return {
    participanteId: id,
    pj: 0, pg: 0, pe: 0, pp: 0,
    gf: 0, gc: 0, difGames: 0,
    pts: 0,
    racha: { tipo: null, n: 0 }, // tipo: 'V' | 'D' | 'E'
    mejorRachaV: 0,
    invicto: false,
  }
}

/**
 * Actualiza la racha de una fila al añadir un resultado.
 * @param {Fila} fila
 * @param {'V'|'D'|'E'} tipo
 */
function empujarRacha(fila, tipo) {
  fila.racha = fila.racha.tipo === tipo ? { tipo, n: fila.racha.n + 1 } : { tipo, n: 1 }
  if (tipo === 'V') fila.mejorRachaV = Math.max(fila.mejorRachaV, fila.racha.n)
}

/**
 * Head-to-head entre dos participantes: victorias de cada uno.
 * @param {DueloLite[]} duelos
 * @param {string} aId
 * @param {string} bId
 * @returns {{ a: number, b: number }}
 */
export function headToHead(duelos, aId, bId) {
  let a = 0, b = 0
  for (const d of duelos) {
    const [x, y] = d.participantes
    const esEste = (x === aId && y === bId) || (x === bId && y === aId)
    if (!esEste) continue
    if (d.ganador === aId) a++
    else if (d.ganador === bId) b++
  }
  return { a, b }
}

/**
 * Comparador de desempate: puntos → H2H → dif. de games → menos PJ → id.
 * @param {Fila} a
 * @param {Fila} b
 * @param {DueloLite[]} duelos
 */
function comparar(a, b, duelos) {
  if (b.pts !== a.pts) return b.pts - a.pts
  const h = headToHead(duelos, a.participanteId, b.participanteId)
  if (h.a !== h.b) return h.b - h.a
  if (b.difGames !== a.difGames) return b.difGames - a.difGames
  if (a.pj !== b.pj) return a.pj - b.pj
  return String(a.participanteId).localeCompare(String(b.participanteId))
}

/**
 * Clasificación completa a partir de los duelos (en orden cronológico).
 * @param {string[]} ids  participantes de la etapa
 * @param {DueloLite[]} duelos  duelos TERMINADOS, cronológicos
 * @param {{victoria:number, empate:number, derrota:number}} puntos
 * @returns {Fila[]} filas ordenadas, con `pos` (1..n)
 */
export function clasificar(ids, duelos, puntos) {
  const filas = new Map(ids.map((id) => [id, filaVacia(id)]))

  for (const d of duelos) {
    const [aId, bId] = d.participantes
    const fa = filas.get(aId)
    const fb = filas.get(bId)
    if (!fa || !fb) continue

    const ga = d.marcador?.a ?? 0
    const gb = d.marcador?.b ?? 0
    fa.pj++; fb.pj++
    fa.gf += ga; fa.gc += gb
    fb.gf += gb; fb.gc += ga

    if (d.ganador === aId) {
      fa.pg++; fb.pp++
      empujarRacha(fa, 'V'); empujarRacha(fb, 'D')
    } else if (d.ganador === bId) {
      fb.pg++; fa.pp++
      empujarRacha(fb, 'V'); empujarRacha(fa, 'D')
    } else {
      fa.pe++; fb.pe++
      empujarRacha(fa, 'E'); empujarRacha(fb, 'E')
    }
  }

  for (const f of filas.values()) {
    f.difGames = f.gf - f.gc
    f.pts = f.pg * puntos.victoria + f.pe * puntos.empate + f.pp * puntos.derrota
    f.invicto = f.pj > 0 && f.pp === 0
  }

  const arr = [...filas.values()].sort((a, b) => comparar(a, b, duelos))
  arr.forEach((f, i) => (f.pos = i + 1))
  return arr
}

/**
 * Cuántas veces cambió el líder (#1) a lo largo del torneo. Dato de espectáculo.
 * @param {string[]} ids
 * @param {DueloLite[]} duelos
 * @param {{victoria:number, empate:number, derrota:number}} puntos
 * @returns {{ cambios:number, lider:string|null }}
 */
export function cambiosDeLiderato(ids, duelos, puntos) {
  let lider = null
  let cambios = 0
  for (let i = 1; i <= duelos.length; i++) {
    const arr = clasificar(ids, duelos.slice(0, i), puntos)
    const top = arr[0]
    if (!top || top.pj === 0) continue
    if (top.participanteId !== lider) {
      if (lider !== null) cambios++
      lider = top.participanteId
    }
  }
  return { cambios, lider }
}

/**
 * La rivalidad más jugosa: quién le ha ganado más veces a quién (≥2).
 * @param {DueloLite[]} duelos
 * @returns {{ verdugo:string, victima:string, n:number } | null}
 */
export function nemesis(duelos) {
  const conteo = new Map()
  for (const d of duelos) {
    if (!d.ganador) continue
    const perdedor = d.participantes.find((p) => p !== d.ganador)
    if (!perdedor) continue
    const k = `${d.ganador}>${perdedor}`
    conteo.set(k, (conteo.get(k) || 0) + 1)
  }
  let mejor = null
  for (const [k, n] of conteo) {
    if (!mejor || n > mejor.n) {
      const [verdugo, victima] = k.split('>')
      mejor = { verdugo, victima, n }
    }
  }
  return mejor && mejor.n >= 2 ? mejor : null
}

/**
 * Emparejamiento con "azar inteligente": prioriza a quienes menos han jugado y
 * menos se han enfrentado, y evita la revancha inmediata.
 * @param {string[]} ids
 * @param {DueloLite[]} duelos
 * @returns {{ a: string, b: string } | null}
 */
export function elegirCombatePar(ids, duelos) {
  if (!ids || ids.length < 2) return null

  const pj = Object.fromEntries(ids.map((id) => [id, 0]))
  const enc = new Map()
  for (const d of duelos) {
    const [a, b] = d.participantes
    if (pj[a] !== undefined) pj[a]++
    if (pj[b] !== undefined) pj[b]++
    const k = clavePar(a, b)
    enc.set(k, (enc.get(k) || 0) + 1)
  }
  const ultima = duelos.length ? clavePar(...duelos[duelos.length - 1].participantes) : null

  const pares = []
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const a = ids[i]
      const b = ids[j]
      const k = clavePar(a, b)
      pares.push({ a, b, k, enc: enc.get(k) || 0, carga: pj[a] + pj[b] })
    }
  }

  let cand = pares
  if (cand.length > 1 && ultima) {
    const sinRevancha = cand.filter((p) => p.k !== ultima)
    if (sinRevancha.length) cand = sinRevancha
  }
  const minEnc = Math.min(...cand.map((p) => p.enc))
  cand = cand.filter((p) => p.enc === minEnc)
  const minCarga = Math.min(...cand.map((p) => p.carga))
  cand = cand.filter((p) => p.carga === minCarga)

  const elegido = cand[Math.floor(Math.random() * cand.length)]
  // Orden aleatorio de los lados (para el VS).
  return Math.random() < 0.5 ? { a: elegido.a, b: elegido.b } : { a: elegido.b, b: elegido.a }
}
