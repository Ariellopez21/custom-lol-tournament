<script>
  // Fase 1.8 — Marcador de 2 filas (fuente única, compartida por ENFRENTAMIENTO y
  // RULETA en Tabla/Grupos/Bracket):
  //   · Fila 1: ficha de cada invocador (avatar + nombre) + su marcador editable (+/-).
  //   · Fila 2: tira de "campeones jugados" en cuadrados del MISMO tamaño que el avatar.
  //
  // Los campeones (fila 2) llegan de dos formas según la cara:
  //   · RULETA → los anexa `DueloRuleta` tras cada giro (bind:jugadosA/B compartido).
  //   · ENFRENTAMIENTO → se marcan a mano con el botón «+» (permitirAnadir), que abre
  //     `SelectorCampeon`. La fila 2 alimenta el restock (1.9) y sirve de registro.
  // Clic en un cuadrado = quitarlo (deshacer una anotación).
  import { estado } from '../core/estado.svelte.js'
  import { getChampion } from '../core/champions.js'
  import SelectorCampeon from './SelectorCampeon.svelte'

  let {
    a,
    b,
    ga = $bindable(0),
    gb = $bindable(0),
    jugadosA = $bindable([]),
    jugadosB = $bindable([]),
    maxLados = 1,
    editable = true,
    permitirAnadir = false,
    compacto = false,
    hint = '',
  } = $props()

  const partA = $derived(estado.participantes.find((p) => p.id === a))
  const partB = $derived(estado.participantes.find((p) => p.id === b))
  const nombreA = $derived(partA?.nombre ?? '—')
  const nombreB = $derived(partB?.nombre ?? '—')
  const inicial = (/** @type {string} */ n) => (n?.trim()[0] ?? '?').toUpperCase()

  const clamp = (/** @type {number} */ n) => Math.max(0, Math.min(maxLados, n))

  /** @type {'a' | 'b' | null} */
  let picker = $state(null)
  const jugadosDe = (/** @type {'a'|'b'} */ lado) => (lado === 'a' ? jugadosA : jugadosB)

  function anadir(/** @type {string} */ id) {
    if (picker === 'a') jugadosA = [...jugadosA, id]
    else if (picker === 'b') jugadosB = [...jugadosB, id]
  }
  function quitar(/** @type {'a'|'b'} */ lado, /** @type {number} */ i) {
    if (!editable) return
    if (lado === 'a') jugadosA = jugadosA.filter((_, k) => k !== i)
    else jugadosB = jugadosB.filter((_, k) => k !== i)
  }
</script>

<div class="mc" class:mc--compacto={compacto}>
  <div class="grid">
    <!-- Fila 1: fichas + marcador -->
    {@render lado(nombreA, 'a', ga, (/** @type {number} */ n) => (ga = clamp(n)))}
    <span class="vs" aria-hidden="true">VS</span>
    {@render lado(nombreB, 'b', gb, (/** @type {number} */ n) => (gb = clamp(n)))}

    <!-- Fila 2: tiras de campeones jugados -->
    {@render tira('a', jugadosA)}
    <span class="gap" aria-hidden="true"></span>
    {@render tira('b', jugadosB)}
  </div>
  {#if hint}<p class="hint">{hint}</p>{/if}
</div>

{#if picker}
  <SelectorCampeon
    titulo={`Campeones de ${picker === 'a' ? nombreA : nombreB}`}
    yaJugados={jugadosDe(picker)}
    onElegir={anadir}
    onCerrar={() => (picker = null)}
  />
{/if}

{#snippet lado(nombre, cual, valor, set)}
  <div class="ficha ficha--{cual}">
    <span class="ficha__av">{inicial(nombre)}</span>
    <div class="ficha__cuerpo">
      <span class="ficha__nom">{nombre}</span>
      <div class="score">
        <button class="paso" type="button" onclick={() => set(valor - 1)} disabled={!editable} aria-label="menos games a {nombre}">–</button>
        <span class="score__n">{valor}</span>
        <button class="paso" type="button" onclick={() => set(valor + 1)} disabled={!editable} aria-label="más games a {nombre}">+</button>
      </div>
    </div>
  </div>
{/snippet}

{#snippet tira(cual, lista)}
  <div class="tira tira--{cual}">
    {#each lista as id, i (id + '·' + i)}
      {@const champ = getChampion(id)}
      <button
        class="cuadro"
        type="button"
        onclick={() => quitar(cual, i)}
        disabled={!editable}
        title={champ ? `${champ.nombre}${editable ? ' — quitar' : ''}` : 'quitar'}
      >
        {#if champ?.img}
          <img src={champ.img} alt={champ.nombre} />
        {:else}
          <span class="cuadro__ini">{inicial(champ?.nombre ?? '?')}</span>
        {/if}
        {#if editable}<span class="cuadro__x" aria-hidden="true">✕</span>{/if}
      </button>
    {/each}
    {#if permitirAnadir && editable}
      <button class="cuadro cuadro--add" type="button" onclick={() => (picker = cual)} aria-label="Añadir campeón jugado de {cual === 'a' ? nombreA : nombreB}" title="Añadir campeón jugado">+</button>
    {:else if lista.length === 0}
      <span class="tira__vacia">—</span>
    {/if}
  </div>
{/snippet}

<style>
  .mc {
    --av: 2.2rem;
    --num: 1.7rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.55rem;
    width: 100%;
  }
  .mc--compacto {
    --av: 1.8rem;
    --num: 1.3rem;
  }

  /* Una sola rejilla de 2 filas para que las columnas (A · VS · B) queden alineadas. */
  .grid {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    column-gap: clamp(0.5rem, 3vw, 1.2rem);
    row-gap: 0.5rem;
    align-items: center;
    width: 100%;
  }

  .vs {
    font-family: var(--fuente-display);
    font-weight: 900;
    font-size: clamp(1rem, 3vw, 1.35rem);
    color: var(--sangre);
    letter-spacing: 0.08em;
  }

  /* ── Fila 1: ficha (avatar + nombre + marcador) ── */
  .ficha {
    display: flex;
    align-items: center;
    gap: 0.55rem;
    min-width: 0;
  }
  .ficha--a {
    justify-self: end;
    flex-direction: row-reverse;
    text-align: right;
  }
  .ficha--b {
    justify-self: start;
  }
  .ficha__av {
    flex: none;
    width: var(--av);
    height: var(--av);
    display: grid;
    place-items: center;
    border-radius: 50%;
    border: 1px solid var(--borde-oro);
    background: radial-gradient(120% 120% at 50% 0%, rgba(200, 170, 110, 0.25), rgba(7, 11, 18, 0.6));
    color: var(--oro-claro);
    font-family: var(--fuente-display);
    font-weight: 800;
    font-size: calc(var(--av) * 0.45);
  }
  .ficha__cuerpo {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    min-width: 0;
  }
  .ficha--a .ficha__cuerpo {
    align-items: flex-end;
  }
  .ficha__nom {
    font-family: var(--fuente-display);
    font-weight: 700;
    font-size: clamp(0.9rem, 2.2vw, 1.2rem);
    color: var(--oro-claro);
    overflow-wrap: anywhere;
    line-height: 1.05;
  }
  .score {
    display: flex;
    align-items: center;
    gap: 0.3rem;
  }
  .paso {
    width: 26px;
    height: 26px;
    border-radius: 50%;
    border: 1px solid var(--borde-oro);
    background: transparent;
    color: var(--oro);
    font-size: 1rem;
    line-height: 1;
    cursor: pointer;
    transition: color 0.15s, border-color 0.15s;
  }
  .paso:hover:not(:disabled) {
    color: var(--oro-claro);
    border-color: var(--borde-oro-fuerte);
  }
  .paso:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
  .score__n {
    font-family: var(--fuente-display);
    font-weight: 900;
    font-size: var(--num);
    color: var(--oro-claro);
    min-width: 1.3ch;
    text-align: center;
  }

  /* ── Fila 2: tira de campeones jugados ── */
  .tira {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
    align-self: start;
    min-height: var(--av);
    align-items: center;
  }
  .tira--a {
    justify-content: flex-end;
  }
  .tira--b {
    justify-content: flex-start;
  }
  .tira__vacia {
    color: var(--humo);
    opacity: 0.5;
    font-size: 0.9rem;
  }
  .cuadro {
    position: relative;
    flex: none;
    width: var(--av);
    height: var(--av);
    padding: 0;
    border: 1px solid var(--borde-oro-tenue);
    border-radius: 4px;
    overflow: hidden;
    background: rgba(7, 11, 18, 0.5);
    cursor: pointer;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .cuadro img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  .cuadro__ini {
    display: grid;
    place-items: center;
    width: 100%;
    height: 100%;
    color: var(--oro-claro);
    font-family: var(--fuente-display);
    font-weight: 800;
    font-size: calc(var(--av) * 0.42);
  }
  .cuadro__x {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    background: rgba(7, 11, 18, 0.72);
    color: var(--sangre);
    font-size: 0.85rem;
    opacity: 0;
    transition: opacity 0.12s;
  }
  .cuadro:hover:not(:disabled) {
    border-color: var(--borde-oro-fuerte);
  }
  .cuadro:hover:not(:disabled) .cuadro__x {
    opacity: 1;
  }
  .cuadro:disabled {
    cursor: default;
  }
  .cuadro--add {
    display: grid;
    place-items: center;
    color: var(--humo);
    font-size: 1.1rem;
    line-height: 1;
    border-style: dashed;
    background: transparent;
  }
  .cuadro--add:hover {
    color: var(--oro-claro);
    border-color: var(--borde-oro);
  }

  .hint {
    margin: 0;
    text-align: center;
    font-size: 0.62rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--humo);
  }

  @media (prefers-reduced-motion: reduce) {
    .paso,
    .cuadro,
    .cuadro__x {
      transition: none;
    }
  }
</style>
