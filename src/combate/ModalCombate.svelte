<script>
  // Modal/overlay del combate por ruleta — la "Pantalla VS" (1.6). Es un shell
  // teatral reutilizable: backdrop oscuro + panel centrado con cabecera y cierre.
  // El CUERPO lo pasa cada vista (Tabla/Grupos/Bracket) como `children`: la
  // `DueloRuleta` + su marcador + los botones (Registrar/Otro/Cancelar), porque
  // esa lógica (empates, "Otro", etc.) es propia de cada sistema de torneo.
  // Sigue el mismo patrón de modal que `EditorPool.svelte` (cierre por fondo y
  // por Escape, `role="dialog"`), para hablar el mismo lenguaje visual.
  let {
    onCerrar = () => {},
    titulo = 'Combate',
    subtitulo = '⚔️ Combate por ruleta',
    children,
  } = $props()
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && onCerrar()} />

<!-- Clic en el fondo (no en el panel) cierra: comparamos target === currentTarget. -->
<div class="fondo" role="presentation" onclick={(e) => e.target === e.currentTarget && onCerrar()}>
  <div class="panel" role="dialog" aria-modal="true" tabindex="-1" aria-label={`${subtitulo} · ${titulo}`}>
    <header class="panel__cab">
      <div class="panel__titulos">
        <p class="panel__marca">{subtitulo}</p>
        <h2 class="panel__nombre texto-oro">{titulo}</h2>
      </div>
      <button class="cerrar" type="button" onclick={onCerrar} aria-label="Cerrar">✕</button>
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
  .cerrar:focus-visible {
    outline: 2px solid var(--arcano);
    outline-offset: 2px;
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
