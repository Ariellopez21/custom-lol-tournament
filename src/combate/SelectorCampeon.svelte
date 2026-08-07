<script>
  // Fase 1.8 — Selector de UN campeón (modal reutilizable) para "marcar a mano"
  // los campeones jugados en la cara ENFRENTAMIENTO (fila 2 del Marcador). No hay
  // ruleta que los sortee, así que el humano los elige aquí. Rejilla de retratos
  // con buscador (mismo lenguaje visual que EditorPool.svelte); cada clic emite
  // `onElegir(id)` y se pueden añadir varios seguidos (restock ⇒ repetidos válidos).
  import { CHAMPIONS } from '../core/champions.js'

  let {
    titulo = 'Añadir campeón',
    yaJugados = [],
    onElegir = () => {},
    onCerrar = () => {},
  } = $props()

  let busqueda = $state('')
  const termino = $derived(busqueda.trim().toLowerCase())
  const filtrados = $derived(
    termino ? CHAMPIONS.filter((c) => c.nombre.toLowerCase().includes(termino)) : CHAMPIONS
  )
  const jugadosSet = $derived(new Set(yaJugados))
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && onCerrar()} />

<div class="fondo" role="presentation" onclick={(e) => e.target === e.currentTarget && onCerrar()}>
  <div class="panel" role="dialog" aria-modal="true" tabindex="-1" aria-label={titulo}>
    <header class="cab">
      <div>
        <p class="cab__marca">Campeones jugados</p>
        <h2 class="cab__nom texto-oro">{titulo}</h2>
      </div>
      <button class="cerrar" type="button" onclick={onCerrar} aria-label="Cerrar">✕</button>
    </header>

    <div class="barra">
      <input
        class="buscar"
        type="search"
        placeholder="Buscar campeón…"
        bind:value={busqueda}
        autocomplete="off"
        aria-label="Buscar campeón"
      />
    </div>

    <div class="rejilla" role="listbox" aria-label="Campeones">
      {#each filtrados as c (c.id)}
        <button
          class="ficha"
          class:activa={jugadosSet.has(c.id)}
          type="button"
          onclick={() => onElegir(c.id)}
          title={jugadosSet.has(c.id) ? `${c.nombre} — ya jugado (toca para añadir otro)` : c.nombre}
        >
          <span class="ficha__marco">
            <img class="ficha__img" src={c.img} alt="" loading="lazy" />
            {#if jugadosSet.has(c.id)}<span class="ficha__check" aria-hidden="true">✓</span>{/if}
          </span>
          <span class="ficha__nombre">{c.nombre}</span>
        </button>
      {/each}
      {#if filtrados.length === 0}
        <p class="vacio">Sin resultados para «{busqueda}».</p>
      {/if}
    </div>

    <footer class="pie">
      <span class="pie__hint">Toca un campeón para añadirlo a la tira. Puedes añadir varios.</span>
      <button class="boton" type="button" onclick={onCerrar}>Listo</button>
    </footer>
  </div>
</div>

<style>
  .fondo {
    position: fixed;
    inset: 0;
    z-index: 120; /* por encima del ModalCombate (100) por si acaso */
    display: grid;
    place-items: center;
    padding: clamp(0.75rem, 3vw, 2rem);
    background: rgba(7, 11, 18, 0.74);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
  }
  .panel {
    display: flex;
    flex-direction: column;
    width: 100%;
    max-width: 62rem;
    max-height: 88vh;
    background: linear-gradient(180deg, rgba(18, 37, 60, 0.96), rgba(7, 11, 18, 0.98));
    border: 1px solid var(--borde-oro);
    border-radius: 4px;
    box-shadow: 0 30px 90px -30px #000, 0 0 0 1px rgba(0, 0, 0, 0.5);
  }

  .cab {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    padding: clamp(0.9rem, 3vw, 1.4rem) clamp(1rem, 3vw, 1.6rem) 0.75rem;
    border-bottom: 1px solid var(--borde-oro-tenue);
  }
  .cab__marca {
    margin: 0 0 0.3rem;
    font-size: 10px;
    font-weight: 500;
    letter-spacing: 0.34em;
    text-transform: uppercase;
    color: var(--arcano);
  }
  .cab__nom {
    margin: 0;
    font-family: var(--fuente-display);
    font-weight: 900;
    font-size: clamp(1.2rem, 3.5vw, 1.7rem);
    line-height: 1;
    overflow-wrap: anywhere;
  }
  .cerrar {
    flex-shrink: 0;
    width: 34px;
    height: 34px;
    display: grid;
    place-items: center;
    background: transparent;
    border: 1px solid var(--borde-oro);
    border-radius: 2px;
    color: var(--humo);
    font-size: 0.9rem;
    cursor: pointer;
    transition: color 0.15s, border-color 0.15s;
  }
  .cerrar:hover {
    color: var(--oro-claro);
    border-color: var(--borde-oro-fuerte);
  }

  .barra {
    display: flex;
    gap: 0.6rem;
    padding: 0.9rem clamp(1rem, 3vw, 1.6rem);
  }
  .buscar {
    flex: 1;
    min-width: 12rem;
    background: rgba(7, 11, 18, 0.6);
    border: 1px solid var(--borde-oro);
    border-radius: 2px;
    color: var(--oro-claro);
    font-family: var(--fuente-ui);
    font-size: 1rem;
    padding: 0.6rem 0.8rem;
  }
  .buscar::placeholder {
    color: rgba(122, 138, 160, 0.55);
  }
  .buscar:focus {
    outline: none;
    border-color: var(--arcano);
    box-shadow: var(--brillo-arcano);
  }

  .rejilla {
    flex: 1;
    overflow-y: auto;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(76px, 1fr));
    gap: 0.55rem;
    padding: 0.25rem clamp(1rem, 3vw, 1.6rem) 1rem;
  }
  .ficha {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 5px;
    background: transparent;
    border: 0;
    padding: 4px 2px;
    cursor: pointer;
    border-radius: 4px;
  }
  .ficha__marco {
    position: relative;
    width: 100%;
    aspect-ratio: 1;
    border-radius: 4px;
    overflow: hidden;
    border: 1px solid var(--borde-oro-tenue);
    transition: border-color 0.15s, box-shadow 0.15s, filter 0.15s;
  }
  .ficha__img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    filter: grayscale(0.55) brightness(0.62);
    transition: filter 0.15s;
  }
  .ficha__check {
    position: absolute;
    top: 3px;
    right: 3px;
    width: 18px;
    height: 18px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: var(--oro);
    color: #04201d;
    font-size: 11px;
    font-weight: 700;
  }
  .ficha__nombre {
    font-size: 0.68rem;
    line-height: 1.15;
    text-align: center;
    color: var(--humo);
    overflow-wrap: anywhere;
    transition: color 0.15s;
  }
  .ficha:hover .ficha__marco {
    border-color: var(--borde-oro);
  }
  .ficha:hover .ficha__img {
    filter: grayscale(0.2) brightness(0.85);
  }
  .ficha:focus-visible {
    outline: 2px solid var(--arcano);
    outline-offset: 2px;
  }
  .ficha.activa .ficha__marco {
    border-color: var(--borde-oro-fuerte);
    box-shadow: 0 0 0 1px var(--oro), 0 0 18px -6px var(--oro);
  }
  .ficha.activa .ficha__img {
    filter: none;
  }
  .ficha.activa .ficha__nombre {
    color: var(--oro-claro);
  }
  .vacio {
    grid-column: 1 / -1;
    text-align: center;
    color: var(--humo);
    padding: 2rem 0;
  }

  .pie {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    align-items: center;
    justify-content: space-between;
    padding: 0.9rem clamp(1rem, 3vw, 1.6rem);
    border-top: 1px solid var(--borde-oro-tenue);
  }
  .pie__hint {
    font-size: 0.75rem;
    color: var(--humo);
  }
  .boton {
    font-family: var(--fuente-display);
    font-weight: 800;
    font-size: 0.85rem;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: #0a0f18;
    background: var(--oro-degradado);
    border: 1px solid #e4d3a8;
    border-radius: 2px;
    padding: 0.55rem 1.4rem;
    cursor: pointer;
    box-shadow: var(--sombra-boton);
    transition: transform 0.15s, box-shadow 0.25s, filter 0.2s;
  }
  .boton:hover {
    transform: translateY(-2px);
    box-shadow: var(--sombra-boton-hover);
  }

  @media (prefers-reduced-motion: reduce) {
    .ficha__marco,
    .ficha__img,
    .boton {
      transition: none;
    }
  }
</style>
