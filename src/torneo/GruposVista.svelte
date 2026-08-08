<script>
  // Fase 3.3 — Fase de grupos (100% manual). Se sortean/arman los grupos, cada
  // grupo tiene su mini-tabla derivada y sus combates (empates permitidos). Al
  // cerrar la fase, el shell ofrece abrir la siguiente etapa (eliminatoria, etc.).
  import { untrack } from 'svelte'
  import { flip } from 'svelte/animate'
  import {
    estado,
    registrarResultado,
    borrarDuelo,
    sembrarGrupos,
    limpiarGrupos,
    finalizarEtapa,
    reabrirEtapa,
  } from '../core/estado.svelte.js'
  import { clasificar, elegirCombatePar } from '../core/clasificacion.js'
  import { barajar } from '../core/bracket.js'
  import DueloRuleta from '../combate/DueloRuleta.svelte'
  import ModalCombate from '../combate/ModalCombate.svelte'
  import Marcador from '../combate/Marcador.svelte'

  let { torneo, etapa } = $props()

  /** @type {Record<string, number>} */
  const MAX_LADOS = { Bo1: 1, Bo3: 2, Bo5: 3 }
  const reduce =
    typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
  const flipDur = reduce ? 0 : 380

  const participantes = $derived(etapa?.participantes ?? [])
  const N = $derived(participantes.length)
  const grupos = $derived(etapa?.grupos ?? [])
  const sembrado = $derived(grupos.length > 0)
  const finalizada = $derived(etapa?.estado === 'finalizada')
  const jugables = $derived(torneo.estado !== 'finalizado' && !finalizada)
  const maxLados = $derived(MAX_LADOS[torneo.reglas.formato] ?? 1)
  const jugados = $derived(etapa?.duelos.length ?? 0)

  const nombreDe = (/** @type {string} */ id) =>
    estado.participantes.find((p) => p.id === id)?.nombre ?? '—'

  const letraGrupo = (/** @type {number} */ i) => String.fromCharCode(65 + i)
  const duelosDeGrupo = (/** @type {any} */ grupo) =>
    grupo.duelos.map((id) => estado.duelos.find((d) => d.id === id)).filter((d) => d && d.estado === 'terminado')
  const clasificarGrupo = (/** @type {any} */ grupo) =>
    clasificar(grupo.participantes, duelosDeGrupo(grupo), torneo.puntos)

  // ── Siembra ──────────────────────────────────────────
  const maxGrupos = $derived(Math.max(2, Math.floor(N / 2)))
  let modo = $state('sorteo') // 'sorteo' | 'manual'
  let nGrupos = $state(2)
  let sorteo = $state(untrack(() => [...participantes])) // orden para el reparto por sorteo
  let asign = $state(untrack(() => participantes.map((_, i) => i % 2))) // grupo de cada participante (manual)

  function distribuir(orden, g) {
    const gs = Array.from({ length: g }, (_, i) => ({ nombre: `Grupo ${letraGrupo(i)}`, participantes: /** @type {string[]} */ ([]) }))
    orden.forEach((id, k) => gs[k % g].participantes.push(id))
    return gs
  }
  const gruposManual = $derived.by(() => {
    const gs = Array.from({ length: nGrupos }, (_, i) => ({ nombre: `Grupo ${letraGrupo(i)}`, participantes: /** @type {string[]} */ ([]) }))
    participantes.forEach((id, i) => gs[Math.min(asign[i] ?? 0, nGrupos - 1)].participantes.push(id))
    return gs
  })
  const gruposPreview = $derived(modo === 'sorteo' ? distribuir(sorteo, nGrupos) : gruposManual)
  const previewValido = $derived(gruposPreview.every((g) => g.participantes.length >= 2))

  function sortear() {
    sorteo = barajar(participantes)
  }
  function generar() {
    if (previewValido) sembrarGrupos(torneo.id, etapa.id, gruposPreview)
  }
  function reSembrar() {
    limpiarGrupos(torneo.id, etapa.id)
  }

  // ── Combate en curso (uno a la vez, en algún grupo) ──
  /** @type {{ grupoId:string, a:string, b:string } | null} */
  let combate = $state(null)
  let ga = $state(0)
  let gb = $state(0)
  /** @type {string | null} */
  let manualEn = $state(null) // grupoId con el selector a mano abierto
  let selA = $state('')
  let selB = $state('')

  // Cara del combate: ruleta (teatral) o manual (ENFRENTAMIENTO).
  const esRuleta = $derived(torneo.reglas.resolucion === 'ruleta')
  /** @type {{ a: string, b: string } | null} */
  let sorteados = $state(null) // último par sorteado por la ruleta (1.7); persiste en 1.10
  // Fila 2 del marcador (1.8): campeones jugados; alimentan el restock (1.9).
  /** @type {string[]} */ let jugadosA = $state([])
  /** @type {string[]} */ let jugadosB = $state([])
  // Grupo del combate en curso (para el modal de ruleta a nivel de vista).
  const grupoActivo = $derived(combate ? grupos.find((g) => g.id === combate.grupoId) ?? null : null)

  const puedeRegistrar = $derived(combate && (ga > 0 || gb > 0))

  function reset() {
    ga = 0
    gb = 0
    sorteados = null
    jugadosA = []
    jugadosB = []
  }
  function elegir(/** @type {any} */ grupo) {
    const par = elegirCombatePar(grupo.participantes, duelosDeGrupo(grupo))
    if (par) {
      combate = { grupoId: grupo.id, a: par.a, b: par.b }
      manualEn = null
      reset()
    }
  }
  function cargarManual(/** @type {any} */ grupo) {
    if (selA && selB && selA !== selB) {
      combate = { grupoId: grupo.id, a: selA, b: selB }
      manualEn = null
      selA = ''
      selB = ''
      reset()
    }
  }
  function cancelar() {
    combate = null
    reset()
  }
  function registrar() {
    if (!combate || (ga === 0 && gb === 0)) return
    registrarResultado(torneo.id, etapa.id, combate.a, combate.b, { a: ga, b: gb }, combate.grupoId, {
      a: $state.snapshot(jugadosA),
      b: $state.snapshot(jugadosB),
    })
    cancelar()
  }
  function deshacer(/** @type {any} */ grupo) {
    const ds = duelosDeGrupo(grupo)
    const ultimo = ds[ds.length - 1]
    if (ultimo) borrarDuelo(ultimo.id)
  }
</script>

<div class="etapa-body">
  <p class="etapa-sub">
    {etapa?.nombre ?? 'Fase de grupos'} · {torneo.reglas.resolucion === 'ruleta' ? 'Ruleta' : 'Manual'}
    {torneo.reglas.formato} · {N} invocadores · {grupos.length}
    {grupos.length === 1 ? 'grupo' : 'grupos'} · {jugados} combates
  </p>

  {#if !sembrado}
    <!-- ── Panel de siembra ── -->
    <div class="siembra">
      <label class="ngrupos">
        <span>Número de grupos</span>
        <select bind:value={nGrupos}>
          {#each Array.from({ length: maxGrupos - 1 }, (_, i) => i + 2) as g (g)}
            <option value={g}>{g} grupos</option>
          {/each}
        </select>
      </label>

      <div class="modos">
        <button type="button" class="modo" class:modo--on={modo === 'sorteo'} onclick={() => (modo = 'sorteo')}>🎲 Sorteo</button>
        <button type="button" class="modo" class:modo--on={modo === 'manual'} onclick={() => (modo = 'manual')}>✍️ Manual</button>
      </div>

      {#if modo === 'sorteo'}
        <p class="siembra__ayuda">Reparte a los {N} invocadores en {nGrupos} grupos. Puedes volver a sortear.</p>
        <button class="mini" type="button" onclick={sortear}>🎲 Sortear grupos</button>
      {:else}
        <p class="siembra__ayuda">Asigna a cada invocador su grupo. Cada grupo necesita al menos 2.</p>
        <div class="asignador">
          {#each participantes as id, i (id)}
            <label class="asig">
              <span class="asig__nom">{nombreDe(id)}</span>
              <select bind:value={asign[i]}>
                {#each Array.from({ length: nGrupos }, (_, g) => g) as g (g)}
                  <option value={g}>Grupo {letraGrupo(g)}</option>
                {/each}
              </select>
            </label>
          {/each}
        </div>
      {/if}

      <!-- Vista previa -->
      <div class="previa-grupos">
        {#each gruposPreview as g (g.nombre)}
          <div class="previa-g">
            <span class="previa-g__nom">{g.nombre} · {g.participantes.length}</span>
            <ul>
              {#each g.participantes as id (id)}<li>{nombreDe(id)}</li>{/each}
            </ul>
          </div>
        {/each}
      </div>

      {#if !previewValido}
        <p class="hint-mal">Cada grupo debe tener al menos 2 invocadores.</p>
      {/if}
      <button class="boton" type="button" onclick={generar} disabled={!previewValido}>Generar grupos</button>
    </div>
  {:else}
    <!-- ── Grupos sembrados ── -->
    {#if finalizada}
      <div class="cerrada">
        <span>🔒 Fase de grupos cerrada.</span>
        {#if torneo.estado !== 'finalizado'}
          <button class="mini" type="button" onclick={() => reabrirEtapa(torneo.id, etapa.id)}>Reabrir fase</button>
        {/if}
      </div>
    {/if}

    <div class="grupos">
      {#each grupos as grupo (grupo.id)}
        {@const filas = clasificarGrupo(grupo)}
        <div class="grupo">
          <h3 class="grupo__nom">{grupo.nombre}</h3>

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
                <tr animate:flip={{ duration: flipDur }} class:lider={f.pos === 1 && f.pj > 0}>
                  <td class="c-pos">{f.pos}</td>
                  <td class="c-nom">
                    <span class="nom">{nombreDe(f.participanteId)}</span>
                    {#if f.invicto && f.pj > 0}<span class="ins" title="Invicto">✨</span>{/if}
                    {#if f.racha.tipo === 'V' && f.racha.n >= 2}<span class="ins" title="En racha">🔥{f.racha.n}</span>{/if}
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

          {#if jugables}
            {#if combate && combate.grupoId === grupo.id}
              {#if esRuleta}
                <p class="en-curso">⚔️ Combate por ruleta en curso…</p>
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
                  compacto
                  exportable
                  titulo={grupo.nombre ?? etapa?.nombre ?? 'Fase de grupos'}
                  hint="games · campeones jugados (fila 2) · máx {maxLados} · empate permitido"
                />
                <div class="grupo__acc">
                  <button class="boton boton--sm" type="button" onclick={registrar} disabled={!puedeRegistrar}>Registrar</button>
                  <button class="mini" type="button" onclick={() => elegir(grupo)}>↻ Otro</button>
                  <button class="mini" type="button" onclick={cancelar}>✕</button>
                </div>
              {/if}
            {:else}
              <div class="grupo__acc">
                <button class="elegir" type="button" onclick={() => elegir(grupo)} disabled={grupo.participantes.length < 2}>⚔️ Elegir combate</button>
                <button class="enlace" type="button" onclick={() => (manualEn = manualEn === grupo.id ? null : grupo.id)}>a mano</button>
                {#if duelosDeGrupo(grupo).length > 0}
                  <button class="mini" type="button" onclick={() => deshacer(grupo)}>↩️ Deshacer</button>
                {/if}
              </div>
              {#if manualEn === grupo.id}
                <div class="mano">
                  <select bind:value={selA} aria-label="Invocador A">
                    <option value="" disabled>Invocador…</option>
                    {#each grupo.participantes as id (id)}<option value={id}>{nombreDe(id)}</option>{/each}
                  </select>
                  <span class="mano__vs">vs</span>
                  <select bind:value={selB} aria-label="Invocador B">
                    <option value="" disabled>Invocador…</option>
                    {#each grupo.participantes as id (id)}<option value={id}>{nombreDe(id)}</option>{/each}
                  </select>
                  <button class="mini" type="button" onclick={() => cargarManual(grupo)} disabled={!selA || !selB || selA === selB}>Cargar</button>
                </div>
              {/if}
            {/if}
          {/if}
        </div>
      {/each}
    </div>

    <!-- Cara ruleta: modal/overlay "Pantalla VS" (1.6). -->
    {#if esRuleta && combate && grupoActivo}
      <ModalCombate onCerrar={cancelar} titulo={grupoActivo.nombre}>
        <Marcador
          a={combate.a}
          b={combate.b}
          bind:ga
          bind:gb
          bind:jugadosA
          bind:jugadosB
          {maxLados}
          exportable
          titulo={grupoActivo.nombre ?? etapa?.nombre ?? 'Fase de grupos'}
          hint="marcador final · máx {maxLados} · empate permitido · la fila 2 la anota la ruleta"
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
        <div class="grupo__acc">
          <button class="boton boton--sm" type="button" onclick={registrar} disabled={!puedeRegistrar}>Registrar</button>
          <button class="mini" type="button" onclick={() => elegir(grupoActivo)}>↻ Otro</button>
          <button class="mini" type="button" onclick={cancelar}>✕ Cancelar</button>
        </div>
      </ModalCombate>
    {/if}

    <!-- Pie de la fase -->
    <div class="pie-acc">
      {#if jugables && jugados === 0}
        <button class="mini" type="button" onclick={reSembrar}>↻ Volver a sembrar</button>
      {/if}
      {#if jugables}
        <button class="boton" type="button" onclick={() => finalizarEtapa(torneo.id, etapa.id)} disabled={jugados === 0}>
          🏁 Finalizar fase de grupos
        </button>
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
    letter-spacing: 0.05em;
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
  .ngrupos {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    font-size: 0.72rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--humo);
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
  .asignador {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(12rem, 1fr));
    gap: 0.4rem;
    width: 100%;
  }
  .asig {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    padding: 0.3rem 0.5rem;
    border: 1px solid var(--borde-oro-tenue);
    border-radius: 3px;
  }
  .asig__nom {
    color: var(--oro-claro);
    font-size: 0.85rem;
    overflow-wrap: anywhere;
  }
  .previa-grupos {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(10rem, 1fr));
    gap: 0.6rem;
    width: 100%;
  }
  .previa-g {
    border: 1px solid var(--borde-oro-tenue);
    border-radius: 3px;
    padding: 0.5rem 0.7rem;
  }
  .previa-g__nom {
    font-family: var(--fuente-display);
    font-weight: 700;
    color: var(--oro);
    font-size: 0.85rem;
  }
  .previa-g ul {
    margin: 0.4rem 0 0;
    padding-left: 1.1rem;
    color: var(--oro-claro);
    font-size: 0.85rem;
  }
  .hint-mal {
    margin: 0;
    color: var(--sangre);
    font-size: 0.8rem;
  }

  /* ── Grupos ──────────────────────────────────────── */
  .cerrada {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.8rem;
    margin-bottom: 1.2rem;
    padding: 0.7rem;
    border: 1px solid var(--borde-oro-tenue);
    border-radius: 4px;
    color: var(--humo);
  }
  .grupos {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(19rem, 1fr));
    gap: 1rem;
  }
  .grupo {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    padding: 0.9rem;
    border: 1px solid var(--borde-oro-tenue);
    border-radius: 4px;
    background: linear-gradient(180deg, rgba(18, 37, 60, 0.35), rgba(7, 11, 18, 0.35));
  }
  .grupo__nom {
    margin: 0;
    font-family: var(--fuente-display);
    font-weight: 800;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    font-size: 0.9rem;
    color: var(--oro);
  }

  .tabla {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.82rem;
  }
  .tabla th {
    font-size: 0.6rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--humo);
    font-weight: 600;
    padding: 0.35rem 0.25rem;
    text-align: center;
    border-bottom: 1px solid var(--borde-oro);
  }
  .tabla td {
    padding: 0.4rem 0.25rem;
    text-align: center;
    border-bottom: 1px solid var(--borde-oro-tenue);
    color: var(--oro-claro);
  }
  .c-pos {
    width: 1.6rem;
  }
  .c-nom {
    text-align: left !important;
    min-width: 6rem;
  }
  .c-pts {
    font-family: var(--fuente-display);
    font-weight: 800;
    color: var(--oro);
  }
  tr.lider td {
    background: rgba(200, 170, 110, 0.07);
  }
  .nom {
    font-weight: 600;
  }
  .ins {
    margin-left: 0.25rem;
    font-size: 0.78rem;
  }
  .dif {
    color: var(--humo);
  }

  .grupo__acc {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
  }
  .en-curso {
    margin: 0;
    text-align: center;
    font-size: 0.8rem;
    color: var(--arcano);
  }
  .elegir {
    font-family: var(--fuente-display);
    font-weight: 700;
    font-size: 0.8rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: #0a0f18;
    background: var(--oro-degradado);
    border: 1px solid #e4d3a8;
    border-radius: 2px;
    padding: 0.45rem 0.9rem;
    cursor: pointer;
    transition: filter 0.2s;
  }
  .elegir:hover:not(:disabled) {
    filter: brightness(1.08);
  }
  .elegir:disabled {
    filter: grayscale(0.6) brightness(0.7);
    cursor: not-allowed;
  }
  .enlace {
    background: none;
    border: 0;
    color: var(--humo);
    font-size: 0.78rem;
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
    justify-content: center;
    gap: 0.4rem;
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
    padding: 0.35rem 0.45rem;
    font-size: 0.85rem;
  }

  .pie-acc {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 0.8rem;
    margin-top: 1.4rem;
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
  .boton--sm {
    font-size: 0.75rem;
    padding: 0.45rem 0.9rem;
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
