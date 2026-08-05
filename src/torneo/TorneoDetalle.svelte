<script>
  // Fase 3.5 — Detalle de un torneo tipo "tabla" (Liga).
  // ELEGIR COMBATE (azar inteligente) → VS → resultado manual → la tabla se
  // recalcula y reordena animada, con datos de espectáculo. La resolución por
  // ruleta se enchufará en la Fase 1.
  import { flip } from 'svelte/animate'
  import { fade } from 'svelte/transition'
  import { irA } from '../ui/ruta.svelte.js'
  import {
    estado,
    registrarResultado,
    borrarDuelo,
    finalizarTorneo,
    reabrirTorneo,
  } from '../core/estado.svelte.js'
  import { clasificar, cambiosDeLiderato, nemesis, elegirCombatePar } from '../core/clasificacion.js'

  let { torneo } = $props()

  /** @typedef {import('../core/clasificacion.js').Fila} Fila */
  /** @type {Record<string, number>} */
  const MAX_LADOS = { Bo1: 1, Bo3: 2, Bo5: 3 }
  const reduce =
    typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
  const flipDur = reduce ? 0 : 420

  const etapa = $derived(torneo.etapas[0])
  const esTabla = $derived(etapa?.tipo === 'tabla')
  const maxLados = $derived(MAX_LADOS[torneo.reglas.formato] ?? 1)

  // Fuente de verdad: los duelos terminados de la etapa (cronológicos).
  const duelos = $derived(
    estado.duelos.filter((d) => d.etapaId === etapa?.id && d.estado === 'terminado')
  )
  const filas = $derived(clasificar(etapa?.participantes ?? [], duelos, torneo.puntos))
  const posPrevia = $derived(
    new Map(clasificar(etapa?.participantes ?? [], duelos.slice(0, -1), torneo.puntos).map((f) => [f.participanteId, f.pos]))
  )
  const liderato = $derived(cambiosDeLiderato(etapa?.participantes ?? [], duelos, torneo.puntos))
  const nemesisPar = $derived(nemesis(duelos))
  const mejorRacha = $derived(
    filas.length ? filas.reduce((m, f) => (f.mejorRachaV > m.mejorRachaV ? f : m)) : null
  )

  // Estado del combate en curso.
  /** @type {{ a: string, b: string } | null} */
  let combate = $state(null)
  let ga = $state(0)
  let gb = $state(0)
  let manual = $state(false)
  let selA = $state('')
  let selB = $state('')
  /** @type {{ texto: string, tono: string } | null} */
  let evento = $state(null)
  let confirmFin = $state(false)
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let timer

  const puedeRegistrar = $derived(combate && (ga > 0 || gb > 0))

  const nombreDe = (/** @type {string} */ id) =>
    estado.participantes.find((p) => p.id === id)?.nombre ?? '—'

  function elegir() {
    const par = elegirCombatePar(etapa.participantes, duelos)
    if (par) {
      combate = par
      ga = 0
      gb = 0
      manual = false
    }
  }
  function cargarManual() {
    if (selA && selB && selA !== selB) {
      combate = { a: selA, b: selB }
      ga = 0
      gb = 0
      manual = false
    }
  }
  function cancelar() {
    combate = null
    ga = 0
    gb = 0
  }
  const clamp = (/** @type {number} */ n) => Math.max(0, Math.min(maxLados, n))

  function mostrarEvento(/** @type {string} */ texto, /** @type {string} */ tono) {
    evento = { texto, tono }
    clearTimeout(timer)
    timer = setTimeout(() => (evento = null), 4500)
  }

  function registrar() {
    if (!combate || (ga === 0 && gb === 0)) return
    const { a, b } = combate
    registrarResultado(torneo.id, etapa.id, a, b, { a: ga, b: gb })

    // Mensaje festivo, calculado de la clasificación ya actualizada.
    const dNow = estado.duelos.filter((d) => d.etapaId === etapa.id && d.estado === 'terminado')
    const cl = clasificar(etapa.participantes, dNow, torneo.puntos)
    const ganadorId = ga > gb ? a : gb > ga ? b : null

    if (ganadorId) {
      const perdedorId = ganadorId === a ? b : a
      const filaG = cl.find((f) => f.participanteId === ganadorId)
      let texto = `⚔️ ${nombreDe(ganadorId)} vence a ${nombreDe(perdedorId)}`
      if (filaG?.racha.tipo === 'V' && filaG.racha.n >= 3) texto += ` · 🔥 ${filaG.racha.n} seguidas!`
      const antes = clasificar(etapa.participantes, dNow.slice(0, -1), torneo.puntos)
      if (cl[0]?.participanteId === ganadorId && antes[0]?.participanteId !== ganadorId) {
        texto += ' · 👑 ¡nuevo líder!'
      }
      mostrarEvento(texto, 'v')
    } else {
      mostrarEvento(`🤝 ${nombreDe(a)} y ${nombreDe(b)} reparten puntos`, 'e')
    }

    cancelar()
  }

  function deshacer() {
    const ultimo = duelos[duelos.length - 1]
    if (ultimo) {
      borrarDuelo(ultimo.id)
      mostrarEvento('↩️ Último resultado deshecho', 'n')
    }
  }
  function finalizar() {
    finalizarTorneo(torneo.id, filas[0]?.participanteId ?? null)
    confirmFin = false
  }

  const movimientoDe = (/** @type {Fila} */ f) => {
    if (duelos.length === 0) return 0
    const prev = posPrevia.get(f.participanteId)
    return prev != null && f.pos != null ? prev - f.pos : 0
  }
</script>

<section class="detalle">
  <a class="volver" href="#/torneos" onclick={(e) => { e.preventDefault(); irA('torneos') }}>← Torneos</a>

  <header class="cab">
    <p class="cab__marca">
      {etapa?.nombre ?? 'Torneo'} · {torneo.reglas.resolucion === 'ruleta' ? 'Ruleta' : 'Manual'}
      {torneo.reglas.formato}
    </p>
    <h1 class="cab__titulo texto-oro">{torneo.nombre}</h1>
    <p class="cab__sub">
      {etapa?.participantes.length ?? 0} invocadores · {duelos.length}
      {duelos.length === 1 ? 'combate jugado' : 'combates jugados'} ·
      victoria {torneo.puntos.victoria} / empate {torneo.puntos.empate} / derrota {torneo.puntos.derrota}
    </p>
  </header>

  {#if torneo.estado === 'finalizado'}
    <div class="campeon">
      <span class="campeon__lbl">🏆 Campeón</span>
      <span class="campeon__nom texto-oro">{torneo.campeon ? nombreDe(torneo.campeon) : '—'}</span>
      <button class="mini" type="button" onclick={() => reabrirTorneo(torneo.id)}>Reabrir</button>
    </div>
  {/if}

  {#if !esTabla}
    <p class="placeholder">
      La vista de <b>{etapa?.tipo}</b> llega en {etapa?.tipo === 'bracket' ? 'el 3.2' : 'el 3.3'}.
      Por ahora solo está lista la <b>tabla de puntuación</b>.
    </p>
  {:else}
    <!-- Zona de combate -->
    {#if torneo.estado !== 'finalizado'}
      <div class="combate">
        {#if combate}
          <div class="vs">
            <span class="vs__nom vs__nom--a">{nombreDe(combate.a)}</span>
            <div class="vs__centro">
              <div class="marcador">
                <div class="lado-marca">
                  <button class="paso" type="button" onclick={() => (ga = clamp(ga - 1))} aria-label="Menos games a {nombreDe(combate.a)}">–</button>
                  <span class="paso__n">{ga}</span>
                  <button class="paso" type="button" onclick={() => (ga = clamp(ga + 1))} aria-label="Más games a {nombreDe(combate.a)}">+</button>
                </div>
                <span class="paso__vs">:</span>
                <div class="lado-marca">
                  <button class="paso" type="button" onclick={() => (gb = clamp(gb - 1))} aria-label="Menos games a {nombreDe(combate.b)}">–</button>
                  <span class="paso__n">{gb}</span>
                  <button class="paso" type="button" onclick={() => (gb = clamp(gb + 1))} aria-label="Más games a {nombreDe(combate.b)}">+</button>
                </div>
              </div>
              <span class="marcador__hint">games ganados · máx {maxLados}</span>
            </div>
            <span class="vs__nom vs__nom--b">{nombreDe(combate.b)}</span>
          </div>
          <div class="combate__acc">
            <button class="boton" type="button" onclick={registrar} disabled={!puedeRegistrar}>Registrar resultado</button>
            <button class="mini" type="button" onclick={elegir}>↻ Otro</button>
            <button class="mini" type="button" onclick={cancelar}>✕ Cancelar</button>
          </div>
        {:else}
          <button class="elegir" type="button" onclick={elegir} disabled={etapa.participantes.length < 2}>
            ⚔️ ELEGIR COMBATE
          </button>
          <button class="enlace" type="button" onclick={() => (manual = !manual)}>o elegir a mano</button>
          {#if manual}
            <div class="mano">
              <select bind:value={selA} aria-label="Invocador A">
                <option value="" disabled>Invocador…</option>
                {#each etapa.participantes as id (id)}<option value={id}>{nombreDe(id)}</option>{/each}
              </select>
              <span class="mano__vs">vs</span>
              <select bind:value={selB} aria-label="Invocador B">
                <option value="" disabled>Invocador…</option>
                {#each etapa.participantes as id (id)}<option value={id}>{nombreDe(id)}</option>{/each}
              </select>
              <button class="mini" type="button" onclick={cargarManual} disabled={!selA || !selB || selA === selB}>Cargar</button>
            </div>
          {/if}
        {/if}
      </div>
    {/if}

    <!-- Tabla derivada -->
    <div class="tabla-wrap">
      <table class="tabla">
        <thead>
          <tr>
            <th class="c-pos">#</th>
            <th class="c-nom">Invocador</th>
            <th title="Jugados">PJ</th>
            <th title="Ganados">PG</th>
            <th title="Empatados">PE</th>
            <th title="Perdidos">PP</th>
            <th title="Diferencia de games">Dif</th>
            <th class="c-pts">Pts</th>
          </tr>
        </thead>
        <tbody>
          {#each filas as f (f.participanteId)}
            {@const mov = movimientoDe(f)}
            <tr animate:flip={{ duration: flipDur }} class:lider={f.pos === 1 && f.pj > 0}>
              <td class="c-pos">
                <span class="pos">{f.pos}</span>
                {#if mov > 0}<span class="mov mov--up">▲{mov}</span>
                {:else if mov < 0}<span class="mov mov--down">▼{-mov}</span>{/if}
              </td>
              <td class="c-nom">
                <span class="nom">{nombreDe(f.participanteId)}</span>
                <span class="insignias">
                  {#if f.invicto}<span class="ins ins--invicto" title="Invicto">✨</span>{/if}
                  {#if f.racha.tipo === 'V' && f.racha.n >= 2}
                    <span class="ins ins--fuego" title="En racha">🔥{f.racha.n}</span>
                  {:else if f.racha.tipo === 'D' && f.racha.n >= 3}
                    <span class="ins ins--frio" title="En horas bajas">🥶{f.racha.n}</span>
                  {/if}
                </span>
                {#if f.racha.tipo === 'V' && f.racha.n >= 1}
                  <span class="llamas" style="--calor:{Math.min(f.racha.n, 5) / 5}"></span>
                {/if}
              </td>
              <td>{f.pj}</td>
              <td>{f.pg}</td>
              <td>{f.pe}</td>
              <td>{f.pp}</td>
              <td class="dif">{f.difGames > 0 ? '+' : ''}{f.difGames}</td>
              <td class="c-pts">{f.pts}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <!-- Records / datos de show -->
    <div class="records">
      <span class="rec">👑 Cambios de liderato: <b>{liderato.cambios}</b></span>
      {#if mejorRacha && mejorRacha.mejorRachaV >= 2}
        <span class="rec">🏔️ Mejor racha: <b>{nombreDe(mejorRacha.participanteId)}</b> ({mejorRacha.mejorRachaV})</span>
      {/if}
      {#if nemesisPar}
        <span class="rec">😈 Némesis: <b>{nombreDe(nemesisPar.verdugo)}</b> → {nombreDe(nemesisPar.victima)} ({nemesisPar.n})</span>
      {/if}
    </div>

    <!-- Pie de acciones -->
    <div class="pie-acc">
      {#if duelos.length > 0}
        <button class="mini" type="button" onclick={deshacer}>↩️ Deshacer último</button>
      {/if}
      {#if torneo.estado !== 'finalizado'}
        {#if confirmFin}
          <span class="conf">¿Finalizar y coronar a <b>{nombreDe(filas[0]?.participanteId ?? '')}</b>?</span>
          <button class="mini mini--ok" type="button" onclick={finalizar}>Sí</button>
          <button class="mini" type="button" onclick={() => (confirmFin = false)}>No</button>
        {:else}
          <button class="mini" type="button" onclick={() => (confirmFin = true)} disabled={duelos.length === 0}>
            🏁 Finalizar torneo
          </button>
        {/if}
      {/if}
    </div>
  {/if}

  {#if evento}
    <div class="toast toast--{evento.tono}" transition:fade={{ duration: 200 }}>{evento.texto}</div>
  {/if}
</section>

<style>
  .detalle {
    width: 100%;
    max-width: 54rem;
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
  .cab__sub {
    margin: 0.7rem 0 0;
    font-size: 0.8rem;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: var(--humo);
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

  .placeholder {
    text-align: center;
    color: var(--humo);
    padding: 2rem;
    border: 1px dashed var(--borde-oro);
    border-radius: 4px;
  }

  /* ── Zona de combate ─────────────────────────────── */
  .combate {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.7rem;
    padding: clamp(1rem, 3vw, 1.5rem);
    margin-bottom: 1.6rem;
    border: 1px solid var(--borde-oro);
    border-radius: 4px;
    background: linear-gradient(180deg, rgba(18, 37, 60, 0.4), rgba(7, 11, 18, 0.4));
  }
  .elegir {
    font-family: var(--fuente-display);
    font-weight: 900;
    font-size: clamp(1.1rem, 3vw, 1.5rem);
    letter-spacing: 0.14em;
    color: #0a0f18;
    background: var(--oro-degradado-fuerte);
    border: 1px solid #e4d3a8;
    border-radius: 3px;
    padding: 0.9rem 2.2rem;
    cursor: pointer;
    box-shadow: var(--sombra-boton);
    transition: transform 0.15s, box-shadow 0.25s, filter 0.2s;
  }
  .elegir:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: var(--sombra-boton-hover);
  }
  .elegir:disabled {
    filter: grayscale(0.6) brightness(0.7);
    cursor: not-allowed;
  }
  .enlace {
    background: none;
    border: 0;
    color: var(--humo);
    font-size: 0.82rem;
    cursor: pointer;
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  .enlace:hover {
    color: var(--oro-claro);
  }
  .mano {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
  }
  .mano__vs {
    color: var(--sangre);
    font-family: var(--fuente-display);
    font-weight: 800;
  }
  select {
    background: rgba(7, 11, 18, 0.7);
    border: 1px solid var(--borde-oro);
    border-radius: 2px;
    color: var(--oro-claro);
    padding: 0.45rem 0.6rem;
    font-size: 0.9rem;
  }

  /* VS activo */
  .vs {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    gap: clamp(0.5rem, 2vw, 1.5rem);
    width: 100%;
  }
  .vs__nom {
    font-family: var(--fuente-display);
    font-weight: 700;
    font-size: clamp(1rem, 2.6vw, 1.5rem);
    color: var(--oro-claro);
    overflow-wrap: anywhere;
  }
  .vs__nom--a {
    text-align: right;
  }
  .vs__nom--b {
    text-align: left;
  }
  .vs__centro {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.4rem;
  }
  .marcador {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .paso {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    border: 1px solid var(--borde-oro);
    background: transparent;
    color: var(--oro);
    font-size: 1.2rem;
    cursor: pointer;
    transition: border-color 0.15s, color 0.15s;
  }
  .paso:hover {
    color: var(--oro-claro);
    border-color: var(--borde-oro-fuerte);
  }
  .paso__n {
    font-family: var(--fuente-display);
    font-weight: 900;
    font-size: 1.8rem;
    color: var(--oro-claro);
    min-width: 1.4ch;
    text-align: center;
  }
  .paso__vs {
    color: var(--sangre);
    font-family: var(--fuente-display);
    font-weight: 800;
  }
  .lado-marca {
    display: flex;
    align-items: center;
    gap: 0.35rem;
  }
  .marcador__hint {
    font-size: 0.62rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--humo);
  }
  .combate__acc {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.5rem;
    margin-top: 0.3rem;
  }

  /* ── Tabla ───────────────────────────────────────── */
  .tabla-wrap {
    overflow-x: auto;
  }
  .tabla {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.92rem;
  }
  .tabla th {
    font-size: 0.66rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--humo);
    font-weight: 600;
    padding: 0.5rem 0.4rem;
    text-align: center;
    border-bottom: 1px solid var(--borde-oro);
  }
  .tabla td {
    padding: 0.55rem 0.4rem;
    text-align: center;
    border-bottom: 1px solid var(--borde-oro-tenue);
    color: var(--oro-claro);
  }
  .c-pos {
    width: 3.4rem;
  }
  .c-nom {
    text-align: left !important;
    min-width: 9rem;
  }
  .c-pts {
    font-family: var(--fuente-display);
    font-weight: 800;
    color: var(--oro);
  }
  tr.lider td {
    background: rgba(200, 170, 110, 0.07);
  }
  tr.lider .c-pts {
    color: var(--oro-claro);
  }
  .pos {
    font-family: var(--fuente-display);
    font-weight: 700;
  }
  .mov {
    display: inline-block;
    margin-left: 0.25rem;
    font-size: 0.62rem;
  }
  .mov--up {
    color: var(--arcano);
  }
  .mov--down {
    color: var(--sangre);
  }
  .nom {
    font-weight: 600;
  }
  .insignias {
    margin-left: 0.35rem;
    white-space: nowrap;
  }
  .ins {
    font-size: 0.85rem;
  }
  .ins--fuego {
    color: #ffb457;
  }
  .llamas {
    display: block;
    height: 2px;
    margin-top: 3px;
    width: calc(var(--calor, 0) * 100%);
    background: linear-gradient(90deg, #ff8a3c, #ffd05a);
    border-radius: 2px;
    transition: width 0.4s ease;
  }
  .dif {
    color: var(--humo);
  }

  /* ── Records ─────────────────────────────────────── */
  .records {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem 1.2rem;
    justify-content: center;
    margin: 1rem 0;
    padding: 0.75rem;
    border-top: 1px solid var(--borde-oro-tenue);
    border-bottom: 1px solid var(--borde-oro-tenue);
    font-size: 0.82rem;
    color: var(--humo);
  }
  .rec b {
    color: var(--oro);
  }

  .pie-acc {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    margin-top: 1rem;
  }
  .conf {
    font-size: 0.85rem;
    color: var(--humo);
  }
  .conf b {
    color: var(--oro);
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
    padding: 0.45rem 0.75rem;
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

  /* ── Toast ───────────────────────────────────────── */
  .toast {
    position: fixed;
    left: 50%;
    bottom: 1.5rem;
    transform: translateX(-50%);
    z-index: 50;
    padding: 0.7rem 1.2rem;
    border-radius: 3px;
    background: rgba(7, 11, 18, 0.94);
    border: 1px solid var(--borde-oro);
    color: var(--oro-claro);
    font-size: 0.92rem;
    box-shadow: 0 20px 50px -20px #000;
    max-width: 90vw;
    text-align: center;
  }
  .toast--v {
    border-color: var(--borde-oro-fuerte);
  }
  .toast--e {
    border-color: var(--borde-arcano);
  }
</style>
