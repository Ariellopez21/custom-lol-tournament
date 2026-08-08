/**
 * ui/portal.js — Acción `use:portal`: reubica el nodo en `<body>` (o en `target`)
 * al montar. Sirve para que un modal `position:fixed` NO quede atrapado por
 * ancestros (overflow/transform) y, sobre todo, para que en el modo Overlay (1.12)
 * podamos ocultar el contenido de la app sin ocultar el modal (que ya cuelga de
 * <body>, no del contenido).
 *
 * Las clases de estilo con hash de Svelte viajan con el nodo, así que el CSS
 * scoped del componente se sigue aplicando tras moverlo.
 *
 * @param {HTMLElement} node
 * @param {HTMLElement} [target]
 */
export function portal(node, target) {
  const destino = target ?? document.body
  destino.appendChild(node)
  return {
    destroy() {
      node.parentNode?.removeChild(node)
    },
  }
}
