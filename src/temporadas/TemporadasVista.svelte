<script>
  // Fase 4.1 — Temporadas: agrupan torneos. CRUD de temporadas + asignación de
  // torneos (un torneo pertenece como mucho a una temporada). El historial de
  // "cómo ocurrió" cada torneo vive en su detalle (4.2, HistorialDuelos).
  import {
    estado,
    crearTemporada,
    renombrarTemporada,
    borrarTemporada,
    asignarTorneoATemporada,
    cerrarTemporada,
    reabrirTemporada,
  } from '../core/estado.svelte.js'
  import { ruta, irA } from '../ui/ruta.svelte.js'
  import TemporadaDetalle from './TemporadaDetalle.svelte'

  const NOMBRE_TIPO = { tabla: 'Liga', grupos: 'Fase de grupos', bracket: 'Eliminatoria', suizo: 'Suizo' }

  const temporadas = $derived(estado.temporadas)
  const torneos = $derived(estado.torneos)
  const abierta = $derived(ruta.param ? temporadas.find((t) => t.id === ruta.param) : null)
  const sinTemporada = $derived(torneos.filter((t) => !t.temporadaId))
  const torneosDe = (/** @type {any} */ temp) => torneos.filter((t) => t.temporadaId === temp.id)
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

  let creando = $state(false)
  let nombre = $state('')
  /** @type {string | null} */ let editando = $state(null)
  let nombreEdit = $state('')
  /** @type {string | null} */ let confirmBorrar = $state(null)
  /** @type {Record<string, string>} */ let addSel = $state({})

  function crear() {
    const t = crearTemporada(nombre)
    if (t) {
      nombre = ''
      creando = false
    }
  }
  function empezarEdit(/** @type {any} */ t) {
    editando = t.id
    nombreEdit = t.nombre
  }
  function guardarEdit() {
    if (editando) renombrarTemporada(editando, nombreEdit)
    editando = null
  }
  function anadir(/** @type {string} */ tempId) {
    const tid = addSel[tempId]
    if (tid) {
      asignarTorneoATemporada(tid, tempId)
      addSel[tempId] = ''
    }
  }
  function borrar(/** @type {string} */ id) {
    borrarTemporada(id)
    confirmBorrar = null
  }
</script>

{#if abierta}
  {#key abierta.id}
    <TemporadaDetalle temporada={abierta} />
  {/key}
{:else}
<section class="temporadas">
  <header class="cab">
    <p class="cab__marca">Fase 4 · Temporadas</p>
    <h1 class="cab__titulo texto-oro">Temporadas</h1>
    <p class="cab__desc">
      {#if temporadas.length === 0}
        Agrupa tus torneos en temporadas para llevar el registro de cada época.
      {:else}
        {temporadas.length} {temporadas.length === 1 ? 'temporada' : 'temporadas'} ·
        {torneos.length} {torneos.length === 1 ? 'torneo' : 'torneos'} en total.
      {/if}
    </p>
  </header>

  <div class="top">
    {#if creando}
      <form class="crear" onsubmit={(e) => { e.preventDefault(); crear() }}>
        <input class="entrada" type="text" bind:value={nombre} maxlength="40" placeholder="Temporada 2026 · Verano" autocomplete="off" aria-label="Nombre de la temporada" />
        <button class="boton" type="submit" disabled={!nombre.trim()}>Crear</button>
        <button class="mini" type="button" onclick={() => { creando = false; nombre = '' }}>Cancelar</button>
      </form>
    {:else}
      <button class="boton" type="button" onclick={() => (creando = true)}>+ Nueva temporada</button>
    {/if}
  </div>

  <!-- Temporadas -->
  {#if temporadas.length > 0}
    <ul class="lista">
      {#each temporadas as t (t.id)}
        {@const misTorneos = torneosDe(t)}
        {@const finalizados = misTorneos.filter((x) => x.estado === 'finalizado').length}
        <li class="scard">
          <header class="scard__cab">
            <div class="scard__id">
              {#if editando === t.id}
                <input class="entrada entrada--sm" type="text" bind:value={nombreEdit} maxlength="40" aria-label="Nuevo nombre" />
                <button class="mini mini--ok" type="button" onclick={guardarEdit}>Guardar</button>
                <button class="mini" type="button" onclick={() => (editando = null)}>✕</button>
              {:else}
                <h2 class="scard__nom">{t.nombre}</h2>
                <button class="icono" type="button" onclick={() => empezarEdit(t)} title="Renombrar" aria-label="Renombrar temporada">✎</button>
              {/if}
            </div>
            <span class="scard__fechas">
              {fecha(t.inicio)} — {t.fin ? fecha(t.fin) : 'en curso'}
            </span>
          </header>

          <p class="scard__meta">
            {misTorneos.length} {misTorneos.length === 1 ? 'torneo' : 'torneos'}
            {#if misTorneos.length}· {finalizados} finalizado{finalizados === 1 ? '' : 's'}{/if}
            {#if t.fin}· 🔒 cerrada{/if}
          </p>

          {#if misTorneos.length > 0}
            <ul class="torneos-lista">
              {#each misTorneos as x (x.id)}
                <li class="trow">
                  <button class="trow__nom" type="button" onclick={() => irA(`torneos/${x.id}`)}>{x.nombre}</button>
                  <span class="trow__meta">
                    {NOMBRE_TIPO[x.etapas[0]?.tipo] ?? '—'} · {x.reglas.formato}
                    {#if x.estado === 'finalizado' && x.campeon}· 🏆 {nombreDe(x.campeon)}{/if}
                  </span>
                  <span class="estado estado--{x.estado}">{x.estado.replace('_', ' ')}</span>
                  <button class="mini" type="button" onclick={() => asignarTorneoATemporada(x.id, null)} title="Quitar de la temporada">Quitar</button>
                </li>
              {/each}
            </ul>
          {:else}
            <p class="scard__vacio">Sin torneos todavía.</p>
          {/if}

          <div class="scard__acc">
            {#if sinTemporada.length > 0}
              <div class="anadir">
                <select bind:value={addSel[t.id]} aria-label="Añadir torneo a {t.nombre}">
                  <option value="" disabled selected>+ Añadir torneo…</option>
                  {#each sinTemporada as x (x.id)}
                    <option value={x.id}>{x.nombre}</option>
                  {/each}
                </select>
                <button class="mini" type="button" onclick={() => anadir(t.id)} disabled={!addSel[t.id]}>Añadir</button>
              </div>
            {/if}
            <div class="scard__acc-der">
              <button class="mini mini--abrir" type="button" onclick={() => irA(`temporadas/${t.id}`)}>📊 Resumen</button>
              {#if t.fin}
                <button class="mini" type="button" onclick={() => reabrirTemporada(t.id)}>Reabrir</button>
              {:else}
                <button class="mini" type="button" onclick={() => cerrarTemporada(t.id)}>Cerrar temporada</button>
              {/if}
              {#if confirmBorrar === t.id}
                <span class="conf">¿Borrar?</span>
                <button class="mini mini--peligro" type="button" onclick={() => borrar(t.id)}>Sí</button>
                <button class="mini" type="button" onclick={() => (confirmBorrar = null)}>No</button>
              {:else}
                <button class="mini mini--peligro" type="button" onclick={() => (confirmBorrar = t.id)}>Borrar</button>
              {/if}
            </div>
          </div>
        </li>
      {/each}
    </ul>
  {/if}

  <!-- Torneos sin temporada -->
  {#if sinTemporada.length > 0}
    <div class="sueltos">
      <h3 class="sueltos__tit">Torneos sin temporada · {sinTemporada.length}</h3>
      {#if temporadas.length === 0}
        <p class="sueltos__hint">Crea una temporada para agruparlos.</p>
      {/if}
      <ul class="torneos-lista">
        {#each sinTemporada as x (x.id)}
          <li class="trow">
            <button class="trow__nom" type="button" onclick={() => irA(`torneos/${x.id}`)}>{x.nombre}</button>
            <span class="trow__meta">
              {NOMBRE_TIPO[x.etapas[0]?.tipo] ?? '—'} · {x.reglas.formato}
              {#if x.estado === 'finalizado' && x.campeon}· 🏆 {nombreDe(x.campeon)}{/if}
            </span>
            <span class="estado estado--{x.estado}">{x.estado.replace('_', ' ')}</span>
            {#if temporadas.length > 0}
              <select
                aria-label="Asignar {x.nombre} a temporada"
                onchange={(e) => { asignarTorneoATemporada(x.id, e.currentTarget.value); e.currentTarget.value = '' }}
              >
                <option value="" disabled selected>→ Temporada…</option>
                {#each temporadas as t (t.id)}
                  <option value={t.id}>{t.nombre}</option>
                {/each}
              </select>
            {/if}
          </li>
        {/each}
      </ul>
    </div>
  {:else if torneos.length === 0}
    <p class="nota">Aún no hay torneos. Crea uno en la sección <a href="#/torneos">Torneos</a>.</p>
  {/if}
</section>
{/if}

<style>
  .temporadas {
    width: 100%;
    max-width: 52rem;
    margin: 0 auto;
  }
  .cab {
    text-align: center;
    margin-bottom: clamp(1.2rem, 3.5vw, 2rem);
  }
  .cab__marca {
    margin: 0 0 0.7rem;
    font-size: 11px;
    letter-spacing: 0.42em;
    text-transform: uppercase;
    color: var(--arcano);
  }
  .cab__titulo {
    margin: 0;
    font-family: var(--fuente-display);
    font-weight: 900;
    font-size: clamp(1.9rem, 5.5vw, 3rem);
    line-height: 1.02;
  }
  .cab__desc {
    margin: 0.9rem 0 0;
    color: var(--humo);
  }

  .top {
    display: flex;
    justify-content: center;
    margin-bottom: 1.6rem;
  }
  .crear {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    align-items: center;
    justify-content: center;
  }

  .entrada {
    background: rgba(7, 11, 18, 0.6);
    border: 1px solid var(--borde-oro);
    border-radius: 2px;
    color: var(--oro-claro);
    font-family: var(--fuente-display);
    font-weight: 600;
    font-size: 1rem;
    padding: 0.6rem 0.75rem;
    min-width: 14rem;
  }
  .entrada--sm {
    font-size: 0.95rem;
    padding: 0.4rem 0.55rem;
    min-width: 10rem;
  }
  .entrada:focus {
    outline: none;
    border-color: var(--arcano);
    box-shadow: var(--brillo-arcano);
  }

  .lista {
    list-style: none;
    margin: 0 0 1.8rem;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.8rem;
  }
  .scard {
    padding: 1rem 1.1rem;
    border: 1px solid var(--borde-oro);
    border-radius: 4px;
    background: linear-gradient(180deg, rgba(18, 37, 60, 0.45), rgba(7, 11, 18, 0.45));
  }
  .scard__cab {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    justify-content: space-between;
    gap: 0.5rem;
  }
  .scard__id {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-width: 0;
  }
  .scard__nom {
    margin: 0;
    font-family: var(--fuente-display);
    font-weight: 800;
    font-size: 1.3rem;
    color: var(--oro-claro);
    overflow-wrap: anywhere;
  }
  .icono {
    background: transparent;
    border: 0;
    color: var(--humo);
    cursor: pointer;
    font-size: 0.9rem;
    padding: 0.1rem 0.3rem;
  }
  .icono:hover {
    color: var(--oro-claro);
  }
  .scard__fechas {
    font-size: 0.72rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--humo);
  }
  .scard__meta {
    margin: 0.3rem 0 0.7rem;
    font-size: 0.75rem;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: var(--humo);
  }
  .scard__vacio {
    margin: 0 0 0.7rem;
    color: var(--humo);
    font-size: 0.85rem;
  }

  .torneos-lista {
    list-style: none;
    margin: 0 0 0.7rem;
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

  .scard__acc {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.6rem;
    margin-top: 0.6rem;
    padding-top: 0.7rem;
    border-top: 1px solid var(--borde-oro-tenue);
  }
  .scard__acc-der {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.4rem;
  }
  .anadir {
    display: flex;
    gap: 0.4rem;
  }
  select {
    background: rgba(7, 11, 18, 0.7);
    border: 1px solid var(--borde-oro);
    border-radius: 2px;
    color: var(--oro-claro);
    padding: 0.4rem 0.5rem;
    font-size: 0.82rem;
  }

  .sueltos {
    padding: 1rem 1.1rem;
    border: 1px dashed var(--borde-oro);
    border-radius: 4px;
  }
  .sueltos__tit {
    margin: 0 0 0.7rem;
    font-family: var(--fuente-display);
    font-weight: 700;
    font-size: 0.9rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--oro);
  }
  .sueltos__hint {
    margin: 0 0 0.7rem;
    color: var(--humo);
    font-size: 0.85rem;
  }
  .nota {
    text-align: center;
    color: var(--humo);
    font-size: 0.9rem;
  }
  .nota a {
    color: var(--arcano);
    text-decoration: none;
  }
  .nota a:hover {
    text-decoration: underline;
  }
  .conf {
    font-size: 0.75rem;
    color: var(--humo);
  }

  /* Botones */
  .boton {
    font-family: var(--fuente-display);
    font-weight: 800;
    font-size: 0.9rem;
    letter-spacing: 0.16em;
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
  .mini {
    background: transparent;
    border: 1px solid var(--borde-oro);
    border-radius: 2px;
    color: var(--humo);
    font-size: 0.7rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    padding: 0.38rem 0.65rem;
    cursor: pointer;
    transition: color 0.15s, border-color 0.15s;
  }
  .mini:hover:not(:disabled) {
    color: var(--oro-claro);
    border-color: var(--borde-oro-fuerte);
  }
  .mini:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
  .mini--ok {
    color: var(--arcano);
    border-color: var(--borde-arcano);
  }
  .mini--abrir {
    color: var(--oro);
    border-color: var(--borde-oro);
  }
  .mini--peligro:hover {
    color: var(--sangre);
    border-color: rgba(192, 69, 92, 0.6);
  }
</style>
