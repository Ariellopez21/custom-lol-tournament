<script>
  // Fase 1 — Vista de Combate (banco de pruebas del motor de ruleta).
  //   · 1.1 → motor `Ruleta.svelte` (gira sobre una lista, entrega 1 ganador).
  //   · 1.2 → modo **single** (mirror: 1 giro, ambos juegan el mismo campeón) y
  //           modo **dual** (no-mirror: 2 giros, uno por invocador). Como la
  //           `Ruleta` es "tonta" y entrega 1 resultado, en dual montamos DOS.
  //   · 1.3 → los retratos de `champs/` alimentan la revelación en ambos lados.
  // Nota: aquí ambas ruletas sortean sobre los 173 (champion pool llega en 1.4).
  // El flujo VS real (invocadores + reglas heredadas + marcador) llega en 1.6+.
  import Ruleta from './Ruleta.svelte'
  import { CHAMPION_IDS, getChampion } from '../core/champions.js'

  /** @type {'single' | 'dual'} */
  let modo = $state('single')

  // Referencias imperativas: single usa r1; dual usa r1 (Invocador 1) y r2 (Invocador 2).
  let r1 = $state()
  let r2 = $state()

  let girando = $state(false)
  let pendientes = $state(0) // ruletas que faltan por aterrizar (dual = 2)

  /** @type {string | null} */ let ganador1 = $state(null)
  /** @type {string | null} */ let ganador2 = $state(null)

  const campeon1 = $derived(ganador1 ? getChampion(ganador1) : null)
  const campeon2 = $derived(ganador2 ? getChampion(ganador2) : null)
  const hayResultado = $derived(!!(ganador1 || ganador2))

  function girar() {
    ganador1 = null
    ganador2 = null
    girando = true
    if (modo === 'single') {
      pendientes = 1
      r1?.girar()
    } else {
      pendientes = 2
      r1?.girar()
      r2?.girar()
    }
  }

  const res1 = (/** @type {string} */ id) => aterriza('a', id)
  const res2 = (/** @type {string} */ id) => aterriza('b', id)
  function aterriza(lado, id) {
    if (lado === 'a') ganador1 = id
    else ganador2 = id
    if (--pendientes <= 0) girando = false
  }

  function cambiarModo(/** @type {'single' | 'dual'} */ m) {
    if (girando || m === modo) return
    modo = m
    ganador1 = null
    ganador2 = null
  }

  const etiquetaBoton = $derived(
    girando
      ? 'Girando…'
      : hayResultado
        ? 'Girar de nuevo'
        : modo === 'single'
          ? '⚔️ Girar la ruleta'
          : '⚔️ Girar ambas'
  )
</script>

<section class="combate">
  <header class="cab">
    <p class="cab__marca">El foco ⭐ · Fase 1</p>
    <h1 class="cab__titulo texto-oro">La Ruleta</h1>
    <p class="cab__sub">Banco de pruebas del motor de ruleta · {CHAMPION_IDS.length} campeones</p>
  </header>

  <div class="modos" role="group" aria-label="Modo de sorteo">
    <button
      type="button"
      class="modos__op"
      class:activo={modo === 'single'}
      onclick={() => cambiarModo('single')}
      disabled={girando}
    >
      <span class="modos__t">Single</span>
      <span class="modos__d">espejo · 1 campeón</span>
    </button>
    <button
      type="button"
      class="modos__op"
      class:activo={modo === 'dual'}
      onclick={() => cambiarModo('dual')}
      disabled={girando}
    >
      <span class="modos__t">Dual</span>
      <span class="modos__d">uno por invocador</span>
    </button>
  </div>
  <p class="modos__nota">
    {#if modo === 'single'}
      Un solo giro: <strong>ambos invocadores</strong> juegan el mismo campeón (mirror match).
    {:else}
      Dos giros simultáneos: <strong>cada invocador</strong> recibe su propio campeón.
    {/if}
  </p>

  <div class="acciones">
    <button class="boton" type="button" onclick={girar} disabled={girando}>{etiquetaBoton}</button>
  </div>

  {#if modo === 'single'}
    <div class="arena">
      <Ruleta bind:this={r1} items={CHAMPION_IDS} onresultado={res1} />
      {#if campeon1 && !girando}
        {@render revelacion(campeon1, 'El elegido · ambos lo juegan')}
      {/if}
    </div>
  {:else}
    <div class="arena arena--dual">
      <div class="lado">
        <p class="lado__nom">Invocador 1</p>
        <Ruleta bind:this={r1} items={CHAMPION_IDS} alto={66} onresultado={res1} />
        {#if campeon1 && !girando}
          {@render revelacion(campeon1, 'Invocador 1', true)}
        {/if}
      </div>
      <div class="lado">
        <p class="lado__nom">Invocador 2</p>
        <Ruleta bind:this={r2} items={CHAMPION_IDS} alto={66} onresultado={res2} />
        {#if campeon2 && !girando}
          {@render revelacion(campeon2, 'Invocador 2', true)}
        {/if}
      </div>
    </div>
  {/if}
</section>

{#snippet revelacion(campeon, eyebrow, compacta = false)}
  <div class="revelacion" class:revelacion--compacta={compacta}>
    <p class="revelacion__eyebrow">{eyebrow}</p>
    {#if campeon.img}
      <figure class="retrato"><img src={campeon.img} alt={campeon.nombre} /></figure>
    {/if}
    <h2 class="revelacion__nom texto-oro">{campeon.nombre}</h2>
  </div>
{/snippet}

<style>
  .combate {
    width: 100%;
    max-width: 46rem;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 1.6rem;
  }
  .cab {
    text-align: center;
  }
  .cab__marca {
    margin: 0 0 0.6rem;
    font-size: 11px;
    letter-spacing: 0.4em;
    text-transform: uppercase;
    color: var(--arcano);
  }
  .cab__titulo {
    margin: 0;
    font-family: var(--fuente-display);
    font-weight: 900;
    font-size: clamp(2rem, 6vw, 3.2rem);
    line-height: 1;
  }
  .cab__sub {
    margin: 0.8rem 0 0;
    font-size: 0.78rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--humo);
  }

  /* Selector de modo (segmentado) — 1.2 */
  .modos {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.6rem;
    max-width: 30rem;
    margin: 0 auto;
    width: 100%;
  }
  .modos__op {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    padding: 0.7rem 1rem;
    background: linear-gradient(180deg, rgba(18, 37, 60, 0.5), rgba(7, 11, 18, 0.6));
    border: 1px solid rgba(200, 170, 110, 0.22);
    border-radius: 3px;
    cursor: pointer;
    color: var(--humo);
    transition: border-color 0.2s, color 0.2s, background 0.2s, transform 0.15s;
  }
  .modos__op:hover:not(:disabled):not(.activo) {
    border-color: rgba(200, 170, 110, 0.45);
    transform: translateY(-1px);
  }
  .modos__op.activo {
    border-color: var(--borde-oro-fuerte);
    color: var(--oro-claro);
    background: radial-gradient(120% 120% at 50% 0%, rgba(10, 200, 185, 0.12), transparent 60%),
      linear-gradient(180deg, rgba(18, 37, 60, 0.8), rgba(7, 11, 18, 0.7));
    box-shadow: inset 0 0 30px -18px var(--oro);
  }
  .modos__op:disabled {
    cursor: not-allowed;
    opacity: 0.65;
  }
  .modos__t {
    font-family: var(--fuente-display);
    font-weight: 800;
    font-size: 1.05rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .modos__d {
    font-size: 0.68rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }
  .modos__nota {
    margin: -0.8rem 0 0;
    text-align: center;
    font-size: 0.82rem;
    color: var(--humo);
  }
  .modos__nota strong {
    color: var(--oro-claro);
  }

  .acciones {
    display: flex;
    justify-content: center;
  }
  .boton {
    font-family: var(--fuente-display);
    font-weight: 800;
    font-size: clamp(0.95rem, 2vw, 1.2rem);
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: #0a0f18;
    background: var(--oro-degradado-fuerte);
    border: 1px solid #e4d3a8;
    border-radius: 2px;
    padding: 0.9rem 2.4rem;
    cursor: pointer;
    box-shadow: var(--sombra-boton);
    transition: transform 0.15s, box-shadow 0.25s, filter 0.2s;
  }
  .boton:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: var(--sombra-boton-hover);
  }
  .boton:disabled {
    cursor: progress;
    filter: grayscale(0.5) brightness(0.8);
  }

  /* Arena — single = 1 columna centrada; dual = 2 estaciones lado a lado. */
  .arena {
    display: flex;
    flex-direction: column;
    gap: 1.6rem;
    align-items: center;
  }
  .arena--dual {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.4rem;
    align-items: start;
  }
  @media (max-width: 560px) {
    .arena--dual {
      grid-template-columns: 1fr;
    }
  }
  .lado {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    align-items: center;
  }
  .lado__nom {
    margin: 0;
    font-family: var(--fuente-display);
    font-weight: 700;
    font-size: 0.9rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--arcano);
  }

  .revelacion {
    width: 100%;
    text-align: center;
    padding: clamp(1.2rem, 4vw, 2.4rem);
    border: 1px solid var(--borde-oro);
    border-radius: 4px;
    background: radial-gradient(120% 90% at 50% 0%, rgba(10, 200, 185, 0.08), transparent 60%),
      linear-gradient(180deg, rgba(18, 37, 60, 0.72), rgba(7, 11, 18, 0.9));
    animation: surgir 0.6s cubic-bezier(0.2, 0.9, 0.2, 1) both;
  }
  .revelacion--compacta {
    padding: clamp(1rem, 3vw, 1.4rem);
  }
  @keyframes surgir {
    from {
      opacity: 0;
      transform: translateY(20px) scale(0.99);
    }
    to {
      opacity: 1;
      transform: none;
    }
  }
  .revelacion__eyebrow {
    margin: 0 0 0.8rem;
    font-size: 11px;
    letter-spacing: 0.4em;
    text-transform: uppercase;
    color: var(--arcano);
  }
  .retrato {
    margin: 0 auto 1rem;
    width: clamp(120px, 26vw, 190px);
    aspect-ratio: 1;
    border: 1px solid var(--borde-oro-fuerte);
    border-radius: 50%;
    overflow: hidden;
    box-shadow: 0 0 60px -18px var(--oro), inset 0 0 40px -12px #000;
  }
  .revelacion--compacta .retrato {
    width: clamp(96px, 30vw, 140px);
  }
  .retrato img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  .revelacion__nom {
    margin: 0;
    font-family: var(--fuente-display);
    font-weight: 900;
    font-size: clamp(2rem, 8vw, 4.5rem);
    line-height: 1;
    text-transform: uppercase;
    overflow-wrap: anywhere;
  }
  .revelacion--compacta .revelacion__nom {
    font-size: clamp(1.4rem, 5vw, 2.4rem);
  }

  @media (prefers-reduced-motion: reduce) {
    .revelacion {
      animation: none;
    }
  }
</style>
