<script>
  // Fase 4.3 + 4.4a — Detalle de una temporada: estadísticas agregadas de todos
  // sus torneos, historial de combates y descarga de la tarjeta resumen (PNG).
  // Sólo lee y deriva; la gestión (asignar/renombrar/cerrar) vive en la lista.
  import { estado } from '../core/estado.svelte.js'
  import { irA } from '../ui/ruta.svelte.js'
  import { resumenEstadisticas } from '../core/estadisticas.js'
  import { descargarTarjetaTemporada } from './tarjetaTemporada.js'
  import EstadisticasPanel from '../estadisticas/EstadisticasPanel.svelte'
  import HistorialDuelos from '../torneo/HistorialDuelos.svelte'

  let { temporada } = $props()

  const NOMBRE_TIPO = { tabla: 'Liga', grupos: 'Fase de grupos', bracket: 'Eliminatoria', suizo: 'Suizo' }

  const torneos = $derived(estado.torneos.filter((t) => t.temporadaId === temporada.id))
  const torneoIds = $derived(new Set(torneos.map((t) => t.id)))
  const duelos = $derived(
    estado.duelos.filter((d) => d.estado === 'terminado' && torneoIds.has(d.torneoId))
  )
  const resumen = $derived(resumenEstadisticas(duelos))
  const finalizados = $derived(torneos.filter((t) => t.estado === 'finalizado').length)

  const nombreDe = (/** @type {string} */ id) =>
    estado.participantes.find((p) => p.id === id)?.nombre ?? '—'

  const fecha = (/** @type {string} */ iso) => {
    if (!iso) return ''
    try {
      return new Date(iso).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
    } catch {
      return ''
    }
  }

  let generando = $state(false)
  async function descargar() {
    if (generando) return
    generando = true
    try {
      await descargarTarjetaTemporada({
        temporada: $state.snapshot(temporada),
        resumen,
        nTorneos: torneos.length,
      })
    } finally {
      generando = false
    }
  }
</script>

<section class="detalle">
  <a class="volver" href="#/temporadas" onclick={(e) => { e.preventDefault(); irA('temporadas') }}>← Temporadas</a>

  <header class="cab">
    <p class="cab__marca">Temporada {temporada.fin ? '· 🔒 cerrada' : '· en curso'}</p>
    <h1 class="cab__titulo texto-oro">{temporada.nombre}</h1>
    <p class="cab__desc">
      {fecha(temporada.inicio)} — {temporada.fin ? fecha(temporada.fin) : 'en curso'} ·
      {torneos.length} {torneos.length === 1 ? 'torneo' : 'torneos'}
      {#if torneos.length}({finalizados} finalizado{finalizados === 1 ? '' : 's'}){/if} ·
      {resumen.totales.duelos} combates
    </p>
  </header>

  <div class="acc">
    <button class="boton" type="button" onclick={descargar} disabled={generando || resumen.totales.duelos === 0}>
      {generando ? 'Generando…' : '🖼️ Descargar tarjeta resumen'}
    </button>
  </div>

  <div class="bloque">
    <EstadisticasPanel {duelos} titulo="Estadísticas de la temporada" abierto={true} />
  </div>

  {#if torneos.length > 0}
    <div class="bloque">
      <h3 class="bloque__tit">Torneos de la temporada</h3>
      <ul class="torneos-lista">
        {#each torneos as x (x.id)}
          <li class="trow">
            <button class="trow__nom" type="button" onclick={() => irA(`torneos/${x.id}`)}>{x.nombre}</button>
            <span class="trow__meta">
              {NOMBRE_TIPO[x.etapas[0]?.tipo] ?? '—'} · {x.reglas.formato}
              {#if x.estado === 'finalizado' && x.campeon}· 🏆 {nombreDe(x.campeon)}{/if}
            </span>
            <span class="estado estado--{x.estado}">{x.estado.replace('_', ' ')}</span>
          </li>
        {/each}
      </ul>
    </div>
  {/if}

  {#if duelos.length > 0}
    <div class="bloque">
      <HistorialDuelos {duelos} titulo="Historial de la temporada" />
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
    margin-bottom: 1.2rem;
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
  .cab__desc {
    margin: 0.7rem 0 0;
    font-size: 0.8rem;
    letter-spacing: 0.04em;
    color: var(--humo);
  }

  .acc {
    display: flex;
    justify-content: center;
    margin-bottom: 1.4rem;
  }
  .bloque {
    margin-top: 1.4rem;
  }
  .bloque__tit {
    margin: 0 0 0.7rem;
    font-family: var(--fuente-display);
    font-weight: 700;
    font-size: 0.9rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--oro);
  }

  .torneos-lista {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }
  .trow {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
    padding: 0.45rem 0.6rem;
    border: 1px solid var(--borde-oro-tenue);
    border-radius: 3px;
    background: rgba(7, 11, 18, 0.35);
  }
  .trow__nom {
    background: transparent;
    border: 0;
    color: var(--oro-claro);
    font-family: var(--fuente-display);
    font-weight: 600;
    font-size: 1rem;
    cursor: pointer;
    text-align: left;
    padding: 0;
  }
  .trow__nom:hover {
    color: var(--oro);
    text-decoration: underline;
  }
  .trow__meta {
    flex: 1;
    min-width: 8rem;
    font-size: 0.72rem;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: var(--humo);
  }
  .estado {
    font-size: 0.66rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    padding: 0.22rem 0.5rem;
    border-radius: 999px;
    border: 1px solid var(--borde-oro-tenue);
    color: var(--humo);
    white-space: nowrap;
  }
  .estado--en_curso {
    color: var(--arcano);
    border-color: var(--borde-arcano);
  }
  .estado--finalizado {
    color: var(--oro);
    border-color: var(--borde-oro);
  }

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
    cursor: not-allowed;
    filter: grayscale(0.5) brightness(0.72);
  }
</style>
