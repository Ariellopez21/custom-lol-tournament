<script>
  // La Ruleta — ruleta instantánea, independiente del torneo. Hazla girar para
  // elegir entre los 173 campeones y enfrentar a 2 invocadores sin nombre. El
  // único ajuste es el "Mirror match": ON = un solo giro que ambos comparten
  // (single); OFF = un giro por invocador (dual). Motor: `Ruleta.svelte` (1.1),
  // que entrega 1 ganador, por eso en dual montamos DOS instancias.
  import Ruleta from './Ruleta.svelte'
  import { CHAMPION_IDS, getChampion } from '../core/champions.js'

  // Mirror ON = single (ambos juegan el mismo campeón); OFF = dual (uno cada uno).
  let mirror = $state(true)

  /** @type {'single' | 'dual'} */
  const modo = $derived(mirror ? 'single' : 'dual')

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
    <h1 class="cab__titulo texto-oro">La Ruleta</h1>
    <p class="cab__desc">
      Ruleta instantánea: gírala para elegir entre los {CHAMPION_IDS.length} campeones disponibles
      y enfrentar a 2 invocadores sin nombre, que pueden competir en <strong>dual</strong> o
      <strong>mirror match</strong>.
    </p>
  </header>

  <div class="controles">
    <button
      class="mirror"
      type="button"
      role="switch"
      aria-checked={mirror}
      onclick={() => (mirror = !mirror)}
      disabled={girando}
      title="Mirror match: ambos invocadores comparten un mismo giro (single). Apágalo para un giro por invocador (dual)."
    >
      <span class="mirror__sw" aria-hidden="true"><span class="mirror__knob"></span></span>
      <span class="mirror__txt">Mirror match</span>
      <span class="mirror__estado">{mirror ? 'Single' : 'Dual'}</span>
    </button>

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
  .cab__titulo {
    margin: 0;
    font-family: var(--fuente-display);
    font-weight: 900;
    font-size: clamp(2rem, 6vw, 3.2rem);
    line-height: 1;
  }
  .cab__desc {
    margin: 0.9rem auto 0;
    max-width: 34rem;
    font-size: 0.95rem;
    line-height: 1.5;
    color: var(--humo);
  }
  .cab__desc strong {
    color: var(--oro-claro);
    font-weight: 600;
  }

  /* Controles: toggle Mirror + botón de girar, centrados. */
  .controles {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 1rem 1.2rem;
  }

  .mirror {
    display: inline-flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.5rem 0.9rem 0.5rem 0.6rem;
    border: 1px solid var(--borde-oro);
    border-radius: 999px;
    background: rgba(7, 11, 18, 0.5);
    color: var(--oro-claro);
    font-family: var(--fuente-display);
    font-weight: 700;
    font-size: 0.82rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    cursor: pointer;
    transition: border-color 0.15s, background 0.15s;
  }
  .mirror:hover:not(:disabled) {
    border-color: var(--borde-oro-fuerte);
    background: rgba(200, 170, 110, 0.08);
  }
  .mirror:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
  .mirror:focus-visible {
    outline: 2px solid var(--arcano);
    outline-offset: 2px;
  }
  .mirror__sw {
    position: relative;
    flex: none;
    width: 44px;
    height: 24px;
    border-radius: 999px;
    border: 1px solid var(--borde-oro-tenue);
    background: rgba(7, 11, 18, 0.8);
    transition: background 0.2s, border-color 0.2s;
  }
  .mirror__knob {
    position: absolute;
    top: 2px;
    left: 2px;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: var(--humo);
    transition: transform 0.2s cubic-bezier(0.2, 0.9, 0.2, 1), background 0.2s;
  }
  .mirror[aria-checked='true'] .mirror__sw {
    background: rgba(200, 170, 110, 0.28);
    border-color: var(--borde-oro-fuerte);
  }
  .mirror[aria-checked='true'] .mirror__knob {
    transform: translateX(20px);
    background: var(--oro);
  }
  .mirror__estado {
    padding: 0.12rem 0.5rem;
    border-radius: 999px;
    border: 1px solid var(--borde-oro-tenue);
    font-size: 0.7rem;
    color: var(--arcano);
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
