<script>
  // Fase 2.1 — CRUD de participantes (invocadores).
  // El editor de champion pool (2.2) llega después; aquí solo mostramos su tamaño.
  import {
    estado,
    crearParticipante,
    renombrarParticipante,
    borrarParticipante,
  } from '../core/estado.svelte.js'
  import { CHAMPIONS } from '../core/champions.js'
  import EditorPool from './EditorPool.svelte'

  const TOTAL = CHAMPIONS.length

  let nombre = $state('')
  let editandoId = $state(null)
  let nombreEdit = $state('')
  let confirmandoId = $state(null)
  let poolDe = $state(null) // participante cuyo pool se está editando

  const participantes = $derived(estado.participantes)

  function agregar() {
    if (crearParticipante(nombre)) nombre = ''
  }

  function iniciarEdicion(p) {
    confirmandoId = null
    nombreEdit = p.nombre
    editandoId = p.id
  }
  function guardarEdicion() {
    renombrarParticipante(editandoId, nombreEdit)
    editandoId = null
  }
  function cancelarEdicion() {
    editandoId = null
  }
  function borrar(id) {
    borrarParticipante(id)
    confirmandoId = null
  }

  const inicial = (n) => (n.trim()[0] ?? '?').toUpperCase()
  const tamanoPool = (p) =>
    p.championPool.length === 0 ? `Todos (${TOTAL})` : `${p.championPool.length} de ${TOTAL}`
  const fecha = (iso) => {
    try {
      return new Date(iso).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })
    } catch {
      return ''
    }
  }
</script>

<section class="participantes">
  <header class="cab">
    <p class="cab__marca">Fase 2 · Participantes &amp; Pools</p>
    <h1 class="cab__titulo texto-oro">Invocadores</h1>
    <p class="cab__desc">
      {#if participantes.length === 0}
        Aún no hay invocadores. Crea el primero para empezar a armar torneos.
      {:else}
        {participantes.length}
        {participantes.length === 1 ? 'invocador' : 'invocadores'} en tu registro.
      {/if}
    </p>
  </header>

  <form class="alta" onsubmit={(e) => { e.preventDefault(); agregar() }}>
    <input
      class="alta__input"
      type="text"
      placeholder="Nombre del invocador"
      bind:value={nombre}
      maxlength="24"
      autocomplete="off"
      aria-label="Nombre del nuevo invocador"
    />
    <button class="boton" type="submit" disabled={!nombre.trim()}>Añadir</button>
  </form>

  {#if participantes.length > 0}
    <ul class="lista">
      {#each participantes as p (p.id)}
        <li class="tarjeta">
          <div class="tarjeta__avatar" aria-hidden="true">{inicial(p.nombre)}</div>

          <div class="tarjeta__cuerpo">
            {#if editandoId === p.id}
              <!-- svelte-ignore a11y_autofocus -->
              <input
                class="tarjeta__editar"
                type="text"
                bind:value={nombreEdit}
                maxlength="24"
                autocomplete="off"
                aria-label="Nuevo nombre del invocador"
                autofocus
                onkeydown={(e) => {
                  if (e.key === 'Enter') guardarEdicion()
                  if (e.key === 'Escape') cancelarEdicion()
                }}
              />
            {:else}
              <span class="tarjeta__nombre">{p.nombre}</span>
            {/if}
            <span class="tarjeta__meta">Pool: {tamanoPool(p)} · {fecha(p.creadoEn)}</span>
          </div>

          <div class="tarjeta__acciones">
            {#if editandoId === p.id}
              <button class="mini mini--ok" type="button" onclick={guardarEdicion} disabled={!nombreEdit.trim()}>
                Guardar
              </button>
              <button class="mini" type="button" onclick={cancelarEdicion}>Cancelar</button>
            {:else if confirmandoId === p.id}
              <span class="confirmar">¿Borrar?</span>
              <button class="mini mini--peligro" type="button" onclick={() => borrar(p.id)}>Sí</button>
              <button class="mini" type="button" onclick={() => (confirmandoId = null)}>No</button>
            {:else}
              <button class="mini mini--pool" type="button" onclick={() => (poolDe = p)}>Pool</button>
              <button class="mini" type="button" onclick={() => iniciarEdicion(p)}>Editar</button>
              <button
                class="mini mini--peligro"
                type="button"
                onclick={() => { editandoId = null; confirmandoId = p.id }}
              >
                Borrar
              </button>
            {/if}
          </div>
        </li>
      {/each}
    </ul>
  {/if}

  {#if poolDe}
    <EditorPool participante={poolDe} onCerrar={() => (poolDe = null)} />
  {/if}
</section>

<style>
  .participantes {
    width: 100%;
    max-width: 46rem;
    margin: 0 auto;
  }

  /* ── Cabecera ─────────────────────────────────────── */
  .cab {
    text-align: center;
    margin-bottom: clamp(1.5rem, 4vw, 2.4rem);
  }
  .cab__marca {
    margin: 0 0 0.75rem;
    padding-left: 0.5em;
    font-size: 11px;
    font-weight: 500;
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
    letter-spacing: 0.02em;
  }
  .cab__desc {
    margin: 0.9rem 0 0;
    color: var(--humo);
    font-size: clamp(0.9rem, 1.5vw, 1rem);
  }

  /* ── Alta ─────────────────────────────────────────── */
  .alta {
    display: flex;
    gap: 0.6rem;
    margin-bottom: clamp(1.4rem, 3.5vw, 2rem);
  }
  .alta__input {
    flex: 1;
    min-width: 0;
    background: linear-gradient(180deg, rgba(22, 35, 58, 0.9), rgba(12, 21, 38, 0.9));
    border: 1px solid var(--borde-oro);
    border-radius: 2px;
    color: var(--oro-claro);
    font-family: var(--fuente-display);
    font-weight: 600;
    font-size: clamp(1rem, 2vw, 1.15rem);
    padding: 0.8rem 1rem;
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  .alta__input::placeholder {
    color: rgba(122, 138, 160, 0.55);
    font-weight: 400;
  }
  .alta__input:hover {
    border-color: var(--borde-oro-fuerte);
  }
  .alta__input:focus {
    outline: none;
    border-color: var(--arcano);
    box-shadow: var(--brillo-arcano);
  }

  /* ── Botón dorado (del design system) ─────────────── */
  .boton {
    flex-shrink: 0;
    font-family: var(--fuente-display);
    font-weight: 800;
    font-size: clamp(0.85rem, 1.6vw, 1rem);
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: #0a0f18;
    background: var(--oro-degradado);
    border: 1px solid #e4d3a8;
    border-radius: 2px;
    padding: 0 clamp(1.2rem, 3vw, 2rem);
    cursor: pointer;
    transition: transform 0.15s, box-shadow 0.25s, filter 0.2s;
    box-shadow: var(--sombra-boton);
  }
  .boton:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: var(--sombra-boton-hover);
  }
  .boton:active:not(:disabled) {
    transform: translateY(0);
  }
  .boton:focus-visible {
    outline: 2px solid var(--arcano);
    outline-offset: 3px;
  }
  .boton:disabled {
    cursor: not-allowed;
    filter: grayscale(0.5) brightness(0.72);
  }

  /* ── Lista de tarjetas ────────────────────────────── */
  .lista {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }
  .tarjeta {
    display: flex;
    align-items: center;
    gap: 0.9rem;
    padding: 0.7rem 0.85rem;
    background: linear-gradient(180deg, rgba(18, 37, 60, 0.5), rgba(7, 11, 18, 0.5));
    border: 1px solid var(--borde-oro-tenue);
    border-radius: 3px;
    transition: border-color 0.15s;
  }
  .tarjeta:hover {
    border-color: var(--borde-oro);
  }
  .tarjeta__avatar {
    flex-shrink: 0;
    width: 42px;
    height: 42px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    border: 1px solid var(--borde-oro-fuerte);
    background: radial-gradient(circle at 50% 30%, rgba(200, 170, 110, 0.18), transparent 70%);
    font-family: var(--fuente-display);
    font-weight: 800;
    font-size: 1.1rem;
    color: var(--oro);
  }
  .tarjeta__cuerpo {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .tarjeta__nombre {
    font-family: var(--fuente-display);
    font-weight: 600;
    font-size: clamp(1rem, 2vw, 1.2rem);
    color: var(--oro-claro);
    overflow-wrap: anywhere;
  }
  .tarjeta__editar {
    width: 100%;
    background: rgba(7, 11, 18, 0.6);
    border: 1px solid var(--arcano);
    border-radius: 2px;
    color: var(--oro-claro);
    font-family: var(--fuente-display);
    font-weight: 600;
    font-size: clamp(1rem, 2vw, 1.2rem);
    padding: 0.35rem 0.5rem;
  }
  .tarjeta__editar:focus {
    outline: none;
    box-shadow: var(--brillo-arcano);
  }
  .tarjeta__meta {
    font-size: 0.72rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--humo);
  }

  /* ── Acciones por tarjeta ─────────────────────────── */
  .tarjeta__acciones {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }
  .confirmar {
    font-size: 0.78rem;
    color: var(--humo);
    margin-right: 0.1rem;
  }
  .mini {
    background: transparent;
    border: 1px solid var(--borde-oro);
    border-radius: 2px;
    color: var(--humo);
    font-size: 0.72rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    padding: 0.4rem 0.7rem;
    cursor: pointer;
    transition: color 0.15s, border-color 0.15s, background 0.15s;
  }
  .mini:hover:not(:disabled) {
    color: var(--oro-claro);
    border-color: var(--borde-oro-fuerte);
  }
  .mini:focus-visible {
    outline: 2px solid var(--arcano);
    outline-offset: 2px;
  }
  .mini:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
  .mini--ok {
    color: var(--arcano);
    border-color: var(--borde-arcano);
  }
  .mini--pool {
    color: var(--oro);
    border-color: var(--borde-oro);
  }
  .mini--pool:hover:not(:disabled) {
    color: var(--oro-claro);
    border-color: var(--borde-oro-fuerte);
  }
  .mini--peligro:hover:not(:disabled) {
    color: var(--sangre);
    border-color: rgba(192, 69, 92, 0.6);
  }

  @media (max-width: 520px) {
    .alta {
      flex-direction: column;
    }
    .boton {
      padding: 0.75rem 1rem;
    }
    .tarjeta {
      flex-wrap: wrap;
    }
    .tarjeta__acciones {
      width: 100%;
      justify-content: flex-end;
    }
  }
</style>
