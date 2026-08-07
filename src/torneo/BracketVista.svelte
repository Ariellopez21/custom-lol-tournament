<script>
  // Fase 3.2 — Eliminatoria (bracket clásico, eliminación simple, sin byes).
  // Dos modos de siembra (sorteo / manual) → cuadro de rondas → cada llave se
  // resuelve con un marcador y el ganador AVANZA solo a la ronda siguiente.
  import { untrack } from 'svelte'
  import { fade } from 'svelte/transition'
  import {
    estado,
    sembrarBracket,
    limpiarBracket,
    resolverLlave,
    deshacerLlave,
    finalizarTorneo,
  } from '../core/estado.svelte.js'
  import { barajar, estaSembrado, campeonBracket, localizarLlave } from '../core/bracket.js'
  import DueloRuleta from '../combate/DueloRuleta.svelte'
  import ModalCombate from '../combate/ModalCombate.svelte'
  import Marcador from '../combate/Marcador.svelte'

  let { torneo, etapa } = $props()

  /** @type {Record<string, number>} */
  const MAX_LADOS = { Bo1: 1, Bo3: 2, Bo5: 3 }

  const bracket = $derived(etapa?.bracket)
  const sembrado = $derived(estaSembrado(bracket))
  const participantes = $derived(etapa?.participantes ?? [])
  const N = $derived(participantes.length)
  const maxLados = $derived(MAX_LADOS[torneo.reglas.formato] ?? 1)
  const campeon = $derived(campeonBracket(bracket))
  const jugados = $derived(etapa?.duelos.length ?? 0)
  const totalPartidos = $derived(N > 0 ? N - 1 : 0)

  // Cara del combate: ruleta (teatral) o manual (ENFRENTAMIENTO). El bracket no
  // admite empates, así que registrar sigue bloqueado con ga === gb.
  const esRuleta = $derived(torneo.reglas.resolucion === 'ruleta')
  /** @type {{ a: string, b: string } | null} */
  let sorteados = $state(null) // último par sorteado por la ruleta (1.7); persiste en 1.10
  // Fila 2 del marcador (1.8): campeones jugados; alimentan el restock (1.9).
  /** @type {string[]} */ let jugadosA = $state([])
  /** @type {string[]} */ let jugadosB = $state([])

  const nombreDe = (/** @type {string} */ id) =>
    estado.participantes.find((p) => p.id === id)?.nombre ?? '—'

  // ── Siembra ──────────────────────────────────────────
  let modo = $state('sorteo') // 'sorteo' | 'manual'
  // Copia inicial (una sola vez) del orden de participantes; luego diverge al
  // sortear o editar a mano. Los participantes de la etapa no cambian tras crearse.
  let orden = $state(untrack(() => [...participantes])) // ids en los huecos de la ronda 1
  const paresPrevia = $derived(
    Array.from({ length: Math.floor(orden.length / 2) }, (_, i) => ({
      a: orden[i * 2],
      b: orden[i * 2 + 1],
    }))
  )
  const ordenValido = $derived(
    orden.length === N && orden.every(Boolean) && new Set(orden).size === N
  )
  // En manual el humano coloca libremente; solo señalamos los repetidos (no se
  // bloquean) y guardamos la generación hasta que el cuadro sea válido.
  const repetidos = $derived(new Set(orden.filter((id, i) => id && orden.indexOf(id) !== i)))

  function sortear() {
    orden = barajar(participantes)
  }
  function generar() {
    if (ordenValido) sembrarBracket(torneo.id, etapa.id, [...orden])
  }
  function reSembrar() {
    limpiarBracket(torneo.id, etapa.id)
    orden = [...participantes]
    modo = 'sorteo'
  }

  // ── Juego de una llave ───────────────────────────────
  /** @type {string | null} */
  let activa = $state(null)
  let ga = $state(0)
  let gb = $state(0)
  // Llave que se está jugando (el combate vive en el modal, con room para el marcador).
  const llaveActiva = $derived(activa ? localizarLlave(bracket, activa)?.llave ?? null : null)

  const marcaDe = (/** @type {any} */ ll) => {
    const d = estado.duelos.find((x) => x.id === ll.dueloId)
    return d?.marcador ?? null
  }
  const puedeDeshacer = (/** @type {any} */ ll) =>
    !!ll.ganador && (!ll.avanzaA || !localizarLlave(bracket, ll.avanzaA)?.llave.ganador)

  function reset() {
    ga = 0
    gb = 0
    sorteados = null
    jugadosA = []
    jugadosB = []
  }
  function abrir(/** @type {any} */ ll) {
    activa = ll.id
    reset()
  }
  function cancelar() {
    activa = null
    reset()
  }
  function registrar(/** @type {any} */ ll) {
    if (ga === gb) return
    resolverLlave(torneo.id, etapa.id, ll.id, { a: ga, b: gb })
    activa = null
    reset()
  }

  // ── Cierre ───────────────────────────────────────────
  function finalizar() {
    if (campeon) finalizarTorneo(torneo.id, campeon)
  }
</script>

<div class="etapa-body">
  <p class="etapa-sub">
    {etapa?.nombre ?? 'Eliminatoria'} · {torneo.reglas.resolucion === 'ruleta' ? 'Ruleta' : 'Manual'}
    {torneo.reglas.formato} · {N} invocadores · {jugados}/{totalPartidos} combates
  </p>

  {#if !sembrado}
    <!-- ── Panel de siembra ── -->
    <div class="siembra">
      <div class="modos">
        <button type="button" class="modo" class:modo--on={modo === 'sorteo'} onclick={() => (modo = 'sorteo')}>🎲 Sorteo</button>
        <button type="button" class="modo" class:modo--on={modo === 'manual'} onclick={() => (modo = 'manual')}>✍️ Manual</button>
      </div>

      {#if modo === 'sorteo'}
        <p class="siembra__ayuda">Baraja a los {N} invocadores en las llaves. Puedes volver a sortear hasta que te convenza.</p>
        <button class="mini" type="button" onclick={sortear}>🎲 Sortear llaves</button>
      {:else}
        <p class="siembra__ayuda">Coloca a cada invocador en su hueco. Nadie puede repetirse.</p>
      {/if}

      <ol class="previa">
        {#each paresPrevia as par, i (i)}
          <li class="par">
            <span class="par__n">Llave {i + 1}</span>
            {#if modo === 'manual'}
              <select class:rep={repetidos.has(orden[i * 2])} bind:value={orden[i * 2]} aria-label="Hueco {i * 2 + 1}">
                <option value="" disabled>Invocador…</option>
                {#each participantes as id (id)}
                  <option value={id}>{nombreDe(id)}</option>
                {/each}
              </select>
              <span class="par__vs">vs</span>
              <select class:rep={repetidos.has(orden[i * 2 + 1])} bind:value={orden[i * 2 + 1]} aria-label="Hueco {i * 2 + 2}">
                <option value="" disabled>Invocador…</option>
                {#each participantes as id (id)}
                  <option value={id}>{nombreDe(id)}</option>
                {/each}
              </select>
            {:else}
              <span class="par__lado">{nombreDe(par.a)}</span>
              <span class="par__vs">vs</span>
              <span class="par__lado">{nombreDe(par.b)}</span>
            {/if}
          </li>
        {/each}
      </ol>

      {#if modo === 'manual' && !ordenValido}
        <p class="hint-mal">
          {#if repetidos.size > 0}Hay invocadores repetidos (marcados en rojo){:else}Falta asignar algún hueco{/if} — cada uno debe aparecer una sola vez.
        </p>
      {/if}
      <button class="boton" type="button" onclick={generar} disabled={!ordenValido}>Generar bracket</button>
    </div>
  {:else}
    <!-- ── Cuadro ── -->
    <div class="bracket-scroll">
      <div class="bracket">
        {#each bracket.rondas as ronda (ronda.n)}
          <div class="ronda">
            <h3 class="ronda__nom">{ronda.nombre}</h3>
            <div class="ronda__llaves">
              {#each ronda.llaves as ll (ll.id)}
                {@const m = marcaDe(ll)}
                <div class="llave" class:llave--lista={ll.a && ll.b && !ll.ganador} class:llave--hecha={ll.ganador}>
                  <div class="slot" class:slot--gana={ll.ganador && ll.ganador === ll.a} class:slot--cae={ll.ganador && ll.ganador !== ll.a}>
                    <span class="slot__nom">{ll.a ? nombreDe(ll.a) : '·'}</span>
                    {#if m}<span class="slot__m">{m.a}</span>{/if}
                  </div>
                  <div class="slot" class:slot--gana={ll.ganador && ll.ganador === ll.b} class:slot--cae={ll.ganador && ll.ganador !== ll.b}>
                    <span class="slot__nom">{ll.b ? nombreDe(ll.b) : '·'}</span>
                    {#if m}<span class="slot__m">{m.b}</span>{/if}
                  </div>

                  {#if activa === ll.id}
                    <p class="jugando">▶ en curso</p>
                  {:else if torneo.estado !== 'finalizado' && ll.a && ll.b && !ll.ganador}
                    <button class="jugar" type="button" onclick={() => abrir(ll)}>Jugar ⚔️</button>
                  {:else if torneo.estado !== 'finalizado' && puedeDeshacer(ll)}
                    <button class="deshacer" type="button" onclick={() => deshacerLlave(torneo.id, etapa.id, ll.id)} title="Deshacer este resultado">↩︎</button>
                  {/if}
                </div>
              {/each}
            </div>
          </div>
        {/each}
      </div>
    </div>

    <!-- Combate en modal/overlay "Pantalla VS" (1.6). Las llaves son diminutas
         para alojar el marcador de 2 filas (y el tambor), así que el combate
         —manual o ruleta— vive en el modal. -->
    {#if llaveActiva && llaveActiva.a && llaveActiva.b && !llaveActiva.ganador}
      <ModalCombate onCerrar={cancelar} titulo={etapa?.nombre ?? 'Eliminatoria'}>
        <Marcador
          a={llaveActiva.a}
          b={llaveActiva.b}
          bind:ga
          bind:gb
          bind:jugadosA
          bind:jugadosB
          {maxLados}
          permitirAnadir={!esRuleta}
          hint={esRuleta
            ? `marcador final · sin empate · máx ${maxLados} · la fila 2 la anota la ruleta`
            : `games ganados · campeones jugados (fila 2) · sin empate · máx ${maxLados}`}
        />
        {#if esRuleta}
          <DueloRuleta
            a={llaveActiva.a}
            b={llaveActiva.b}
            reglas={torneo.reglas}
            {maxLados}
            mostrarCabecera={false}
            bind:jugadosA
            bind:jugadosB
            onsorteo={(c) => (sorteados = c)}
          />
        {/if}
        <div class="modal-acc">
          <button class="boton" type="button" onclick={() => registrar(llaveActiva)} disabled={ga === gb}>Registrar resultado</button>
          <button class="mini" type="button" onclick={cancelar}>✕ Cancelar</button>
        </div>
      </ModalCombate>
    {/if}

    <!-- Pie: volver a sembrar / coronar -->
    <div class="pie-acc">
      {#if torneo.estado !== 'finalizado' && jugados === 0}
        <button class="mini" type="button" onclick={reSembrar}>↻ Volver a sembrar</button>
      {/if}
      {#if torneo.estado !== 'finalizado' && campeon}
        <div class="coronar" transition:fade={{ duration: 200 }}>
          <span>🏆 Campeón del cuadro: <b>{nombreDe(campeon)}</b></span>
          <button class="boton" type="button" onclick={finalizar}>🏁 Finalizar y coronar</button>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .etapa-body {
    width: 100%;
  }
  .etapa-sub {
    margin: 0 0 1.2rem;
    text-align: center;
    font-size: 0.75rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--humo);
  }

  /* ── Siembra ─────────────────────────────────────── */
  .siembra {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.9rem;
    padding: clamp(1rem, 3vw, 1.6rem);
    border: 1px solid var(--borde-oro);
    border-radius: 4px;
    background: linear-gradient(180deg, rgba(18, 37, 60, 0.4), rgba(7, 11, 18, 0.4));
  }
  .modos {
    display: flex;
    gap: 0.5rem;
  }
  .modo {
    background: transparent;
    border: 1px solid var(--borde-oro);
    border-radius: 999px;
    color: var(--humo);
    padding: 0.4rem 1rem;
    font-size: 0.85rem;
    cursor: pointer;
    transition: color 0.15s, border-color 0.15s, background 0.15s;
  }
  .modo:hover {
    color: var(--oro-claro);
    border-color: var(--borde-oro-fuerte);
  }
  .modo--on {
    color: #0a0f18;
    background: var(--oro);
    border-color: var(--oro);
    font-weight: 600;
  }
  .siembra__ayuda {
    margin: 0;
    text-align: center;
    color: var(--humo);
    font-size: 0.85rem;
    max-width: 34rem;
  }
  .previa {
    list-style: none;
    margin: 0;
    padding: 0;
    width: 100%;
    max-width: 34rem;
    display: grid;
    gap: 0.4rem;
  }
  .par {
    display: grid;
    grid-template-columns: auto 1fr auto 1fr;
    align-items: center;
    gap: 0.5rem;
    padding: 0.4rem 0.6rem;
    border: 1px solid var(--borde-oro-tenue);
    border-radius: 3px;
  }
  .par__n {
    font-size: 0.66rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--humo);
  }
  .par__lado {
    color: var(--oro-claro);
    font-weight: 600;
    overflow-wrap: anywhere;
  }
  .par__vs {
    color: var(--sangre);
    font-family: var(--fuente-display);
    font-weight: 800;
    font-size: 0.8rem;
  }
  .par select {
    width: 100%;
    background: rgba(7, 11, 18, 0.7);
    border: 1px solid var(--borde-oro);
    border-radius: 2px;
    color: var(--oro-claro);
    padding: 0.35rem 0.4rem;
    font-size: 0.85rem;
  }
  .par select.rep {
    border-color: var(--sangre);
    color: var(--sangre);
  }
  .hint-mal {
    margin: 0;
    color: var(--sangre);
    font-size: 0.8rem;
  }

  /* ── Cuadro ──────────────────────────────────────── */
  .bracket-scroll {
    overflow-x: auto;
    padding-bottom: 0.5rem;
  }
  .bracket {
    display: flex;
    gap: clamp(0.8rem, 2.5vw, 2rem);
    min-width: min-content;
  }
  .ronda {
    display: flex;
    flex-direction: column;
    min-width: 12rem;
  }
  .ronda__nom {
    margin: 0 0 0.7rem;
    text-align: center;
    font-family: var(--fuente-display);
    font-weight: 700;
    font-size: 0.85rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--oro);
  }
  .ronda__llaves {
    display: flex;
    flex-direction: column;
    justify-content: space-around;
    gap: 0.6rem;
    flex: 1;
  }
  .llave {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 0.4rem;
    border: 1px solid var(--borde-oro-tenue);
    border-radius: 4px;
    background: linear-gradient(180deg, rgba(18, 37, 60, 0.35), rgba(7, 11, 18, 0.35));
  }
  .llave--lista {
    border-color: var(--borde-arcano);
    box-shadow: var(--brillo-arcano);
  }
  .slot {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    padding: 0.3rem 0.5rem;
    border-radius: 2px;
    background: rgba(7, 11, 18, 0.4);
  }
  .slot__nom {
    color: var(--oro-claro);
    font-size: 0.9rem;
    overflow-wrap: anywhere;
  }
  .slot__m {
    font-family: var(--fuente-display);
    font-weight: 800;
    color: var(--humo);
    min-width: 1ch;
    text-align: center;
  }
  .slot--gana .slot__nom {
    color: var(--oro);
    font-weight: 700;
  }
  .slot--gana .slot__m {
    color: var(--oro);
  }
  .slot--cae {
    opacity: 0.5;
  }
  .slot--cae .slot__nom {
    text-decoration: line-through;
  }

  .jugar {
    margin-top: 0.2rem;
    font-family: var(--fuente-display);
    font-weight: 700;
    font-size: 0.75rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #0a0f18;
    background: var(--oro-degradado);
    border: 1px solid #e4d3a8;
    border-radius: 2px;
    padding: 0.35rem;
    cursor: pointer;
    transition: filter 0.2s;
  }
  .jugar:hover {
    filter: brightness(1.08);
  }
  .deshacer {
    align-self: flex-end;
    margin-top: 0.1rem;
    background: transparent;
    border: 1px solid var(--borde-oro-tenue);
    border-radius: 2px;
    color: var(--humo);
    font-size: 0.75rem;
    padding: 0.1rem 0.4rem;
    cursor: pointer;
  }
  .deshacer:hover {
    color: var(--oro-claro);
    border-color: var(--borde-oro);
  }

  /* Acciones del combate dentro del modal. */
  .modal-acc {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.5rem;
  }

  /* Marca de "jugando" dentro de la llave (el combate vive en el modal de abajo). */
  .jugando {
    margin: 0.3rem 0 0;
    text-align: center;
    font-size: 0.66rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--arcano);
  }

  /* ── Pie ─────────────────────────────────────────── */
  .pie-acc {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 0.8rem;
    margin-top: 1.4rem;
  }
  .coronar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 0.8rem;
    padding: 0.9rem 1.2rem;
    border: 1px solid var(--borde-oro-fuerte);
    border-radius: 4px;
    background: radial-gradient(120% 100% at 50% 0%, rgba(200, 170, 110, 0.12), transparent 70%);
    color: var(--oro-claro);
  }
  .coronar b {
    color: var(--oro);
    font-family: var(--fuente-display);
  }

  /* ── Botones compartidos ─────────────────────────── */
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
    padding: 0.4rem 0.7rem;
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
</style>
