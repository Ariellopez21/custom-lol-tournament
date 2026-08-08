<script>
  // Fase 4.2 — Historial de combates: el registro de "cómo ocurrieron" los duelos
  // terminados. Cada fila muestra fecha, invocadores, marcador, ganador (o empate)
  // y la tira de campeones jugados por cada lado (de `duelo.games`, persistido en
  // 1.10). Los duelos anteriores a 1.10 simplemente no muestran campeones.
  import { estado } from '../core/estado.svelte.js'
  import { getChampion } from '../core/champions.js'

  let { duelos = [], titulo = 'Historial de combates' } = $props()

  let desplegado = $state(false)

  const partDe = (/** @type {string} */ id) => estado.participantes.find((p) => p.id === id)
  const nombreDe = (/** @type {string} */ id) => partDe(id)?.nombre ?? '—'
  const inicialDe = (/** @type {string} */ id) => (partDe(id)?.nombre?.trim()[0] ?? '?').toUpperCase()

  // Más recientes primero.
  const ordenados = $derived(
    [...duelos].sort((x, y) => (y.jugadoEn ?? '').localeCompare(x.jugadoEn ?? ''))
  )

  const fecha = (/** @type {string} */ iso) => {
    if (!iso) return ''
    try {
      return new Date(iso).toLocaleDateString(undefined, {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return ''
    }
  }

  const champsDe = (/** @type {any} */ duelo, /** @type {'a'|'b'} */ lado) =>
    (duelo.games ?? []).map((g) => g?.campeones?.[lado]).filter(Boolean)
</script>

<div class="hist">
  <button class="hist__cab" type="button" onclick={() => (desplegado = !desplegado)} aria-expanded={desplegado}>
    <span class="hist__tit">📜 {titulo}</span>
    <span class="hist__meta">{duelos.length} {duelos.length === 1 ? 'combate' : 'combates'}</span>
    <span class="hist__flecha" class:hist__flecha--on={desplegado} aria-hidden="true">▾</span>
  </button>

  {#if desplegado}
    {#if ordenados.length === 0}
      <p class="hist__vacio">Aún no hay combates registrados.</p>
    {:else}
      <ul class="hist__lista">
        {#each ordenados as d (d.id)}
          {@const a = d.participantes[0]}
          {@const b = d.participantes[1]}
          {@const chA = champsDe(d, 'a')}
          {@const chB = champsDe(d, 'b')}
          <li class="duelo">
            <span class="duelo__fecha">{fecha(d.jugadoEn)}</span>
            <div class="duelo__cuerpo">
              <div class="lado lado--a" class:lado--gana={d.ganador === a} class:lado--pierde={d.ganador && d.ganador !== a}>
                <span class="lado__id">
                  <span class="miniav">{#if partDe(a)?.avatar}<img src={partDe(a).avatar} alt="" />{:else}{inicialDe(a)}{/if}</span>
                  <span class="lado__nom">{nombreDe(a)}</span>
                </span>
                {#if chA.length}
                  <span class="tira">
                    {#each chA as id, i (id + '·' + i)}
                      {@const c = getChampion(id)}
                      <span class="cuadro" title={c?.nombre ?? id}>
                        {#if c?.img}<img src={c.img} alt={c.nombre} />{:else}<span class="cuadro__ini">?</span>{/if}
                      </span>
                    {/each}
                  </span>
                {/if}
              </div>

              <div class="duelo__marca">
                <span class="duelo__score">{d.marcador?.a ?? 0}</span>
                <span class="duelo__sep">:</span>
                <span class="duelo__score">{d.marcador?.b ?? 0}</span>
              </div>

              <div class="lado lado--b" class:lado--gana={d.ganador === b} class:lado--pierde={d.ganador && d.ganador !== b}>
                <span class="lado__id">
                  <span class="miniav">{#if partDe(b)?.avatar}<img src={partDe(b).avatar} alt="" />{:else}{inicialDe(b)}{/if}</span>
                  <span class="lado__nom">{nombreDe(b)}</span>
                </span>
                {#if chB.length}
                  <span class="tira">
                    {#each chB as id, i (id + '·' + i)}
                      {@const c = getChampion(id)}
                      <span class="cuadro" title={c?.nombre ?? id}>
                        {#if c?.img}<img src={c.img} alt={c.nombre} />{:else}<span class="cuadro__ini">?</span>{/if}
                      </span>
                    {/each}
                  </span>
                {/if}
              </div>
            </div>
            <span class="duelo__res" class:duelo__res--empate={!d.ganador}>
              {d.ganador ? `🏆 ${nombreDe(d.ganador)}` : '🤝 Empate'}
            </span>
          </li>
        {/each}
      </ul>
    {/if}
  {/if}
</div>

<style>
  .hist {
    width: 100%;
    border: 1px solid var(--borde-oro-tenue);
    border-radius: 4px;
    background: linear-gradient(180deg, rgba(18, 37, 60, 0.3), rgba(7, 11, 18, 0.3));
    overflow: hidden;
  }
  .hist__cab {
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
  .hist__tit {
    font-family: var(--fuente-display);
    font-weight: 700;
    letter-spacing: 0.06em;
    font-size: 0.95rem;
  }
  .hist__meta {
    font-size: 0.72rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--humo);
  }
  .hist__flecha {
    margin-left: auto;
    color: var(--humo);
    transition: transform 0.18s;
  }
  .hist__flecha--on {
    transform: rotate(180deg);
  }
  .hist__vacio {
    margin: 0;
    padding: 1rem;
    text-align: center;
    color: var(--humo);
    font-size: 0.85rem;
  }
  .hist__lista {
    list-style: none;
    margin: 0;
    padding: 0.4rem;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    max-height: 26rem;
    overflow-y: auto;
  }

  .duelo {
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 0.5rem 0.8rem;
    padding: 0.5rem 0.7rem;
    border: 1px solid var(--borde-oro-tenue);
    border-radius: 3px;
    background: rgba(7, 11, 18, 0.35);
  }
  .duelo__fecha {
    grid-row: 1 / 3;
    font-size: 0.66rem;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--humo);
    white-space: nowrap;
  }
  .duelo__cuerpo {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    gap: 0.6rem;
    min-width: 0;
  }
  .lado {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    min-width: 0;
  }
  .lado--a {
    align-items: flex-end;
    text-align: right;
  }
  .lado--b {
    align-items: flex-start;
  }
  .lado__id {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    min-width: 0;
  }
  .lado--a .lado__id {
    flex-direction: row-reverse;
  }
  .miniav {
    flex: none;
    display: inline-grid;
    place-items: center;
    width: 1.4rem;
    height: 1.4rem;
    overflow: hidden;
    border-radius: 50%;
    border: 1px solid var(--borde-oro-tenue);
    background: radial-gradient(120% 120% at 50% 0%, rgba(200, 170, 110, 0.25), rgba(7, 11, 18, 0.6));
    font-family: var(--fuente-display);
    font-weight: 800;
    font-size: 0.66rem;
    color: var(--oro);
  }
  .miniav img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  .lado__nom {
    font-weight: 600;
    color: var(--oro-claro);
    font-size: 0.9rem;
    overflow-wrap: anywhere;
  }
  .lado--gana .lado__nom {
    color: var(--oro);
  }
  .lado--pierde {
    opacity: 0.6;
  }
  .tira {
    display: flex;
    flex-wrap: wrap;
    gap: 0.2rem;
  }
  .lado--a .tira {
    justify-content: flex-end;
  }
  .cuadro {
    width: 1.5rem;
    height: 1.5rem;
    border-radius: 3px;
    overflow: hidden;
    border: 1px solid var(--borde-oro-tenue);
    flex: none;
    display: block;
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
    color: var(--humo);
    font-size: 0.7rem;
  }
  .duelo__marca {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    font-family: var(--fuente-display);
    font-weight: 900;
  }
  .duelo__score {
    color: var(--oro-claro);
    font-size: 1.05rem;
  }
  .duelo__sep {
    color: var(--sangre);
  }
  .duelo__res {
    grid-row: 1 / 3;
    justify-self: end;
    font-size: 0.72rem;
    letter-spacing: 0.03em;
    color: var(--oro);
    white-space: nowrap;
  }
  .duelo__res--empate {
    color: var(--arcano);
  }

  @media (max-width: 560px) {
    .duelo {
      grid-template-columns: 1fr auto;
    }
    .duelo__fecha {
      grid-row: auto;
      grid-column: 1 / 3;
    }
    .duelo__res {
      grid-row: auto;
      grid-column: 1 / 3;
      justify-self: start;
    }
  }
</style>
