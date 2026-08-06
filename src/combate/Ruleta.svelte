<script>
  // Fase 1.1 — Motor de ruleta reutilizable. Porta el tambor de `ruleta-espejo.html`
  // pero **list-driven**: gira sobre una lista de campeones y aterriza en el ganador.
  // El componente es "tonto": no decide reglas ni pools; recibe `items` (ids) y,
  // al girar, elige uno al azar (o el que le pasen) y lo revela centrado.
  //
  // API (el padre lo controla con bind:this):
  //   ruleta.girar(ganadorId?)  → gira; si no se pasa ganador, lo sortea (cripto).
  //   ruleta.estaGirando()      → bool
  //   onresultado(ganadorId)    → callback al terminar el giro.
  import { getChampion } from '../core/champions.js'

  let {
    items = [],
    duracionMs = 5200,
    alto = 84, // alto de cada ranura, px
    onresultado = () => {},
  } = $props()

  const LARGO = 58 // ranuras "de relleno" antes del ganador
  const reduce =
    typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
  const dur = $derived(reduce ? 900 : duracionMs)

  /** @type {string[]} */
  let ranuras = $state([])
  let offset = $state(0)
  let trans = $state('none')
  let rodando = $state(false)
  let girando = $state(false)
  let idxGanador = $state(-1)
  let haGirado = $state(false) // hasta el 1er giro, la cinta va atenuada (no parece preselección)

  /** Entero uniforme en [0, max) con crypto (rechazo para evitar sesgo). */
  function azar(max) {
    const c = globalThis.crypto
    if (c?.getRandomValues && max > 0) {
      const tope = Math.floor(0xffffffff / max) * max
      const buf = new Uint32Array(1)
      let n
      do {
        c.getRandomValues(buf)
        n = buf[0]
      } while (n >= tope)
      return n % max
    }
    return Math.floor(Math.random() * max)
  }
  const alAzar = () => items[azar(items.length)]

  /** Cinta de reposo, para que el tambor no se vea vacío. */
  function reposo() {
    ranuras = Array.from({ length: 8 }, alAzar)
    idxGanador = -1
    trans = 'none'
    offset = -3 * alto
  }

  export function girar(ganadorId) {
    if (girando || items.length === 0) return null
    girando = true
    haGirado = true
    const ganador = ganadorId ?? alAzar()

    const r = Array.from({ length: LARGO }, alAzar)
    r.push(ganador) // índice LARGO = el que quedará centrado
    for (let i = 0; i < 4; i++) r.push(alAzar())
    ranuras = r
    idxGanador = LARGO

    // Posición inicial sin transición…
    trans = 'none'
    offset = 0
    rodando = true

    // …y en el siguiente frame lanzamos el giro con easing largo.
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        trans = `transform ${dur}ms cubic-bezier(.07,.72,.05,1)`
        offset = -LARGO * alto
        setTimeout(() => (rodando = false), dur * 0.62)
        setTimeout(() => {
          girando = false
          onresultado(ganador)
        }, dur + 90)
      })
    )
    return ganador
  }

  export function estaGirando() {
    return girando
  }

  // Arranque: cinta de reposo cuando lleguen los items.
  $effect(() => {
    if (items.length && ranuras.length === 0) reposo()
  })
</script>

<div class="ruleta" class:girando class:reposo={!haGirado} aria-hidden="true">
  <div class="aro"></div>
  <div class="tambor" style="--item-h:{alto}px; --reel-h:{alto * 3}px">
    <div
      class="cinta"
      class:rodando
      style="transform: translateY({offset}px); transition: {trans};"
    >
      {#each ranuras as id, i (i)}
        {@const c = getChampion(id)}
        <div class="ranura" class:ranura--ganador={!rodando && i === idxGanador}>
          {#if c?.img}<img class="ranura__img" src={c.img} alt="" loading="lazy" />{/if}
          <span class="ranura__nom">{c?.nombre ?? id}</span>
        </div>
      {/each}
    </div>
    <div class="marcador"><span class="izq"></span><span class="der"></span></div>
  </div>
</div>

<style>
  .ruleta {
    position: relative;
    display: grid;
    place-items: center;
    /* Decorativa (aria-hidden): el aro se desborda hacia arriba y no debe
       robarle los clics al botón que la precede. */
    pointer-events: none;
  }
  .aro {
    position: absolute;
    z-index: 0;
    width: min(520px, 96vw);
    aspect-ratio: 1;
    border: 1px solid rgba(200, 170, 110, 0.16);
    border-radius: 50%;
  }
  .aro::before,
  .aro::after {
    content: '';
    position: absolute;
    inset: 32px;
    border: 1px dashed rgba(10, 200, 185, 0.16);
    border-radius: 50%;
  }
  .aro::after {
    inset: 72px;
    border-style: solid;
    border-color: rgba(200, 170, 110, 0.1);
  }
  .ruleta.girando .aro {
    animation: orbita 3.4s linear infinite;
  }
  @keyframes orbita {
    to {
      transform: rotate(360deg);
    }
  }

  .tambor {
    position: relative;
    z-index: 1;
    width: min(620px, 100%);
    height: var(--reel-h);
    overflow: hidden;
    background: linear-gradient(180deg, rgba(7, 11, 18, 0.94), rgba(18, 37, 60, 0.86) 50%, rgba(7, 11, 18, 0.94));
    border-top: 1px solid rgba(200, 170, 110, 0.4);
    border-bottom: 1px solid rgba(200, 170, 110, 0.4);
    box-shadow: inset 0 0 90px -20px #000;
    mask-image: linear-gradient(180deg, transparent 0%, #000 22%, #000 78%, transparent 100%);
    -webkit-mask-image: linear-gradient(180deg, transparent 0%, #000 22%, #000 78%, transparent 100%);
  }
  .cinta {
    position: absolute;
    left: 0;
    right: 0;
    top: calc(50% - var(--item-h) / 2);
    will-change: transform;
  }
  .cinta.rodando {
    filter: blur(3px);
  }
  /* En reposo (antes del 1er giro): cinta y marcador atenuados para que no
     parezca que hay un campeón preseleccionado. */
  .ruleta.reposo .cinta {
    opacity: 0.28;
    filter: grayscale(0.55);
    transition: opacity 0.4s, filter 0.4s;
  }
  .ruleta.reposo .marcador {
    opacity: 0.3;
  }
  .ranura {
    height: var(--item-h);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.7rem;
    font-family: var(--fuente-display);
    font-weight: 600;
    font-size: clamp(18px, 3vw, 28px);
    color: rgba(240, 230, 210, 0.5);
    letter-spacing: 0.03em;
    white-space: nowrap;
  }
  .ranura__img {
    width: calc(var(--item-h) * 0.62);
    height: calc(var(--item-h) * 0.62);
    border-radius: 50%;
    object-fit: cover;
    border: 1px solid rgba(200, 170, 110, 0.35);
    flex: none;
  }
  .ranura--ganador {
    color: var(--oro-claro);
  }
  .ranura--ganador .ranura__img {
    border-color: var(--oro);
    box-shadow: 0 0 26px -6px var(--oro);
  }

  .marcador {
    position: absolute;
    z-index: 2;
    left: 0;
    right: 0;
    top: 50%;
    height: var(--item-h);
    transform: translateY(-50%);
    pointer-events: none;
    border-top: 1px solid rgba(10, 200, 185, 0.55);
    border-bottom: 1px solid rgba(10, 200, 185, 0.55);
    background: linear-gradient(90deg, rgba(10, 200, 185, 0.1), transparent 30%, transparent 70%, rgba(10, 200, 185, 0.1));
  }
  .marcador span {
    position: absolute;
    top: 50%;
    width: 0;
    height: 0;
    border: 9px solid transparent;
  }
  .marcador .izq {
    left: 0;
    transform: translateY(-50%);
    border-left-color: var(--oro);
  }
  .marcador .der {
    right: 0;
    transform: translateY(-50%);
    border-right-color: var(--oro);
  }

  @media (prefers-reduced-motion: reduce) {
    .cinta.rodando {
      filter: none;
    }
    .ruleta.girando .aro {
      animation: none;
    }
  }
</style>
