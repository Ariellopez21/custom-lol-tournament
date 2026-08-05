/**
 * core/export.js — Respaldo y restauración de TODO el estado a un archivo .json.
 *
 * Local-first: sin backend ni cuentas, la forma de respaldar y compartir una
 * temporada entre amigos es un archivo. El respaldo envuelve el estado con unos
 * metadatos (`formato`, `version`, `exportadoEn`) para poder validarlo al
 * importar y migrarlo si viene de una versión anterior.
 */

import { SCHEMA_VERSION, migrar, guardar } from './store.js'

/** Marca del formato, para reconocer nuestros archivos al importar. */
export const FORMATO = 'custom-lol-tournament'

/**
 * Serializa el estado a un JSON de respaldo (con metadatos), legible e indentado.
 * @param {object} estado
 */
export function serializar(estado) {
  return JSON.stringify(
    {
      formato: FORMATO,
      version: SCHEMA_VERSION,
      exportadoEn: new Date().toISOString(),
      estado,
    },
    null,
    2
  )
}

/**
 * Interpreta el texto de un respaldo y devuelve el estado (sin migrar).
 * Acepta tanto el envoltorio `{ formato, estado }` como un estado suelto.
 * Lanza un Error con mensaje claro si el archivo no sirve.
 * @param {string} texto
 */
export function deserializar(texto) {
  let paquete
  try {
    paquete = JSON.parse(texto)
  } catch {
    throw new Error('El archivo no es un JSON válido.')
  }

  const estado =
    paquete && paquete.formato === FORMATO && paquete.estado
      ? paquete.estado
      : paquete

  if (!estado || typeof estado !== 'object' || Array.isArray(estado)) {
    throw new Error('El archivo no contiene un estado reconocible.')
  }

  return estado
}

/** Nombre de archivo sugerido: `clt-respaldo-AAAA-MM-DD.json`. */
export function nombreSugerido() {
  const fecha = new Date().toISOString().slice(0, 10)
  return `clt-respaldo-${fecha}.json`
}

/**
 * Dispara la descarga del estado como archivo .json (solo navegador).
 * @param {object} estado
 * @param {string} [nombre]
 */
export function exportarArchivo(estado, nombre = nombreSugerido()) {
  if (typeof document === 'undefined') {
    throw new Error('exportarArchivo solo funciona en el navegador.')
  }

  const blob = new Blob([serializar(estado)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = nombre
  document.body.appendChild(enlace)
  enlace.click()
  enlace.remove()
  URL.revokeObjectURL(url)
}

/**
 * Importa un respaldo desde un texto JSON o un File (input de archivo).
 * Migra el estado al esquema actual y, salvo que se pida lo contrario, lo
 * persiste con store.guardar(). Devuelve el estado ya migrado.
 * @param {string | File | Blob} entrada
 * @param {{ persistir?: boolean }} [opciones]
 */
export async function importar(entrada, { persistir = true } = {}) {
  const texto = typeof entrada === 'string' ? entrada : await entrada.text()
  const estado = migrar(deserializar(texto))
  if (persistir) guardar(estado)
  return estado
}
