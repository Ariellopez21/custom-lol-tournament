<script>
  // Fase 3.3 — Shell del detalle de un torneo (multi-etapa). Navega entre etapas
  // y despacha cada una a su vista (tabla / grupos / bracket). El avance entre
  // etapas es manual: al cerrar una etapa se puede abrir otra eligiendo a mano
  // quiénes pasan (repechajes incluidos).
  import { untrack } from 'svelte'
  import { fade } from 'svelte/transition'
  import { irA } from '../ui/ruta.svelte.js'
  import { estado, reabrirTorneo, agregarEtapa } from '../core/estado.svelte.js'
  import TablaVista from './TablaVista.svelte'
  import GruposVista from './GruposVista.svelte'
  import BracketVista from './BracketVista.svelte'
  import HistorialDuelos from './HistorialDuelos.svelte'
  import EstadisticasPanel from '../estadisticas/EstadisticasPanel.svelte'

  let { torneo } = $props()

  // Historial (4.2): todos los duelos terminados del torneo (todas las etapas).
  const duelosTorneo = $derived(
    estado.duelos.filter((d) => d.torneoId === torneo.id && d.estado === 'terminado')
  )

  const POTENCIAS = [4, 8, 16, 32, 64]

  let etapaSel = $state(untrack(() => Math.max(0, torneo.etapas.length - 1)))
  const etapas = $derived(torneo.etapas)
  const idxActivo = $derived(Math.min(etapaSel, etapas.length - 1))
  const etapaActiva = $derived(etapas[idxActivo])
  const ultima = $derived(etapas[etapas.length - 1])
  const puedeAbrirSiguiente = $derived(
    ultima?.estado === 'finalizada' && torneo.estado !== 'finalizado'
  )

  const nombreDe = (/** @type {string} */ id) =>
    estado.participantes.find((p) => p.id === id)?.nombre ?? '—'

  // ── Abrir siguiente etapa ────────────────────────────
  let abriendo = $state(false)
  let nuevoTipo = $state('bracket')
  let sel = $state(new Set())
  const nSel = $derived(sel.size)
  const nuevoValido = $derived(nuevoTipo === 'bracket' ? POTENCIAS.includes(nSel) : nSel >= 2)

  function alternar(/** @type {string} */ id) {
    const s = new Set(sel)
    s.has(id) ? s.delete(id) : s.add(id)
    sel = s
  }
  function abrirPanel() {
    abriendo = true
    nuevoTipo = 'bracket'
    sel = new Set()
  }
  function crearEtapa() {
    if (!nuevoValido) return
    agregarEtapa(torneo.id, { tipo: nuevoTipo, participantes: [...sel] })
    etapaSel = torneo.etapas.length - 1
    abriendo = false
  }
</script>

<section class="detalle">
  <a class="volver" href="#/torneos" onclick={(e) => { e.preventDefault(); irA('torneos') }}>← Torneos</a>

  <header class="cab">
    <p class="cab__marca">Torneo · {torneo.reglas.resolucion === 'ruleta' ? 'Ruleta' : 'Manual'} {torneo.reglas.formato}</p>
    <h1 class="cab__titulo texto-oro">{torneo.nombre}</h1>
  </header>

  {#if torneo.estado === 'finalizado'}
    <div class="campeon" transition:fade={{ duration: 250 }}>
      <span class="campeon__lbl">🏆 Campeón</span>
      <span class="campeon__nom texto-oro">{torneo.campeon ? nombreDe(torneo.campeon) : '—'}</span>
      <button class="mini" type="button" onclick={() => reabrirTorneo(torneo.id)}>Reabrir</button>
    </div>
  {/if}

  {#if etapas.length > 1}
    <nav class="etapas" aria-label="Etapas del torneo">
      {#each etapas as e, i (e.id)}
        <button
          class="etapa-tab"
          class:etapa-tab--on={i === idxActivo}
          type="button"
          onclick={() => (etapaSel = i)}
        >
          <span class="etapa-tab__n">{i + 1}</span>
          {e.nombre}
          {#if e.estado === 'finalizada'}<span class="etapa-tab__lock" title="Cerrada">🔒</span>{/if}
        </button>
      {/each}
    </nav>
  {/if}

  {#if etapaActiva}
    {#if etapaActiva.tipo === 'tabla'}
      <TablaVista {torneo} etapa={etapaActiva} />
    {:else if etapaActiva.tipo === 'grupos'}
      <GruposVista {torneo} etapa={etapaActiva} />
    {:else if etapaActiva.tipo === 'bracket'}
      <BracketVista {torneo} etapa={etapaActiva} />
    {:else}
      <p class="placeholder">El sistema <b>{etapaActiva.tipo}</b> aún no está disponible.</p>
    {/if}
  {/if}

  {#if puedeAbrirSiguiente}
    <div class="siguiente">
      {#if abriendo}
        <div class="sig-panel" transition:fade={{ duration: 150 }}>
          <span class="sig-panel__lbl">➕ Abrir siguiente etapa</span>
          <div class="sig-tipos">
            {#each [['tabla', 'Liga'], ['grupos', 'Grupos'], ['bracket', 'Eliminatoria']] as [t, lbl] (t)}
              <label class="sig-tipo" class:sig-tipo--on={nuevoTipo === t}>
                <input type="radio" value={t} bind:group={nuevoTipo} /> {lbl}
              </label>
            {/each}
          </div>
          <p class="sig-hint">
            Elige a mano quiénes pasan{#if nuevoTipo === 'bracket'} (bracket: 4/8/16/32/64){/if} · <b>{nSel}</b> elegidos
          </p>
          <div class="sig-chips">
            {#each torneo.participantes as id (id)}
              <button class="chip" class:chip--on={sel.has(id)} type="button" onclick={() => alternar(id)}>
                {nombreDe(id)}
              </button>
            {/each}
          </div>
          <div class="sig-acc">
            <button class="boton" type="button" onclick={crearEtapa} disabled={!nuevoValido}>Crear etapa</button>
            <button class="mini" type="button" onclick={() => (abriendo = false)}>Cancelar</button>
          </div>
        </div>
      {:else}
        <button class="boton" type="button" onclick={abrirPanel}>➕ Abrir siguiente etapa</button>
      {/if}
    </div>
  {/if}

  {#if duelosTorneo.length > 0}
    <div class="historial-wrap">
      <EstadisticasPanel duelos={duelosTorneo} titulo="Estadísticas del torneo" />
    </div>
    <div class="historial-wrap">
      <HistorialDuelos duelos={duelosTorneo} />
    </div>
  {/if}
</section>

<style>
  .detalle {
    width: 100%;
    max-width: 60rem;
    margin: 0 auto;
  }
  .volver {
    display: inline-block;
    margin-bottom: 1rem;
    color: var(--humo);
    text-decoration: none;
    font-size: 0.8rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }
  .volver:hover {
    color: var(--oro-claro);
  }

  .cab {
    text-align: center;
    margin-bottom: 1.4rem;
  }
  .cab__marca {
    margin: 0 0 0.5rem;
    font-size: 11px;
    letter-spacing: 0.32em;
    text-transform: uppercase;
    color: var(--arcano);
  }
  .cab__titulo {
    margin: 0;
    font-family: var(--fuente-display);
    font-weight: 900;
    font-size: clamp(1.8rem, 5vw, 2.8rem);
    line-height: 1.02;
  }

  .campeon {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.8rem;
    padding: 0.8rem;
    margin-bottom: 1.2rem;
    border: 1px solid var(--borde-oro-fuerte);
    border-radius: 4px;
    background: radial-gradient(120% 100% at 50% 0%, rgba(200, 170, 110, 0.12), transparent 70%);
  }
  .campeon__lbl {
    font-size: 0.75rem;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: var(--humo);
  }
  .campeon__nom {
    font-family: var(--fuente-display);
    font-weight: 900;
    font-size: 1.5rem;
  }

  /* ── Pestañas de etapas ──────────────────────────── */
  .etapas {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.4rem;
    margin-bottom: 1.4rem;
  }
  .etapa-tab {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    background: transparent;
    border: 1px solid var(--borde-oro-tenue);
    border-radius: 999px;
    color: var(--humo);
    padding: 0.4rem 0.9rem;
    font-size: 0.8rem;
    cursor: pointer;
    transition: color 0.15s, border-color 0.15s, background 0.15s;
  }
  .etapa-tab:hover {
    color: var(--oro-claro);
    border-color: var(--borde-oro);
  }
  .etapa-tab--on {
    color: var(--oro);
    border-color: var(--borde-oro-fuerte);
    background: rgba(200, 170, 110, 0.07);
  }
  .etapa-tab__n {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.3rem;
    height: 1.3rem;
    border-radius: 50%;
    background: rgba(7, 11, 18, 0.6);
    font-family: var(--fuente-display);
    font-weight: 800;
    font-size: 0.72rem;
  }
  .etapa-tab__lock {
    font-size: 0.72rem;
  }

  .placeholder {
    text-align: center;
    color: var(--humo);
    padding: 2rem;
    border: 1px dashed var(--borde-oro);
    border-radius: 4px;
  }

  .historial-wrap {
    margin-top: 1.8rem;
  }

  /* ── Abrir siguiente etapa ───────────────────────── */
  .siguiente {
    display: flex;
    justify-content: center;
    margin-top: 1.6rem;
  }
  .sig-panel {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.8rem;
    width: 100%;
    padding: 1.1rem;
    border: 1px solid var(--borde-oro);
    border-radius: 4px;
    background: linear-gradient(180deg, rgba(18, 37, 60, 0.4), rgba(7, 11, 18, 0.4));
  }
  .sig-panel__lbl {
    font-family: var(--fuente-display);
    font-weight: 800;
    letter-spacing: 0.1em;
    color: var(--oro-claro);
  }
  .sig-tipos {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  .sig-tipo {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.35rem 0.8rem;
    border: 1px solid var(--borde-oro-tenue);
    border-radius: 999px;
    color: var(--oro-claro);
    font-size: 0.85rem;
    cursor: pointer;
  }
  .sig-tipo--on {
    border-color: var(--borde-oro-fuerte);
    background: rgba(200, 170, 110, 0.06);
    color: var(--oro);
  }
  .sig-tipo input {
    accent-color: var(--oro);
  }
  .sig-hint {
    margin: 0;
    font-size: 0.78rem;
    color: var(--humo);
    text-align: center;
  }
  .sig-hint b {
    color: var(--oro);
  }
  .sig-chips {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.4rem;
  }
  .chip {
    background: transparent;
    border: 1px solid var(--borde-oro);
    border-radius: 999px;
    color: var(--humo);
    padding: 0.35rem 0.8rem;
    font-size: 0.82rem;
    cursor: pointer;
    transition: color 0.15s, border-color 0.15s, background 0.15s;
  }
  .chip:hover {
    color: var(--oro-claro);
    border-color: var(--borde-oro-fuerte);
  }
  .chip--on {
    color: #0a0f18;
    background: var(--oro);
    border-color: var(--oro);
    font-weight: 600;
  }
  .sig-acc {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.5rem;
  }

  /* ── Botones ─────────────────────────────────────── */
  .boton {
    font-family: var(--fuente-display);
    font-weight: 800;
    font-size: 0.9rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: #0a0f18;
    background: var(--oro-degradado);
    border: 1px solid #e4d3a8;
    border-radius: 2px;
    padding: 0.65rem 1.5rem;
    cursor: pointer;
    box-shadow: var(--sombra-boton);
    transition: transform 0.15s, box-shadow 0.25s, filter 0.2s;
  }
  .boton:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: var(--sombra-boton-hover);
  }
  .boton:disabled {
    filter: grayscale(0.5) brightness(0.72);
    cursor: not-allowed;
  }
  .mini {
    background: transparent;
    border: 1px solid var(--borde-oro);
    border-radius: 2px;
    color: var(--humo);
    font-size: 0.72rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    padding: 0.45rem 0.75rem;
    cursor: pointer;
    transition: color 0.15s, border-color 0.15s;
  }
  .mini:hover:not(:disabled) {
    color: var(--oro-claro);
    border-color: var(--borde-oro-fuerte);
  }
</style>
