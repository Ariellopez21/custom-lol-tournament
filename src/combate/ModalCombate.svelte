<script>
  // Modal/overlay del combate por ruleta — la "Pantalla VS" (1.6). Es un shell
  // teatral reutilizable: backdrop oscuro + panel centrado con cabecera y cierre.
  // El CUERPO lo pasa cada vista (Tabla/Grupos/Bracket) como `children`: la
  // `DueloRuleta` + su marcador + los botones (Registrar/Otro/Cancelar), porque
  // esa lógica (empates, "Otro", etc.) es propia de cada sistema de torneo.
  // Sigue el mismo patrón de modal que `EditorPool.svelte` (cierre por fondo y
  // por Escape, `role="dialog"`), para hablar el mismo lenguaje visual.
  import { portal } from '../ui/portal.js'
  import { overlay, entrarOverlay } from '../ui/overlay.svelte.js'

  let {
    onCerrar = () => {},
    titulo = 'Combate',
    subtitulo = '⚔️ Combate por ruleta',
    children,
  } = $props()
</script>

<!-- En overlay, Escape NO cierra el combate (lo maneja OverlayControl → salir). -->
<svelte:window onkeydown={(e) => e.key === 'Escape' && !overlay.activo && onCerrar()} />

<!-- Clic en el fondo (no en el panel) cierra, salvo en overlay (evita cierres
     accidentales al operar en stream). `use:portal` lo reubica en <body> para
     que el modo overlay pueda ocultar el contenido sin ocultar el modal. -->
<div
  class="fondo"
  class:fondo--overlay={overlay.activo}
  role="presentation"
  use:portal
  onclick={(e) => e.target === e.currentTarget && !overlay.activo && onCerrar()}
>
  <div class="panel" class:panel--overlay={overlay.activo} role="dialog" aria-modal="true" tabindex="-1" aria-label={`${subtitulo} · ${titulo}`}>
    <header class="panel__cab">
      <div class="panel__titulos">
        <p class="panel__marca">{subtitulo}</p>
        <h2 class="panel__nombre texto-oro">{titulo}</h2>
      </div>
      <div class="panel__acc">
        <button class="overlay-btn" type="button" onclick={() => entrarOverlay()} title="Modo Overlay/OBS (fondo transparente para stream)" aria-label="Activar modo Overlay/OBS">🖥️</button>
        <button class="cerrar" type="button" onclick={onCerrar} aria-label="Cerrar">✕</button>
      </div>
    </header>
    <div class="panel__cuerpo">
      {@render children?.()}
    </div>
  </div>
</div>

<style>
  .fondo {
    position: fixed;
    inset: 0;
    z-index: 100;
    display: grid;
    place-items: center;
    padding: clamp(0.75rem, 3vw, 2rem);
    background: rgba(7, 11, 18, 0.74);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
    animation: aparecer 0.2s ease both;
  }
  @keyframes aparecer {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
  .panel {
    display: flex;
    flex-direction: column;
    width: 100%;
    max-width: 46rem;
    max-height: 92vh;
    background: linear-gradient(180deg, rgba(18, 37, 60, 0.96), rgba(7, 11, 18, 0.98));
    border: 1px solid var(--borde-oro);
    border-radius: 4px;
    box-shadow: 0 30px 90px -30px #000, 0 0 0 1px rgba(0, 0, 0, 0.5);
    animation: subir 0.28s cubic-bezier(0.2, 0.9, 0.2, 1) both;
  }
  @keyframes subir {
    from {
      opacity: 0;
      transform: translateY(16px) scale(0.99);
    }
    to {
      opacity: 1;
      transform: none;
    }
  }

  .panel__cab {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    padding: clamp(0.9rem, 3vw, 1.3rem) clamp(1rem, 3vw, 1.5rem) 0.8rem;
    border-bottom: 1px solid var(--borde-oro-tenue);
  }
  .panel__marca {
    margin: 0 0 0.3rem;
    font-size: 10px;
    font-weight: 500;
    letter-spacing: 0.34em;
    text-transform: uppercase;
    color: var(--arcano);
  }
  .panel__nombre {
    margin: 0;
    font-family: var(--fuente-display);
    font-weight: 900;
    font-size: clamp(1.2rem, 3.5vw, 1.8rem);
    line-height: 1;
  }
  .panel__acc {
    flex-shrink: 0;
    display: flex;
    gap: 0.4rem;
  }
  .overlay-btn,
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
  .overlay-btn:hover,
  .cerrar:hover {
    color: var(--oro-claro);
    border-color: var(--borde-oro-fuerte);
  }
  .overlay-btn:focus-visible,
  .cerrar:focus-visible {
    outline: 2px solid var(--arcano);
    outline-offset: 2px;
  }

  /* ── Modo Overlay/OBS (1.12): el panel se vuelve transparente y sin cromo,
     dejando solo el combate (ruleta + marcador) sobre el fondo del <body>. ── */
  .fondo--overlay {
    background: transparent;
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
    animation: none;
    padding: clamp(1rem, 4vw, 3rem);
  }
  .panel--overlay {
    background: transparent;
    border: 0;
    box-shadow: none;
    animation: none;
    max-width: 52rem;
  }
  .panel--overlay .panel__cab {
    display: none;
  }

  .panel__cuerpo {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    padding: clamp(1rem, 3vw, 1.5rem);
    overflow-y: auto;
  }

  @media (prefers-reduced-motion: reduce) {
    .fondo,
    .panel {
      animation: none;
    }
  }
</style>
