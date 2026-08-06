<script>
  // Fase 1 — Vista de Combate. Por ahora es un banco de pruebas del motor de
  // ruleta (1.1): gira sobre los 173 campeones y revela el ganador. El flujo VS
  // completo (dos invocadores, reglas heredadas, marcador) llega en 1.6+.
  import Ruleta from './Ruleta.svelte'
  import { CHAMPION_IDS, getChampion } from '../core/champions.js'

  /** @type {Ruleta} */
  let ruleta = $state()
  let girando = $state(false)
  /** @type {string | null} */
  let ganador = $state(null)

  const campeon = $derived(ganador ? getChampion(ganador) : null)

  function girar() {
    ganador = null
    girando = true
    ruleta?.girar()
  }
  function alResultado(/** @type {string} */ id) {
    ganador = id
    girando = false
  }
</script>

<section class="combate">
  <header class="cab">
    <p class="cab__marca">El foco ⭐ · Fase 1</p>
    <h1 class="cab__titulo texto-oro">La Ruleta</h1>
    <p class="cab__sub">Banco de pruebas del motor de ruleta · {CHAMPION_IDS.length} campeones</p>
  </header>

  <div class="acciones">
    <button class="boton" type="button" onclick={girar} disabled={girando}>
      {girando ? 'Girando…' : ganador ? 'Girar de nuevo' : '⚔️ Girar la ruleta'}
    </button>
  </div>

  <Ruleta bind:this={ruleta} items={CHAMPION_IDS} onresultado={alResultado} />

  {#if campeon && !girando}
    <div class="revelacion">
      <p class="revelacion__eyebrow">El elegido</p>
      {#if campeon.img}
        <figure class="retrato"><img src={campeon.img} alt={campeon.nombre} /></figure>
      {/if}
      <h2 class="revelacion__nom texto-oro">{campeon.nombre}</h2>
    </div>
  {/if}
</section>

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

  .revelacion {
    text-align: center;
    padding: clamp(1.2rem, 4vw, 2.4rem);
    border: 1px solid var(--borde-oro);
    border-radius: 4px;
    background: radial-gradient(120% 90% at 50% 0%, rgba(10, 200, 185, 0.08), transparent 60%),
      linear-gradient(180deg, rgba(18, 37, 60, 0.72), rgba(7, 11, 18, 0.9));
    animation: surgir 0.6s cubic-bezier(0.2, 0.9, 0.2, 1) both;
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

  @media (prefers-reduced-motion: reduce) {
    .revelacion {
      animation: none;
    }
  }
</style>
