/**
 * core/bracket.js — Construcción y consultas de un bracket de eliminación simple
 * (Fase 3.2). Solo potencias de 2 (4/8/16/32/64), **sin byes**. Funciones puras,
 * sin estado ni framework.
 *
 * Estructura (modelo congelado en ROADMAP):
 *   bracket = { rondas: [ { n, nombre, llaves: [Llave] } ] }
 *   Llave   = { id, a, b, dueloId, ganador, avanzaA }
 *
 * Siembra: la ronda 1 se arma con `orden` (ids ya barajados o colocados a mano),
 * emparejando de dos en dos → llave 0 = (orden[0], orden[1]), etc. Las rondas
 * siguientes nacen vacías (a/b = null) y se rellenan al avanzar los ganadores,
 * siguiendo el enlace `avanzaA`. Sin empates: en eliminatoria siempre avanza uno.
 */

const POTENCIAS = [4, 8, 16, 32, 64]

/** ¿`n` es un tamaño de bracket válido (potencia de 2, 4..64)? */
export function esTamanoValido(n) {
  return POTENCIAS.includes(n)
}

/** Nombre de una ronda según cuántas llaves tiene. */
export function nombreRonda(nLlaves) {
  /** @type {Record<number, string>} */
  const nombres = {
    1: 'Final',
    2: 'Semifinales',
    4: 'Cuartos de final',
    8: 'Octavos de final',
    16: '16avos de final',
    32: '32avos de final',
  }
  return nombres[nLlaves] ?? `Ronda de ${nLlaves} llaves`
}

/** Id local por defecto (si no se inyecta uno). */
function idPorDefecto(prefijo = 'llave') {
  const uuid = globalThis.crypto?.randomUUID?.()
  return uuid
    ? `${prefijo}_${uuid}`
    : `${prefijo}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
}

/** Entero aleatorio uniforme en [0, max) usando crypto si está disponible. */
function aleatorio(max) {
  const c = globalThis.crypto
  if (c?.getRandomValues && max > 0) {
    // Rechazo para evitar sesgo de módulo.
    const limite = Math.floor(0xffffffff / max) * max
    const buf = new Uint32Array(1)
    let x
    do {
      c.getRandomValues(buf)
      x = buf[0]
    } while (x >= limite)
    return x % max
  }
  return Math.floor(Math.random() * max)
}

/**
 * Baraja una copia del array (Fisher–Yates, azar cripto-uniforme). No muta.
 * @template T
 * @param {T[]} arr
 * @returns {T[]}
 */
export function barajar(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = aleatorio(i + 1)
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** @returns {{ id:string, a:string|null, b:string|null, dueloId:string|null, ganador:string|null, avanzaA:string|null }} */
function llaveNueva(a, b, nuevoId) {
  return { id: nuevoId('llave'), a: a ?? null, b: b ?? null, dueloId: null, ganador: null, avanzaA: null }
}

/**
 * Construye el bracket completo a partir del orden sembrado de la ronda 1.
 * @param {string[]} orden  ids de participantes, longitud potencia de 2 (4..64)
 * @param {(prefijo?:string)=>string} [nuevoId]  fábrica de ids (inyectable)
 * @returns {{ rondas: Array<{ n:number, nombre:string, llaves:any[] }> }}
 */
export function construirBracket(orden, nuevoId = idPorDefecto) {
  const n = orden.length
  if (!esTamanoValido(n)) throw new Error(`Tamaño de bracket inválido: ${n}`)
  const nRondas = Math.log2(n)
  const rondas = []

  // Ronda 1: emparejar el orden de dos en dos.
  const r1 = []
  for (let i = 0; i < n; i += 2) r1.push(llaveNueva(orden[i], orden[i + 1], nuevoId))
  rondas.push({ n: 1, nombre: nombreRonda(r1.length), llaves: r1 })

  // Rondas siguientes: vacías, enlazadas hacia atrás con `avanzaA`.
  let prev = r1
  for (let r = 2; r <= nRondas; r++) {
    const llaves = []
    for (let i = 0; i < prev.length / 2; i++) llaves.push(llaveNueva(null, null, nuevoId))
    // El ganador de la llave `i` cae en la llave `⌊i/2⌋` de la ronda siguiente
    // (lado `a` si i es par, `b` si es impar).
    prev.forEach((ll, i) => (ll.avanzaA = llaves[Math.floor(i / 2)].id))
    rondas.push({ n: r, nombre: nombreRonda(llaves.length), llaves })
    prev = llaves
  }
  return { rondas }
}

/** ¿El bracket ya está sembrado (tiene rondas)? */
export function estaSembrado(bracket) {
  return !!bracket && Array.isArray(bracket.rondas) && bracket.rondas.length > 0
}

/** La llave final (única de la última ronda), o null. */
export function llaveFinal(bracket) {
  const ultima = bracket?.rondas?.[bracket.rondas.length - 1]
  return ultima?.llaves?.[0] ?? null
}

/** Campeón = ganador de la final, o null si aún no se decide. */
export function campeonBracket(bracket) {
  return llaveFinal(bracket)?.ganador ?? null
}

/** ¿Está el bracket completo (la final ya tiene ganador)? */
export function bracketCompleto(bracket) {
  return !!campeonBracket(bracket)
}

/**
 * Localiza una llave por id y devuelve su posición.
 * @returns {{ ri:number, li:number, llave:any } | null}
 */
export function localizarLlave(bracket, llaveId) {
  if (!bracket?.rondas) return null
  for (let ri = 0; ri < bracket.rondas.length; ri++) {
    const li = bracket.rondas[ri].llaves.findIndex((l) => l.id === llaveId)
    if (li !== -1) return { ri, li, llave: bracket.rondas[ri].llaves[li] }
  }
  return null
}

/** Lado del hueco destino al avanzar la llave en índice `li` (par → 'a', impar → 'b'). */
export function ladoDestino(li) {
  return li % 2 === 0 ? 'a' : 'b'
}
