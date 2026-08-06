<script>
  // Fase 1 — Vista de Combate (banco de pruebas del motor de ruleta).
  //   · 1.1 → motor `Ruleta.svelte` (gira sobre una lista, entrega 1 ganador).
  //   · 1.2 → modo **single** (mirror: 1 giro, ambos juegan el mismo campeón) y
  //           modo **dual** (no-mirror: 2 giros, uno por invocador). Como la
  //           `Ruleta` es "tonta" y entrega 1 resultado, en dual montamos DOS.
  //   · 1.3 → los retratos de `champs/` alimentan la revelación en ambos lados.
  //   · 1.4 → panel de reglas compartido `PanelReglas`; el Mirror del panel manda
  //           el modo single/dual (antes era un selector segmentado hardcodeado).
  // Nota: aquí ambas ruletas sortean sobre los 173; champion pool y restock
  // necesitan invocadores reales y se aplican en el flujo VS (1.7 / 1.9, Fase 1.c).
  import Ruleta from './Ruleta.svelte'
  import PanelReglas from './PanelReglas.svelte'
  import { CHAMPION_IDS, getChampion } from '../core/champions.js'
  import { reglasPorDefecto } from '../core/estado.svelte.js'

  // Reglas locales del banco de pruebas (editables en vivo con PanelReglas).
  // Aquí la resolución siempre es "ruleta"; es el Mirror el que manda el modo.
  let reglas = $state({ ...reglasPorDefecto(), resolucion: 'ruleta' })

  /** @type {'single' | 'dual'} — mirror ON = single, mirror OFF = dual. */
  const modo = $derived(reglas.mirror ? 'single' : 'dual')

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

  // Al togglear Mirror (cambia el modo) limpiamos las revelaciones previas.
  // `.pre` evita el parpadeo de una revelación vieja antes de recomponer la arena.
  // El panel se deshabilita mientras gira, así que el modo nunca cambia a mitad de giro.
  $effect.pre(() => {
    modo // dependencia
    ganador1 = null
    ganador2 = null
  })

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

  <PanelReglas
    bind:reglas
    leyenda="Reglas del duelo (banco de pruebas)"
    mostrarResolucion={false}
    mostrarPuntos={false}
    deshabilitado={girando}
  />
  <p class="modos__nota">
    {#if modo === 'single'}
      <strong>Mirror ON → Single:</strong> un solo giro; ambos invocadores juegan el mismo campeón.
    {:else}
      <strong>Mirror OFF → Dual:</strong> dos giros simultáneos; cada invocador recibe su propio campeón.
    {/if}
  </p>
  <p class="nota-alcance">
    Champion pool y Restock necesitan invocadores reales — se aplican en el flujo VS (1.7 / 1.9).
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

  .modos__nota {
    margin: 0;
    text-align: center;
    font-size: 0.82rem;
    color: var(--humo);
  }
  .modos__nota strong {
    color: var(--oro-claro);
  }
  .nota-alcance {
    margin: -0.9rem 0 0;
    text-align: center;
    font-size: 0.74rem;
    letter-spacing: 0.04em;
    color: rgba(122, 138, 160, 0.7);
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
