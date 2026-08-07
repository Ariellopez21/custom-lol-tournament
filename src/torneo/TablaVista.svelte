<script>
  // Fase 3.5 — Vista de una etapa tipo "tabla" (Liga). Extraída del shell 3.3.
  // ELEGIR COMBATE (azar inteligente) → VS → resultado manual → la tabla se
  // recalcula y reordena animada, con datos de espectáculo.
  import { flip } from 'svelte/animate'
  import { fade } from 'svelte/transition'
  import {
    estado,
    registrarResultado,
    borrarDuelo,
    finalizarTorneo,
  } from '../core/estado.svelte.js'
  import { clasificar, cambiosDeLiderato, nemesis, elegirCombatePar } from '../core/clasificacion.js'
  import DueloRuleta from '../combate/DueloRuleta.svelte'
  import ModalCombate from '../combate/ModalCombate.svelte'
  import Marcador from '../combate/Marcador.svelte'

  let { torneo, etapa } = $props()

  /** @typedef {import('../core/clasificacion.js').Fila} Fila */
  /** @type {Record<string, number>} */
  const MAX_LADOS = { Bo1: 1, Bo3: 2, Bo5: 3 }
  const reduce =
    typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
  const flipDur = reduce ? 0 : 420

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
  // Podio (top-3 de la tabla) para la pantalla de cierre. Orden visual 2-1-3.
  const podio = $derived([filas[1], filas[0], filas[2]].filter(Boolean))

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
  let campeonSel = $state('')
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let timer

  // Cara del combate: ruleta (teatral, hereda campeones) o manual (ENFRENTAMIENTO).
  const esRuleta = $derived(torneo.reglas.resolucion === 'ruleta')
  /** @type {{ a: string, b: string } | null} */
  let sorteados = $state(null) // último par sorteado por la ruleta (1.7); se persiste en 1.10
  // Fila 2 del marcador (1.8): campeones jugados por cada lado. Alimentan el
  // restock (1.9). Transitorios por combate (persistir en games[] = 1.10).
  /** @type {string[]} */ let jugadosA = $state([])
  /** @type {string[]} */ let jugadosB = $state([])

  const puedeRegistrar = $derived(combate && (ga > 0 || gb > 0))

  const nombreDe = (/** @type {string} */ id) =>
    estado.participantes.find((p) => p.id === id)?.nombre ?? '—'

  function reset() {
    ga = 0
    gb = 0
    sorteados = null
    jugadosA = []
    jugadosB = []
  }
  function elegir() {
    const par = elegirCombatePar(etapa.participantes, duelos)
    if (par) {
      combate = par
      manual = false
      reset()
    }
  }
  function cargarManual() {
    if (selA && selB && selA !== selB) {
      combate = { a: selA, b: selB }
      manual = false
      reset()
    }
  }
  function cancelar() {
    combate = null
    reset()
  }

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
  function abrirFin() {
    // Por defecto se corona al líder; el humano puede elegir a otro (empates, etc.).
    campeonSel = filas[0]?.participanteId ?? ''
    confirmFin = true
  }
  function finalizar() {
    finalizarTorneo(torneo.id, campeonSel || filas[0]?.participanteId || null)
    confirmFin = false
  }

  const movimientoDe = (/** @type {Fila} */ f) => {
    if (duelos.length === 0) return 0
    const prev = posPrevia.get(f.participanteId)
    return prev != null && f.pos != null ? prev - f.pos : 0
  }
</script>

<div class="etapa-body">
  <p class="etapa-sub">
    {etapa?.nombre ?? 'Liga'} · {torneo.reglas.resolucion === 'ruleta' ? 'Ruleta' : 'Manual'}
    {torneo.reglas.formato} · {etapa?.participantes.length ?? 0} invocadores · {duelos.length}
    {duelos.length === 1 ? 'combate' : 'combates'} · victoria {torneo.puntos.victoria} / empate
    {torneo.puntos.empate} / derrota {torneo.puntos.derrota}
  </p>

  {#if torneo.estado === 'finalizado' && podio.length >= 2}
    <div class="cierre" transition:fade={{ duration: 250 }}>
      <ol class="podio">
        {#each podio as f (f.participanteId)}
          <li class="podio__p podio__p--{f.pos}" class:podio__p--rey={f.participanteId === torneo.campeon}>
            <span class="podio__nom">{nombreDe(f.participanteId)}</span>
            <div class="podio__grada">
              <span class="podio__medalla">{f.participanteId === torneo.campeon ? '👑' : f.pos === 1 ? '🥇' : f.pos === 2 ? '🥈' : '🥉'}</span>
              <span class="podio__pos">{f.pos}º</span>
              <span class="podio__pts">{f.pts} pts</span>
            </div>
          </li>
        {/each}
      </ol>
    </div>
  {/if}

  <!-- Zona de combate -->
  {#if torneo.estado !== 'finalizado'}
    <div class="combate">
      {#if combate}
        {#if esRuleta}
          <p class="en-curso">⚔️ Combate por ruleta en curso · <b>{nombreDe(combate.a)}</b> vs <b>{nombreDe(combate.b)}</b></p>
        {:else}
          <Marcador
            a={combate.a}
            b={combate.b}
            bind:ga
            bind:gb
            bind:jugadosA
            bind:jugadosB
            {maxLados}
            permitirAnadir
            hint="games ganados · campeones jugados (fila 2) · máx {maxLados}"
          />
          <div class="combate__acc">
            <button class="boton" type="button" onclick={registrar} disabled={!puedeRegistrar}>Registrar resultado</button>
            <button class="mini" type="button" onclick={elegir}>↻ Otro</button>
            <button class="mini" type="button" onclick={cancelar}>✕ Cancelar</button>
          </div>
        {/if}
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

    <!-- Cara ruleta: modal/overlay "Pantalla VS" (1.6). -->
    {#if esRuleta && combate}
      <ModalCombate onCerrar={cancelar} titulo={etapa?.nombre ?? 'Liga'}>
        <Marcador
          a={combate.a}
          b={combate.b}
          bind:ga
          bind:gb
          bind:jugadosA
          bind:jugadosB
          {maxLados}
          hint="marcador final · máx {maxLados} · la fila 2 la anota la ruleta"
        />
        <DueloRuleta
          a={combate.a}
          b={combate.b}
          reglas={torneo.reglas}
          {maxLados}
          mostrarCabecera={false}
          bind:jugadosA
          bind:jugadosB
          onsorteo={(c) => (sorteados = c)}
        />
        <div class="combate__acc">
          <button class="boton" type="button" onclick={registrar} disabled={!puedeRegistrar}>Registrar resultado</button>
          <button class="mini" type="button" onclick={elegir}>↻ Otro combate</button>
          <button class="mini" type="button" onclick={cancelar}>✕ Cancelar</button>
        </div>
      </ModalCombate>
    {/if}
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
  {#if torneo.estado !== 'finalizado' && confirmFin}
    <div class="fin-panel" transition:fade={{ duration: 150 }}>
      <span class="fin-panel__lbl">🏆 Elegir campeón</span>
      <select bind:value={campeonSel} aria-label="Campeón del torneo">
        {#each filas as f (f.participanteId)}
          <option value={f.participanteId}>{f.pos}º · {nombreDe(f.participanteId)} · {f.pts} pts</option>
        {/each}
      </select>
      <span class="fin-panel__hint">Por defecto, el líder de la tabla. Puedes coronar a otro.</span>
      <div class="fin-panel__acc">
        <button class="boton" type="button" onclick={finalizar} disabled={!campeonSel}>Coronar y finalizar</button>
        <button class="mini" type="button" onclick={() => (confirmFin = false)}>Cancelar</button>
      </div>
    </div>
  {/if}
  <div class="pie-acc">
    {#if duelos.length > 0}
      <button class="mini" type="button" onclick={deshacer}>↩️ Deshacer último</button>
    {/if}
    {#if torneo.estado !== 'finalizado' && !confirmFin}
      <button class="mini" type="button" onclick={abrirFin} disabled={duelos.length === 0}>
        🏁 Finalizar torneo
      </button>
    {/if}
  </div>

  {#if evento}
    <div class="toast toast--{evento.tono}" transition:fade={{ duration: 200 }}>{evento.texto}</div>
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
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: var(--humo);
  }

  .cierre {
    margin-bottom: 1.4rem;
  }

  /* ── Podio de cierre ─────────────────────────────── */
  .podio {
    display: flex;
    align-items: flex-end;
    justify-content: center;
    gap: 0.5rem;
    margin: 1.1rem 0 0;
    padding: 0;
    list-style: none;
  }
  .podio__p {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.35rem;
    width: clamp(5rem, 26%, 8rem);
  }
  .podio__nom {
    font-weight: 700;
    font-size: 0.85rem;
    color: var(--oro-claro);
    text-align: center;
    overflow-wrap: anywhere;
  }
  .podio__grada {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-end;
    gap: 0.15rem;
    width: 100%;
    border: 1px solid var(--borde-oro-tenue);
    border-bottom: 0;
    border-radius: 3px 3px 0 0;
    background: linear-gradient(180deg, rgba(18, 37, 60, 0.5), rgba(7, 11, 18, 0.2));
    padding: 0.5rem 0.3rem 0.4rem;
  }
  .podio__p--1 .podio__grada {
    height: 6.5rem;
    border-color: var(--borde-oro-fuerte);
    background: linear-gradient(180deg, rgba(200, 170, 110, 0.2), rgba(7, 11, 18, 0.2));
  }
  .podio__p--2 .podio__grada {
    height: 5rem;
  }
  .podio__p--3 .podio__grada {
    height: 4rem;
  }
  .podio__p--rey .podio__nom {
    color: var(--oro);
  }
  .podio__medalla {
    font-size: 1.3rem;
    line-height: 1;
  }
  .podio__pos {
    font-family: var(--fuente-display);
    font-weight: 900;
    color: var(--oro);
    font-size: 1.1rem;
  }
  .podio__pts {
    font-size: 0.66rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--humo);
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

  .combate__acc {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.5rem;
    margin-top: 0.3rem;
  }
  .en-curso {
    margin: 0;
    text-align: center;
    font-size: 0.85rem;
    letter-spacing: 0.04em;
    color: var(--arcano);
  }
  .en-curso b {
    color: var(--oro-claro);
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

  /* ── Panel de finalizar (elegir ganador) ─────────── */
  .fin-panel {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.6rem;
    margin-top: 1.2rem;
    padding: 1rem;
    border: 1px solid var(--borde-oro-fuerte);
    border-radius: 4px;
    background: radial-gradient(120% 100% at 50% 0%, rgba(200, 170, 110, 0.1), transparent 70%);
  }
  .fin-panel__lbl {
    font-family: var(--fuente-display);
    font-weight: 800;
    letter-spacing: 0.1em;
    color: var(--oro-claro);
  }
  .fin-panel__hint {
    font-size: 0.72rem;
    color: var(--humo);
    text-align: center;
  }
  .fin-panel__acc {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.5rem;
    margin-top: 0.2rem;
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
