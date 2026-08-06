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
  const clamp = (/** @type {number} */ n) => Math.max(0, Math.min(maxLados, n))

  const marcaDe = (/** @type {any} */ ll) => {
    const d = estado.duelos.find((x) => x.id === ll.dueloId)
    return d?.marcador ?? null
  }
  const puedeDeshacer = (/** @type {any} */ ll) =>
    !!ll.ganador && (!ll.avanzaA || !localizarLlave(bracket, ll.avanzaA)?.llave.ganador)

  function abrir(/** @type {any} */ ll) {
    activa = ll.id
    ga = 0
    gb = 0
  }
  function cancelar() {
    activa = null
  }
  function registrar(/** @type {any} */ ll) {
    if (ga === gb) return
    resolverLlave(torneo.id, etapa.id, ll.id, { a: ga, b: gb })
    activa = null
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
                    <div class="editor">
                      <div class="editor__fila">
                        <button class="paso" type="button" onclick={() => (ga = clamp(ga - 1))} aria-label="menos A">–</button>
                        <span class="paso__n">{ga}</span>
                        <button class="paso" type="button" onclick={() => (ga = clamp(ga + 1))} aria-label="más A">+</button>
                        <span class="paso__sep">:</span>
                        <button class="paso" type="button" onclick={() => (gb = clamp(gb - 1))} aria-label="menos B">–</button>
                        <span class="paso__n">{gb}</span>
                        <button class="paso" type="button" onclick={() => (gb = clamp(gb + 1))} aria-label="más B">+</button>
                      </div>
                      <div class="editor__acc">
                        <button class="mini mini--ok" type="button" onclick={() => registrar(ll)} disabled={ga === gb}>Registrar</button>
                        <button class="mini" type="button" onclick={cancelar}>✕</button>
                      </div>
                    </div>
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

  /* Editor de marcador dentro de la llave */
  .editor {
    margin-top: 0.3rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.35rem;
  }
  .editor__fila {
    display: flex;
    align-items: center;
    gap: 0.25rem;
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
  }
  .paso:hover {
    color: var(--oro-claro);
    border-color: var(--borde-oro-fuerte);
  }
  .paso__n {
    font-family: var(--fuente-display);
    font-weight: 900;
    font-size: 1.2rem;
    color: var(--oro-claro);
    min-width: 1.2ch;
    text-align: center;
  }
  .paso__sep {
    color: var(--sangre);
    font-weight: 800;
    margin: 0 0.15rem;
  }
  .editor__acc {
    display: flex;
    gap: 0.35rem;
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
  .mini--ok {
    color: var(--arcano);
    border-color: var(--borde-arcano);
  }
</style>
