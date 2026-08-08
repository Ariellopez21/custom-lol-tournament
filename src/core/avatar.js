/**
 * core/avatar.js — Procesa la imagen que elige el usuario a un icono cuadrado y
 * pequeño (data URL) para guardar en `participante.avatar` (localStorage).
 *
 * Local-first: NO se sube nada a ningún servidor; todo el redimensionado ocurre
 * en el navegador con <canvas>. El icono se guarda como data URL (unos pocos KB)
 * dentro del estado, así viaja con el respaldo JSON (0.7) y sobrevive al refresco.
 */

/** Lado del icono en px. Se muestra más pequeño casi siempre; 128 luce nítido
 *  incluso en pantallas retina o en las tarjetas PNG. */
export const TAM_AVATAR = 128

/**
 * Convierte un `File` de imagen en un data URL cuadrado de `tam`×`tam` px,
 * recortado en modo "cover" (centrado, llena el cuadro sin deformar).
 * @param {File} file
 * @param {number} [tam]
 * @returns {Promise<string>} data URL (WebP si el navegador lo soporta; si no, PNG)
 */
export async function procesarAvatar(file, tam = TAM_AVATAR) {
  if (!file || !file.type?.startsWith('image/')) {
    throw new Error('Elige un archivo de imagen (PNG, JPG o WebP).')
  }
  const img = await cargarDesdeArchivo(file)

  const canvas = document.createElement('canvas')
  canvas.width = tam
  canvas.height = tam
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('No se pudo procesar la imagen.')

  // Recorte "cover": escala para llenar el cuadrado y centra el sobrante.
  const escala = Math.max(tam / img.width, tam / img.height)
  const w = img.width * escala
  const h = img.height * escala
  ctx.drawImage(img, (tam - w) / 2, (tam - h) / 2, w, h)

  // WebP conserva alfa y pesa poco; si no está soportado, `toDataURL` cae a PNG.
  let url = canvas.toDataURL('image/webp', 0.85)
  if (!url.startsWith('data:image/webp')) url = canvas.toDataURL('image/png')
  return url
}

/** Lee un File como imagen decodificada (Image lista para dibujar en canvas). */
function cargarDesdeArchivo(/** @type {File} */ file) {
  return new Promise((resolve, reject) => {
    const lector = new FileReader()
    lector.onerror = () => reject(new Error('No se pudo leer el archivo.'))
    lector.onload = () => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error('El archivo no es una imagen válida.'))
      img.src = /** @type {string} */ (lector.result)
    }
    lector.readAsDataURL(file)
  })
}
