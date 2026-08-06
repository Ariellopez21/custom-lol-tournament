<script>
  // Fase 1.4 — Panel de reglas de combate reutilizable (FUENTE ÚNICA).
  // Lo usan el asistente de torneo (reglas que se HEREDAN a cada partido) y el
  // combate suelto (editables en vivo). El modelo `ReglasCombate` y sus defaults
  // viven en core/estado.svelte.js (`reglasPorDefecto`).
  //   · leyenda           → texto del <legend>.
  //   · mostrarResolucion → el torneo elige manual/ruleta; el combate suelto no
  //                         (ahí la resolución siempre es ruleta).
  //   · mostrarPuntos     → la tabla de puntos solo aplica al torneo.
  //   · deshabilitado     → bloquea TODO el panel (p.ej. mientras gira la ruleta).
  //                         Un <fieldset disabled> desactiva sus controles de forma nativa.
  let {
    reglas = $bindable(),
    puntos = $bindable(null),
    leyenda = 'Reglas de combate',
    mostrarResolucion = true,
    mostrarPuntos = true,
    deshabilitado = false,
  } = $props()
</script>

<fieldset class="reglas" disabled={deshabilitado}>
  <legend>{leyenda}</legend>

  {#if mostrarResolucion}
    <div class="regla">
      <span class="regla__lbl">Resolución</span>
      <div class="opciones">
        <label><input type="radio" value="manual" bind:group={reglas.resolucion} /> Manual</label>
        <label><input type="radio" value="ruleta" bind:group={reglas.resolucion} /> Ruleta <em>(Fase 1)</em></label>
      </div>
    </div>
  {/if}

  <div class="regla">
    <span class="regla__lbl">Formato</span>
    <div class="opciones">
      {#each ['Bo1', 'Bo3', 'Bo5'] as f}
        <label><input type="radio" value={f} bind:group={reglas.formato} /> {f}</label>
      {/each}
    </div>
  </div>

  {#if reglas.resolucion === 'ruleta'}
    <div class="regla">
      <span class="regla__lbl">Ruleta</span>
      <div class="opciones opciones--check">
        <label><input type="checkbox" bind:checked={reglas.mirror} /> Mirror match</label>
        <label><input type="checkbox" bind:checked={reglas.championPool} /> Usar champion pools</label>
        <label><input type="checkbox" bind:checked={reglas.restock} /> Restock</label>
      </div>
    </div>
    <div class="regla">
      <span class="regla__lbl">Hechizos / Runas</span>
      <div class="opciones">
        <label><input type="radio" value="predefinido" bind:group={reglas.hechizos} /> Hechizos predef.</label>
        <label><input type="radio" value="libre" bind:group={reglas.hechizos} /> Hechizos libres</label>
        <label><input type="radio" value="predefinido" bind:group={reglas.runas} /> Runas predef.</label>
        <label><input type="radio" value="libre" bind:group={reglas.runas} /> Runas libres</label>
      </div>
    </div>
  {/if}

  {#if mostrarPuntos && puntos}
    <div class="regla">
      <span class="regla__lbl">Puntos</span>
      <div class="puntos">
        <label>Victoria <input type="number" min="0" max="10" bind:value={puntos.victoria} /></label>
        <label>Empate <input type="number" min="0" max="10" bind:value={puntos.empate} /></label>
        <label>Derrota <input type="number" min="0" max="10" bind:value={puntos.derrota} /></label>
      </div>
    </div>
  {/if}

  <p class="fijas">ARAM · 1v1 · 100 creeps | 1 kill | 1 tower</p>
</fieldset>

<style>
  .reglas {
    border: 1px solid var(--borde-oro-tenue);
    border-radius: 3px;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
    margin: 0;
    transition: opacity 0.2s;
  }
  .reglas:disabled {
    opacity: 0.55;
  }
  .reglas legend {
    font-size: 0.72rem;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--arcano);
    padding: 0 0.4rem;
  }
  .regla {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem 1rem;
    align-items: baseline;
  }
  .regla__lbl {
    min-width: 8rem;
    font-size: 0.75rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--humo);
  }
  .opciones {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem 1rem;
  }
  .opciones label,
  .puntos label {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.9rem;
    color: var(--oro-claro);
    cursor: pointer;
  }
  .opciones em {
    color: var(--humo);
    font-size: 0.75rem;
  }
  .puntos {
    display: flex;
    flex-wrap: wrap;
    gap: 0.8rem;
  }
  .puntos input {
    width: 3.4rem;
    background: rgba(7, 11, 18, 0.6);
    border: 1px solid var(--borde-oro);
    border-radius: 2px;
    color: var(--oro-claro);
    padding: 0.3rem 0.4rem;
    font-size: 0.9rem;
  }
  .fijas {
    margin: 0;
    font-size: 0.78rem;
    letter-spacing: 0.1em;
    color: var(--oro);
    opacity: 0.85;
  }

  @media (max-width: 520px) {
    .regla__lbl {
      min-width: 100%;
    }
  }
</style>
