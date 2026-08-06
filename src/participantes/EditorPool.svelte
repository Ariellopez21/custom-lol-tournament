<script>
  // Fase 2.2 — Editor de Champion Pool de un participante.
  // Modal: rejilla de los 173 retratos con buscador; selección por lotes con
  // Guardar/Cancelar. Convención del modelo: pool vacío = "todos los 173".
  import { untrack } from 'svelte'
  import { CHAMPIONS } from '../core/champions.js'
  import { definirPool } from '../core/estado.svelte.js'

  let { participante, onCerrar } = $props()

  const TOTAL = CHAMPIONS.length

  // Set de trabajo. Si el pool guardado está vacío, arrancamos con "todos".
  // `untrack`: queremos la foto INICIAL del pool al abrir el modal, no re-derivar
  // si `participante` cambiara (mismo patrón que la siembra inicial del bracket).
  const desdeGuardado = untrack(() =>
    participante.championPool.length === 0
      ? new Set(CHAMPIONS.map((c) => c.id))
      : new Set(participante.championPool)
  )

  let seleccion = $state(desdeGuardado)
  let busqueda = $state('')

  const termino = $derived(busqueda.trim().toLowerCase())
  const filtrados = $derived(
    termino ? CHAMPIONS.filter((c) => c.nombre.toLowerCase().includes(termino)) : CHAMPIONS
  )
  const cuenta = $derived(seleccion.size)

  // Reasignamos el Set en cada cambio para garantizar la reactividad.
  function alternar(id) {
    const s = new Set(seleccion)
    s.has(id) ? s.delete(id) : s.add(id)
    seleccion = s
  }
  const marcarTodos = () => (seleccion = new Set(CHAMPIONS.map((c) => c.id)))
  const marcarNinguno = () => (seleccion = new Set())

  function guardar() {
    if (cuenta === 0) return
    definirPool(participante.id, [...seleccion])
    onCerrar()
  }
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && onCerrar()} />

<!-- Clic en el fondo (no en el panel) cierra: comparamos target === currentTarget
     en vez de stopPropagation en el panel, así el panel no necesita onclick. -->
<div
  class="fondo"
  role="presentation"
  onclick={(e) => e.target === e.currentTarget && onCerrar()}
>
  <div
    class="panel"
    role="dialog"
    aria-modal="true"
    tabindex="-1"
    aria-label={`Champion pool de ${participante.nombre}`}
  >
    <header class="panel__cab">
      <div class="panel__titulos">
        <p class="panel__marca">Champion Pool</p>
        <h2 class="panel__nombre texto-oro">{participante.nombre}</h2>
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
      <div class="barra__acciones">
        <button class="mini" type="button" onclick={marcarTodos}>Todos</button>
        <button class="mini" type="button" onclick={marcarNinguno}>Ninguno</button>
      </div>
    </div>

    <div class="rejilla" role="listbox" aria-label="Campeones">
      {#each filtrados as c (c.id)}
        <button
          class="ficha"
          class:activa={seleccion.has(c.id)}
          type="button"
          role="option"
          aria-selected={seleccion.has(c.id)}
          onclick={() => alternar(c.id)}
          title={c.nombre}
        >
          <span class="ficha__marco">
            <img class="ficha__img" src={c.img} alt="" loading="lazy" />
            <span class="ficha__check" aria-hidden="true">✓</span>
          </span>
          <span class="ficha__nombre">{c.nombre}</span>
        </button>
      {/each}
      {#if filtrados.length === 0}
        <p class="vacio">Sin resultados para «{busqueda}».</p>
      {/if}
    </div>

    <footer class="panel__pie">
      <span class="cuenta" class:cuenta--cero={cuenta === 0}>
        {cuenta} / {TOTAL}{cuenta === TOTAL ? ' · todos' : ''}
      </span>
      <div class="panel__pie-acciones">
        {#if cuenta === 0}<span class="aviso">Elige al menos 1</span>{/if}
        <button class="mini" type="button" onclick={onCerrar}>Cancelar</button>
        <button class="boton" type="button" onclick={guardar} disabled={cuenta === 0}>Guardar</button>
      </div>
    </footer>
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
    background: rgba(7, 11, 18, 0.72);
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

  /* ── Cabecera ─────────────────────────────────────── */
  .panel__cab {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    padding: clamp(1rem, 3vw, 1.5rem) clamp(1rem, 3vw, 1.6rem) 0.75rem;
    border-bottom: 1px solid var(--borde-oro-tenue);
  }
  .panel__marca {
    margin: 0 0 0.35rem;
    font-size: 10px;
    font-weight: 500;
    letter-spacing: 0.42em;
    text-transform: uppercase;
    color: var(--arcano);
  }
  .panel__nombre {
    margin: 0;
    font-family: var(--fuente-display);
    font-weight: 900;
    font-size: clamp(1.3rem, 3.5vw, 1.9rem);
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

  /* ── Barra: buscar + acciones ─────────────────────── */
  .barra {
    display: flex;
    flex-wrap: wrap;
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
  .barra__acciones {
    display: flex;
    gap: 0.4rem;
  }

  /* ── Rejilla de campeones ─────────────────────────── */
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
    filter: grayscale(0.75) brightness(0.5);
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
    background: var(--arcano);
    color: #04201d;
    font-size: 11px;
    font-weight: 700;
    opacity: 0;
    transform: scale(0.6);
    transition: opacity 0.12s, transform 0.12s;
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
    filter: grayscale(0.4) brightness(0.7);
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
  .ficha.activa .ficha__check {
    opacity: 1;
    transform: scale(1);
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

  /* ── Pie: contador + guardar/cancelar ─────────────── */
  .panel__pie {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    align-items: center;
    justify-content: space-between;
    padding: 0.9rem clamp(1rem, 3vw, 1.6rem);
    border-top: 1px solid var(--borde-oro-tenue);
  }
  .cuenta {
    font-size: 0.8rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--oro);
  }
  .cuenta--cero {
    color: var(--sangre);
  }
  .panel__pie-acciones {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .aviso {
    font-size: 0.75rem;
    color: var(--sangre);
    margin-right: 0.2rem;
  }

  /* ── Botones (scoped: mismo lenguaje visual del design system) ─ */
  .mini {
    background: transparent;
    border: 1px solid var(--borde-oro);
    border-radius: 2px;
    color: var(--humo);
    font-size: 0.72rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    padding: 0.45rem 0.75rem;
    cursor: pointer;
    transition: color 0.15s, border-color 0.15s;
  }
  .mini:hover {
    color: var(--oro-claro);
    border-color: var(--borde-oro-fuerte);
  }
  .mini:focus-visible {
    outline: 2px solid var(--arcano);
    outline-offset: 2px;
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
  .boton:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: var(--sombra-boton-hover);
  }
  .boton:focus-visible {
    outline: 2px solid var(--arcano);
    outline-offset: 3px;
  }
  .boton:disabled {
    cursor: not-allowed;
    filter: grayscale(0.5) brightness(0.72);
  }

  @media (prefers-reduced-motion: reduce) {
    .fondo,
    .ficha__marco,
    .ficha__img,
    .ficha__check,
    .boton {
      transition: none;
    }
  }
</style>
