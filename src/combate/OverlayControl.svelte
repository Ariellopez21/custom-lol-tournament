<script>
  // Fase 1.12 — Control flotante del modo Overlay/OBS. Solo se muestra cuando el
  // overlay está activo. Permite salir y elegir el fondo (transparente para OBS
  // Browser Source; verde/magenta para chroma key; negro para fondo sólido).
  // Se queda en una esquina, discreto (súbelo de opacidad al pasar el ratón);
  // recórtalo del encuadre en OBS. Escape también sale.
  import { overlay, salirOverlay, setFondoOverlay } from '../ui/overlay.svelte.js'

  const FONDOS = [
    { id: 'transparente', et: 'Transparente', pista: 'OBS Browser Source (alfa real)' },
    { id: 'verde', et: 'Verde', pista: 'chroma key' },
    { id: 'magenta', et: 'Magenta', pista: 'chroma key' },
    { id: 'negro', et: 'Negro', pista: 'fondo sólido' },
  ]
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && salirOverlay()} />

<div class="ctrl" role="group" aria-label="Controles del overlay">
  <div class="ctrl__fila">
    <span class="ctrl__tit">🖥️ Overlay</span>
    <button class="ctrl__salir" type="button" onclick={salirOverlay}>Salir ✕</button>
  </div>
  <div class="ctrl__fondos">
    {#each FONDOS as f (f.id)}
      <button
        class="chip"
        class:chip--on={overlay.fondo === f.id}
        type="button"
        onclick={() => setFondoOverlay(f.id)}
        title={f.pista}
      >
        {f.et}
      </button>
    {/each}
  </div>
</div>

<style>
  .ctrl {
    position: fixed;
    top: 12px;
    left: 12px;
    z-index: 200;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    padding: 0.6rem 0.7rem;
    border: 1px solid var(--borde-oro);
    border-radius: 4px;
    background: rgba(7, 11, 18, 0.82);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
    opacity: 0.35;
    transition: opacity 0.2s;
  }
  .ctrl:hover,
  .ctrl:focus-within {
    opacity: 1;
  }
  .ctrl__fila {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
  }
  .ctrl__tit {
    font-family: var(--fuente-display);
    font-weight: 700;
    font-size: 0.8rem;
    letter-spacing: 0.08em;
    color: var(--oro-claro);
  }
  .ctrl__salir {
    background: transparent;
    border: 1px solid var(--borde-oro);
    border-radius: 2px;
    color: var(--humo);
    font-size: 0.68rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    padding: 0.3rem 0.5rem;
    cursor: pointer;
  }
  .ctrl__salir:hover {
    color: var(--oro-claro);
    border-color: var(--borde-oro-fuerte);
  }
  .ctrl__fondos {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
  }
  .chip {
    background: transparent;
    border: 1px solid var(--borde-oro-tenue);
    border-radius: 999px;
    color: var(--humo);
    font-size: 0.66rem;
    letter-spacing: 0.04em;
    padding: 0.28rem 0.6rem;
    cursor: pointer;
    transition: color 0.15s, border-color 0.15s, background 0.15s;
  }
  .chip:hover {
    color: var(--oro-claro);
    border-color: var(--borde-oro);
  }
  .chip--on {
    color: #0a0f18;
    background: var(--oro);
    border-color: var(--oro);
    font-weight: 600;
  }
</style>
