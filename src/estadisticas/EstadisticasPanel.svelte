<script>
  // Fase 4.3 — Panel de estadísticas reutilizable (desplegable, estilo
  // HistorialDuelos). Recibe una lista de duelos terminados (de un torneo o de
  // una temporada) y muestra la clasificación resumida (winrate, rachas, invicto,
  // campeón top) y los "destacados" jugosos. Todo se CALCULA con el motor puro
  // core/estadisticas.js — este componente sólo pinta.
  import { untrack } from 'svelte'
  import { estado } from '../core/estado.svelte.js'
  import { getChampion } from '../core/champions.js'
  import { resumenEstadisticas, campeonesRanking } from '../core/estadisticas.js'

  let { duelos = [], titulo = 'Estadísticas', abierto = false } = $props()

  let desplegado = $state(untrack(() => abierto))

  const r = $derived(resumenEstadisticas(duelos))
  const topCampeones = $derived(campeonesRanking(r.uso.global, 8))
  const d = $derived(r.destacados)

  const partDe = (/** @type {string} */ id) => estado.participantes.find((p) => p.id === id)
  const nombreDe = (/** @type {string} */ id) => partDe(id)?.nombre ?? '—'
  const champ = (/** @type {string} */ id) => getChampion(id)
  const pct = (/** @type {number} */ x) => `${Math.round(x * 100)}%`
  const inicial = (/** @type {string} */ n) => (n?.trim()[0] ?? '?').toUpperCase()
</script>

<div class="est">
  <button class="est__cab" type="button" onclick={() => (desplegado = !desplegado)} aria-expanded={desplegado}>
    <span class="est__tit">📊 {titulo}</span>
    <span class="est__meta">
      {r.totales.duelos} {r.totales.duelos === 1 ? 'combate' : 'combates'} · {r.totales.jugadores} jugadores
    </span>
    <span class="est__flecha" class:est__flecha--on={desplegado} aria-hidden="true">▾</span>
  </button>

  {#if desplegado}
    {#if r.totales.duelos === 0}
      <p class="est__vacio">Aún no hay combates para analizar.</p>
    {:else}
      <div class="est__cuerpo">
        <!-- ── Destacados ─────────────────────────────── -->
        <div class="destacados">
          {#if d.mejorRacha}
            <div class="dcard">
              <span class="dcard__ico">🔥</span>
              <span class="dcard__lbl">Mejor racha</span>
              <span class="dcard__val">{nombreDe(d.mejorRacha.id)}</span>
              <span class="dcard__sub">{d.mejorRacha.n} victorias seguidas</span>
            </div>
          {/if}
          {#if d.invictos.length > 0}
            <div class="dcard">
              <span class="dcard__ico">🛡️</span>
              <span class="dcard__lbl">Invicto{d.invictos.length > 1 ? 's' : ''}</span>
              <span class="dcard__val">{nombreDe(d.invictos[0].participanteId)}{#if d.invictos.length > 1} +{d.invictos.length - 1}{/if}</span>
              <span class="dcard__sub">{d.invictos[0].pg}-0 · sin perder</span>
            </div>
          {/if}
          {#if d.masVictorias}
            <div class="dcard">
              <span class="dcard__ico">🏆</span>
              <span class="dcard__lbl">Más victorias</span>
              <span class="dcard__val">{nombreDe(d.masVictorias.id)}</span>
              <span class="dcard__sub">{d.masVictorias.n} ganadas</span>
            </div>
          {/if}
          {#if d.masDerrotas}
            <div class="dcard">
              <span class="dcard__ico">💀</span>
              <span class="dcard__lbl">Más derrotas</span>
              <span class="dcard__val">{nombreDe(d.masDerrotas.id)}</span>
              <span class="dcard__sub">{d.masDerrotas.n} perdidas</span>
            </div>
          {/if}
          {#if d.mejorWinrate}
            <div class="dcard">
              <span class="dcard__ico">📈</span>
              <span class="dcard__lbl">Mejor winrate</span>
              <span class="dcard__val">{nombreDe(d.mejorWinrate.id)}</span>
              <span class="dcard__sub">{pct(d.mejorWinrate.winrate)} · {d.mejorWinrate.pj} PJ</span>
            </div>
          {/if}
          {#if d.oneTrick}
            {@const c = champ(d.oneTrick.campeon)}
            <div class="dcard">
              <span class="dcard__ico">🎯</span>
              <span class="dcard__lbl">One-trick</span>
              <span class="dcard__val dcard__val--conimg">
                {#if c?.img}<img class="dcard__img" src={c.img} alt={c.nombre} />{/if}
                {nombreDe(d.oneTrick.jugador)}
              </span>
              <span class="dcard__sub">{c?.nombre ?? d.oneTrick.campeon} · {d.oneTrick.n} veces</span>
            </div>
          {/if}
          {#if d.nemesis}
            <div class="dcard">
              <span class="dcard__ico">😈</span>
              <span class="dcard__lbl">Némesis</span>
              <span class="dcard__val">{nombreDe(d.nemesis.verdugo)}</span>
              <span class="dcard__sub">le ganó {d.nemesis.n}× a {nombreDe(d.nemesis.victima)}</span>
            </div>
          {/if}
          {#if d.campeonMasJugado}
            {@const c = champ(d.campeonMasJugado.id)}
            <div class="dcard">
              <span class="dcard__ico">⭐</span>
              <span class="dcard__lbl">Campeón estrella</span>
              <span class="dcard__val dcard__val--conimg">
                {#if c?.img}<img class="dcard__img" src={c.img} alt={c.nombre} />{/if}
                {c?.nombre ?? d.campeonMasJugado.id}
              </span>
              <span class="dcard__sub">jugado {d.campeonMasJugado.n} veces</span>
            </div>
          {/if}
        </div>

        <!-- ── Clasificación resumida ─────────────────── -->
        <div class="tabla-wrap">
          <table class="tabla">
            <thead>
              <tr>
                <th class="c">#</th>
                <th>Jugador</th>
                <th class="c">PJ</th>
                <th class="c">V</th>
                <th class="c">E</th>
                <th class="c">D</th>
                <th class="c">WR</th>
                <th class="c" title="Mejor racha de victorias">🔥</th>
                <th>Campeón top</th>
              </tr>
            </thead>
            <tbody>
              {#each r.filas as f, i (f.participanteId)}
                {@const c = f.campeonTop ? champ(f.campeonTop.id) : null}
                {@const pj = partDe(f.participanteId)}
                <tr>
                  <td class="c pos">{i + 1}</td>
                  <td class="nom">
                    <span class="miniav">
                      {#if pj?.avatar}<img src={pj.avatar} alt="" />{:else}{inicial(pj?.nombre ?? '?')}{/if}
                    </span>
                    {nombreDe(f.participanteId)}
                    {#if f.invicto}<span class="badge" title="Invicto">🛡️</span>{/if}
                  </td>
                  <td class="c">{f.pj}</td>
                  <td class="c v">{f.pg}</td>
                  <td class="c">{f.pe}</td>
                  <td class="c p">{f.pp}</td>
                  <td class="c wr">{pct(f.winrate)}</td>
                  <td class="c">{f.mejorRachaV || '—'}</td>
                  <td class="campt">
                    {#if c}
                      {#if c.img}<img class="campt__img" src={c.img} alt={c.nombre} />{/if}
                      <span class="campt__nom">{c.nombre}</span>
                      <span class="campt__n">×{f.campeonTop.n}</span>
                    {:else}
                      <span class="campt__vacio">—</span>
                    {/if}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>

        <!-- ── Campeones más jugados ──────────────────── -->
        {#if topCampeones.length > 0}
          <div class="champs">
            <h4 class="champs__tit">Campeones más jugados</h4>
            <ul class="champs__lista">
              {#each topCampeones as t (t.id)}
                {@const c = champ(t.id)}
                <li class="champ" title={c?.nombre ?? t.id}>
                  <span class="champ__cuadro">
                    {#if c?.img}<img src={c.img} alt={c.nombre} />{:else}<span class="champ__ini">?</span>{/if}
                  </span>
                  <span class="champ__n">×{t.n}</span>
                </li>
              {/each}
            </ul>
          </div>
        {/if}
      </div>
    {/if}
  {/if}
</div>

<style>
  .est {
    width: 100%;
    border: 1px solid var(--borde-oro-tenue);
    border-radius: 4px;
    background: linear-gradient(180deg, rgba(18, 37, 60, 0.3), rgba(7, 11, 18, 0.3));
    overflow: hidden;
  }
  .est__cab {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.75rem 1rem;
    background: transparent;
    border: 0;
    cursor: pointer;
    color: var(--oro-claro);
    text-align: left;
  }
  .est__tit {
    font-family: var(--fuente-display);
    font-weight: 700;
    letter-spacing: 0.06em;
    font-size: 0.95rem;
  }
  .est__meta {
    font-size: 0.72rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--humo);
  }
  .est__flecha {
    margin-left: auto;
    color: var(--humo);
    transition: transform 0.18s;
  }
  .est__flecha--on {
    transform: rotate(180deg);
  }
  .est__vacio {
    margin: 0;
    padding: 1rem;
    text-align: center;
    color: var(--humo);
    font-size: 0.85rem;
  }
  .est__cuerpo {
    padding: 0.4rem 0.9rem 1rem;
    display: flex;
    flex-direction: column;
    gap: 1.2rem;
  }

  /* ── Destacados ─────────────────────────────────── */
  .destacados {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr));
    gap: 0.5rem;
  }
  .dcard {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    padding: 0.6rem 0.7rem;
    border: 1px solid var(--borde-oro-tenue);
    border-radius: 3px;
    background: rgba(7, 11, 18, 0.4);
  }
  .dcard__ico {
    font-size: 1.1rem;
    line-height: 1;
  }
  .dcard__lbl {
    font-size: 0.62rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--humo);
  }
  .dcard__val {
    font-family: var(--fuente-display);
    font-weight: 700;
    color: var(--oro);
    font-size: 1rem;
    overflow-wrap: anywhere;
  }
  .dcard__val--conimg {
    display: flex;
    align-items: center;
    gap: 0.35rem;
  }
  .dcard__img {
    width: 1.4rem;
    height: 1.4rem;
    border-radius: 3px;
    object-fit: cover;
    border: 1px solid var(--borde-oro-tenue);
  }
  .dcard__sub {
    font-size: 0.72rem;
    color: var(--humo);
  }

  /* ── Tabla ──────────────────────────────────────── */
  .tabla-wrap {
    overflow-x: auto;
  }
  .tabla {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.82rem;
  }
  .tabla th {
    font-size: 0.62rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--humo);
    font-weight: 600;
    padding: 0.4rem 0.45rem;
    border-bottom: 1px solid var(--borde-oro-tenue);
    text-align: left;
    white-space: nowrap;
  }
  .tabla td {
    padding: 0.4rem 0.45rem;
    border-bottom: 1px solid rgba(200, 170, 110, 0.08);
    color: var(--oro-claro);
    white-space: nowrap;
  }
  .tabla .c {
    text-align: center;
  }
  .pos {
    font-family: var(--fuente-display);
    font-weight: 800;
    color: var(--humo);
  }
  .nom {
    font-weight: 600;
    color: var(--oro-claro);
  }
  .miniav {
    display: inline-grid;
    place-items: center;
    width: 1.5rem;
    height: 1.5rem;
    vertical-align: middle;
    margin-right: 0.4rem;
    overflow: hidden;
    border-radius: 50%;
    border: 1px solid var(--borde-oro-tenue);
    background: radial-gradient(120% 120% at 50% 0%, rgba(200, 170, 110, 0.25), rgba(7, 11, 18, 0.6));
    font-family: var(--fuente-display);
    font-weight: 800;
    font-size: 0.7rem;
    color: var(--oro);
  }
  .miniav img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  .badge {
    font-size: 0.72rem;
  }
  .v {
    color: var(--arcano);
  }
  .p {
    color: var(--sangre);
  }
  .wr {
    font-weight: 700;
    color: var(--oro);
  }
  .campt {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    min-width: 8rem;
  }
  .campt__img {
    width: 1.4rem;
    height: 1.4rem;
    border-radius: 3px;
    object-fit: cover;
    border: 1px solid var(--borde-oro-tenue);
    flex: none;
  }
  .campt__nom {
    color: var(--oro-claro);
  }
  .campt__n {
    color: var(--humo);
    font-size: 0.72rem;
  }
  .campt__vacio {
    color: var(--humo);
  }

  /* ── Campeones más jugados ──────────────────────── */
  .champs__tit {
    margin: 0 0 0.5rem;
    font-size: 0.68rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--humo);
    font-weight: 600;
  }
  .champs__lista {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  .champ {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.2rem;
  }
  .champ__cuadro {
    width: 2.4rem;
    height: 2.4rem;
    border-radius: 4px;
    overflow: hidden;
    border: 1px solid var(--borde-oro-tenue);
    display: block;
  }
  .champ__cuadro img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  .champ__ini {
    display: grid;
    place-items: center;
    width: 100%;
    height: 100%;
    color: var(--humo);
  }
  .champ__n {
    font-size: 0.68rem;
    color: var(--humo);
  }
</style>
