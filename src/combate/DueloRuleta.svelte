<script>
  // Fase 1.6 + 1.7 — Cara "ruleta" del combate del torneo (componente compartido).
  // Es el PUENTE Fase 1 ↔ Fase 3: lo montan Tabla/Grupos/Bracket cuando
  // `reglas.resolucion === 'ruleta'`. Reúne:
  //   · 1.6 → cabecera VS con la ficha (avatar/inicial + nombre) de ambos invocadores.
  //   · 1.7 → la ruleta gira SEGÚN las reglas heredadas del torneo y revela el/los
  //           campeón(es), que emite por `onsorteo`.
  //
  // Reglas de pool (decisiones congeladas de Fase 1):
  //   · championPool = false            → sortea entre los 173 (single o dual).
  //   · championPool = true + mirror    → 1 ruleta sobre la UNIÓN de ambos pools
  //                                        (pool vacío en alguno ⇒ los 173).
  //   · championPool = true + dual      → 2 ruletas, cada una sobre el pool PROPIO
  //                                        del invocador (vacío ⇒ los 173).
  //
  // 1.8 — tras cada giro, el botón «✓ Anotar» empuja el/los campeón(es) a la fila 2
  //       del marcador (bind:jugadosA/B, compartido con `Marcador.svelte`).
  // 1.9 — restock: si `reglas.restock === false`, la ruleta EXCLUYE los campeones
  //       ya jugados (los de la fila 2). En mirror excluye la unión; en dual, el
  //       pool propio de cada uno. Si al excluir se vacía el pool, no se vacía la
  //       ruleta (se permite repetir) para no bloquear en pools pequeños.
  import Ruleta from './Ruleta.svelte'
  import { estado } from '../core/estado.svelte.js'
  import { CHAMPION_IDS, getChampion } from '../core/champions.js'
  import * as sonido from '../core/sonido.js'

  let {
    a,
    b,
    reglas,
    jugadosA = $bindable([]),
    jugadosB = $bindable([]),
    maxLados = 1,
    mostrarCabecera = true,
    /** @type {(campeones: { a: string, b: string }) => void} */
    onsorteo = () => {},
    deshabilitado = false,
  } = $props()

  const partA = $derived(estado.participantes.find((p) => p.id === a))
  const partB = $derived(estado.participantes.find((p) => p.id === b))
  const nombreA = $derived(partA?.nombre ?? '—')
  const nombreB = $derived(partB?.nombre ?? '—')
  const inicial = (/** @type {string} */ n) => (n?.trim()[0] ?? '?').toUpperCase()

  /** mirror ON = single (1 giro, ambos el mismo) · OFF = dual (1 por invocador). */
  const modo = $derived(reglas?.mirror ? 'single' : 'dual')

  // Pool propio de un invocador; vacío = los 173 (convención de Participantes).
  const poolPropio = (/** @type {any} */ part) => {
    const p = part?.championPool
    return p && p.length ? p : CHAMPION_IDS
  }

  // 1.9 — Restock: si está OFF, quita de `lista` los ya jugados; si eso la vacía
  // (pool agotado), se devuelve la lista original para no bloquear el giro.
  const conRestock = (/** @type {string[]} */ lista, /** @type {string[]} */ jugados) => {
    if (reglas?.restock) return lista // restock ON: se pueden repetir
    const fuera = new Set(jugados)
    const libres = lista.filter((id) => !fuera.has(id))
    return libres.length ? libres : lista
  }

  // Lista base de la ruleta en SINGLE (mirror): unión de ambos pools; si alguno no
  // restringe su pool (vacío) la unión da los 173.
  const baseMirror = $derived.by(() => {
    if (!reglas?.championPool) return CHAMPION_IDS
    const pa = partA?.championPool ?? []
    const pb = partB?.championPool ?? []
    if (pa.length === 0 || pb.length === 0) return CHAMPION_IDS
    return [...new Set([...pa, ...pb])]
  })
  const baseA = $derived(reglas?.championPool ? poolPropio(partA) : CHAMPION_IDS)
  const baseB = $derived(reglas?.championPool ? poolPropio(partB) : CHAMPION_IDS)

  // Listas efectivas ya filtradas por restock (fila 2 = jugadosA/B).
  const itemsMirror = $derived(conRestock(baseMirror, [...jugadosA, ...jugadosB]))
  const itemsA = $derived(conRestock(baseA, jugadosA))
  const itemsB = $derived(conRestock(baseB, jugadosB))
  const nPool = $derived(modo === 'single' ? itemsMirror.length : null)

  // Contador de games (para el rótulo del botón). Total máx. de games = 2·máx−1
  // (p.ej. Bo3 ⇒ máx 2 lados ⇒ hasta 3 games; Bo1 ⇒ 1).
  const maxGames = $derived(Math.max(1, 2 * maxLados - 1))
  const gameN = $derived(Math.max(jugadosA.length, jugadosB.length) + 1)
  const quedanGames = $derived(gameN <= maxGames)

  // ── Giro ─────────────────────────────────────────────
  // Duración del giro: debe coincidir con la de `Ruleta.svelte` para que el
  // sonido (1.11) case con el frenado visual (reduced-motion ⇒ 900 ms).
  const reduce =
    typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
  const DUR_GIRO = reduce ? 900 : 5200

  let r1 = $state()
  let r2 = $state()
  let girando = $state(false)
  let pendientes = $state(0)
  /** @type {string | null} */ let champA = $state(null)
  /** @type {string | null} */ let champB = $state(null)

  const campeonA = $derived(champA ? getChampion(champA) : null)
  const campeonB = $derived(champB ? getChampion(champB) : null)
  const hayResultado = $derived(!!(champA || champB))

  // Nuevo par de invocadores ⇒ limpiar la revelación previa.
  $effect.pre(() => {
    a
    b
    champA = null
    champB = null
  })

  function girar() {
    if (girando) return
    champA = null
    champB = null
    girando = true
    sonido.giro(DUR_GIRO) // 1.11 — una sola pista de tics, aunque sean 2 tambores
    if (modo === 'single') {
      pendientes = 1
      r1?.girar()
    } else {
      pendientes = 2
      r1?.girar()
      r2?.girar()
    }
  }

  const res1 = (/** @type {string} */ id) => {
    champA = id
    if (modo === 'single') champB = id // mirror: ambos juegan el mismo
    finPaso()
  }
  const res2 = (/** @type {string} */ id) => {
    champB = id
    finPaso()
  }
  function finPaso() {
    if (--pendientes <= 0) {
      girando = false // el resultado espera a «Anotar»
      sonido.revelacion() // 1.11 — fanfarria al aterrizar el/los campeón(es)
    }
  }

  // 1.8 — «Anotar»: fija el/los campeón(es) del game en la fila 2 y limpia la
  // revelación, listo para el siguiente giro. En mirror, el mismo va a ambos.
  function anotar() {
    if (girando || !champA || !champB) return
    jugadosA = [...jugadosA, champA]
    jugadosB = [...jugadosB, champB]
    onsorteo({ a: champA, b: champB })
    champA = null
    champB = null
    sonido.anotar() // 1.11 — blip positivo al fijar el campeón en la fila 2
  }

  const etiquetaGirar = $derived(
    girando ? 'Girando…' : modo === 'single' ? '⚔️ Girar la ruleta' : '⚔️ Girar ambas'
  )
</script>

<div class="duelo">
  <!-- VS (1.6): fichas de ambos invocadores. Se oculta si el Marcador ya muestra
       la identidad de ambos (cara ruleta del torneo, mostrarCabecera=false). -->
  {#if mostrarCabecera}
    <div class="vs-cab">
      {@render ficha(nombreA, partA?.avatar)}
      <span class="vs-cab__x">VS</span>
      {@render ficha(nombreB, partB?.avatar)}
    </div>
  {/if}

  <p class="duelo__meta">
    {#if modo === 'single'}
      Mirror · un campeón para ambos{#if reglas?.championPool} · sorteo sobre {nPool}{/if}
    {:else}
      Dual · un campeón por invocador{#if reglas?.championPool} · desde el pool de cada uno{/if}
    {/if}
    {#if !reglas?.restock} · <span class="duelo__restock">sin restock</span>{/if}
    {#if maxGames > 1} · game {Math.min(gameN, maxGames)}/{maxGames}{/if}
  </p>

  <div class="duelo__acc">
    {#if hayResultado && !girando}
      <button class="girar" type="button" onclick={anotar} disabled={deshabilitado}>✓ Anotar {modo === 'single' ? 'campeón' : 'campeones'}</button>
      <button class="mini" type="button" onclick={girar} disabled={deshabilitado}>↻ Repetir giro</button>
    {:else}
      <button class="girar" type="button" onclick={girar} disabled={girando || deshabilitado || !quedanGames}>{etiquetaGirar}</button>
    {/if}
  </div>
  {#if !quedanGames && !hayResultado && !girando}
    <p class="duelo__tope">Se anotaron los {maxGames} games. Quita alguno de la fila 2 para volver a girar.</p>
  {/if}

  <!-- Ruleta (1.7): single = 1 tambor · dual = 2 tambores -->
  {#if modo === 'single'}
    <div class="arena">
      <Ruleta bind:this={r1} items={itemsMirror} alto={70} onresultado={res1} />
      {#if campeonA && !girando}
        {@render revela(campeonA, 'El elegido · ambos lo juegan')}
      {/if}
    </div>
  {:else}
    <div class="arena arena--dual">
      <div class="lado">
        <p class="lado__nom">{nombreA}</p>
        <Ruleta bind:this={r1} items={itemsA} alto={60} onresultado={res1} />
        {#if campeonA && !girando}{@render revela(campeonA, nombreA, true)}{/if}
      </div>
      <div class="lado">
        <p class="lado__nom">{nombreB}</p>
        <Ruleta bind:this={r2} items={itemsB} alto={60} onresultado={res2} />
        {#if campeonB && !girando}{@render revela(campeonB, nombreB, true)}{/if}
      </div>
    </div>
  {/if}
</div>

{#snippet ficha(nombre, avatar)}
  <div class="ficha">
    <span class="ficha__av">
      {#if avatar}<img src={avatar} alt="" />{:else}{inicial(nombre)}{/if}
    </span>
    <span class="ficha__nom">{nombre}</span>
  </div>
{/snippet}

{#snippet revela(campeon, eyebrow, compacta = false)}
  <div class="revela" class:revela--compacta={compacta}>
    <p class="revela__eyebrow">{eyebrow}</p>
    {#if campeon.img}
      <figure class="revela__retrato"><img src={campeon.img} alt={campeon.nombre} /></figure>
    {/if}
    <h3 class="revela__nom texto-oro">{campeon.nombre}</h3>
  </div>
{/snippet}

<style>
  .duelo {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.9rem;
    width: 100%;
  }

  /* ── VS (fichas de invocadores) ──────────────────── */
  .vs-cab {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    gap: clamp(0.5rem, 3vw, 1.4rem);
    width: 100%;
  }
  .vs-cab__x {
    font-family: var(--fuente-display);
    font-weight: 900;
    font-size: clamp(1rem, 3vw, 1.4rem);
    color: var(--sangre);
    letter-spacing: 0.08em;
  }
  .ficha {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-width: 0;
  }
  .vs-cab .ficha:last-of-type {
    flex-direction: row-reverse;
    text-align: right;
  }
  .ficha__av {
    flex: none;
    width: 2.2rem;
    height: 2.2rem;
    display: grid;
    place-items: center;
    overflow: hidden;
    border-radius: 50%;
    border: 1px solid var(--borde-oro);
    background: radial-gradient(120% 120% at 50% 0%, rgba(200, 170, 110, 0.25), rgba(7, 11, 18, 0.6));
    color: var(--oro-claro);
    font-family: var(--fuente-display);
    font-weight: 800;
    font-size: 1rem;
  }
  .ficha__av img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  .ficha__nom {
    font-family: var(--fuente-display);
    font-weight: 700;
    font-size: clamp(0.95rem, 2.4vw, 1.3rem);
    color: var(--oro-claro);
    overflow-wrap: anywhere;
  }

  .duelo__meta {
    margin: 0;
    text-align: center;
    font-size: 0.72rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--humo);
  }
  .duelo__restock {
    color: var(--sangre);
  }
  .duelo__tope {
    margin: 0;
    text-align: center;
    font-size: 0.7rem;
    color: var(--humo);
    max-width: 30rem;
  }

  .duelo__acc {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    align-items: center;
    gap: 0.5rem;
  }
  .mini {
    background: transparent;
    border: 1px solid var(--borde-oro);
    border-radius: 2px;
    color: var(--humo);
    font-size: 0.72rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    padding: 0.5rem 0.85rem;
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
  .girar {
    font-family: var(--fuente-display);
    font-weight: 800;
    font-size: clamp(0.85rem, 2vw, 1.05rem);
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #0a0f18;
    background: var(--oro-degradado-fuerte);
    border: 1px solid #e4d3a8;
    border-radius: 2px;
    padding: 0.7rem 1.8rem;
    cursor: pointer;
    box-shadow: var(--sombra-boton);
    transition: transform 0.15s, box-shadow 0.25s, filter 0.2s;
  }
  .girar:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: var(--sombra-boton-hover);
  }
  .girar:disabled {
    cursor: progress;
    filter: grayscale(0.5) brightness(0.8);
  }

  /* ── Arena ───────────────────────────────────────── */
  .arena {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    align-items: center;
    width: 100%;
  }
  .arena--dual {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    align-items: start;
  }
  @media (max-width: 520px) {
    .arena--dual {
      grid-template-columns: 1fr;
    }
  }
  .lado {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    align-items: center;
  }
  .lado__nom {
    margin: 0;
    font-family: var(--fuente-display);
    font-weight: 700;
    font-size: 0.82rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--arcano);
    overflow-wrap: anywhere;
    text-align: center;
  }

  /* ── Revelación ──────────────────────────────────── */
  .revela {
    width: 100%;
    text-align: center;
    padding: clamp(0.8rem, 3vw, 1.4rem);
    border: 1px solid var(--borde-oro);
    border-radius: 4px;
    background: radial-gradient(120% 90% at 50% 0%, rgba(10, 200, 185, 0.08), transparent 60%),
      linear-gradient(180deg, rgba(18, 37, 60, 0.7), rgba(7, 11, 18, 0.88));
    animation: surgir 0.5s cubic-bezier(0.2, 0.9, 0.2, 1) both;
  }
  @keyframes surgir {
    from {
      opacity: 0;
      transform: translateY(14px) scale(0.99);
    }
    to {
      opacity: 1;
      transform: none;
    }
  }
  .revela__eyebrow {
    margin: 0 0 0.6rem;
    font-size: 10px;
    letter-spacing: 0.34em;
    text-transform: uppercase;
    color: var(--arcano);
  }
  .revela__retrato {
    margin: 0 auto 0.7rem;
    width: clamp(84px, 20vw, 130px);
    aspect-ratio: 1;
    border: 1px solid var(--borde-oro-fuerte);
    border-radius: 50%;
    overflow: hidden;
    box-shadow: 0 0 44px -14px var(--oro), inset 0 0 30px -10px #000;
  }
  .revela--compacta .revela__retrato {
    width: clamp(72px, 24vw, 104px);
  }
  .revela__retrato img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  .revela__nom {
    margin: 0;
    font-family: var(--fuente-display);
    font-weight: 900;
    font-size: clamp(1.4rem, 5vw, 2.6rem);
    line-height: 1;
    text-transform: uppercase;
    overflow-wrap: anywhere;
  }
  .revela--compacta .revela__nom {
    font-size: clamp(1.1rem, 4vw, 1.7rem);
  }

  @media (prefers-reduced-motion: reduce) {
    .revela {
      animation: none;
    }
  }
</style>
