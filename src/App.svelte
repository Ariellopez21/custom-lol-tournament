<script>
  import { ruta } from './ui/ruta.svelte.js'
  import { CHAMPIONS } from './core/champions.js'

  import CombateVista from './combate/CombateVista.svelte'
  import ParticipantesVista from './participantes/ParticipantesVista.svelte'
  import TorneoVista from './torneo/TorneoVista.svelte'
  import TemporadasVista from './temporadas/TemporadasVista.svelte'

  // Una sola fuente para el menú y el enrutado.
  const SECCIONES = [
    { id: 'combate', etiqueta: 'Combate', Vista: CombateVista },
    { id: 'participantes', etiqueta: 'Participantes', Vista: ParticipantesVista },
    { id: 'torneos', etiqueta: 'Torneos', Vista: TorneoVista },
    { id: 'temporadas', etiqueta: 'Temporadas', Vista: TemporadasVista },
  ]

  // Sección activa según el hash; si es desconocido, cae en Combate.
  const seccion = $derived(SECCIONES.find((s) => s.id === ruta.actual) ?? SECCIONES[0])
  const Vista = $derived(seccion.Vista)
</script>

<div class="app">
  <header class="barra">
    <a class="marca" href="#/combate" aria-label="Inicio · Combate">
      <span class="marca__eyebrow">Custom</span>
      <span class="marca__nombre">LoL Tournament</span>
    </a>

    <nav class="nav" aria-label="Secciones">
      {#each SECCIONES as s (s.id)}
        <a
          class="nav__enlace"
          class:activo={s.id === seccion.id}
          href={`#/${s.id}`}
          aria-current={s.id === seccion.id ? 'page' : undefined}
        >
          {s.etiqueta}
        </a>
      {/each}
    </nav>
  </header>

  <main class="contenido">
    <Vista />
  </main>

  <footer class="pie">
    Local-first · Open-source · {CHAMPIONS.length} campeones
  </footer>
</div>

<style>
  .app {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  /* ── Barra superior ─────────────────────────────── */
  .barra {
    position: sticky;
    top: 0;
    z-index: 10;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem 1.5rem;
    padding: 0.85rem clamp(1rem, 4vw, 2.5rem);
    border-bottom: 1px solid var(--borde-oro-tenue);
    background: rgba(7, 11, 18, 0.72);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
  }

  .marca {
    display: flex;
    flex-direction: column;
    gap: 2px;
    line-height: 1;
    text-decoration: none;
  }
  .marca__eyebrow {
    font-size: 10px;
    font-weight: 500;
    letter-spacing: 0.5em;
    text-transform: uppercase;
    color: var(--arcano);
  }
  .marca__nombre {
    font-family: var(--fuente-display);
    font-weight: 800;
    font-size: 1.15rem;
    letter-spacing: 0.02em;
    color: var(--oro-claro);
  }

  /* ── Navegación ─────────────────────────────────── */
  .nav {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
  }
  .nav__enlace {
    padding: 0.5rem 0.85rem;
    border: 1px solid transparent;
    border-radius: 2px;
    font-size: 0.78rem;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--humo);
    text-decoration: none;
    transition: color 0.15s, border-color 0.15s;
  }
  .nav__enlace:hover {
    color: var(--oro-claro);
  }
  .nav__enlace.activo {
    color: var(--oro);
    border-color: var(--borde-oro);
  }
  .nav__enlace:focus-visible {
    outline: 2px solid var(--arcano);
    outline-offset: 2px;
  }

  /* ── Contenido + pie ────────────────────────────── */
  .contenido {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: clamp(2rem, 6vw, 4rem) clamp(1rem, 4vw, 2.5rem);
  }

  .pie {
    padding: 1rem;
    text-align: center;
    border-top: 1px solid var(--borde-oro-tenue);
    font-size: 0.7rem;
    letter-spacing: 0.24em;
    text-transform: uppercase;
    color: rgba(122, 138, 160, 0.5);
  }
</style>
