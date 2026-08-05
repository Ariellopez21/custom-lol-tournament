<script>
  // Fase 3.1 — Asistente de creación de torneo + listado.
  // La estructura interna (sorteo de grupos, llaves, la tabla) la llenan 3.2/3.3/3.5.
  import {
    estado,
    crearTorneo,
    borrarTorneo,
    reglasPorDefecto,
    puntosPorDefecto,
  } from '../core/estado.svelte.js'
  import { ruta, irA } from '../ui/ruta.svelte.js'
  import TorneoDetalle from './TorneoDetalle.svelte'

  const POTENCIAS = [4, 8, 16, 32, 64] // tamaños válidos de bracket (potencias de 2, 4..64)
  const SISTEMAS = [
    { id: 'tabla', etiqueta: 'Liga / Tabla', desc: 'Todos contra todos, puntos y rachas.' },
    { id: 'grupos', etiqueta: 'Fase de grupos', desc: 'Varios grupos; luego puedes abrir una eliminatoria.' },
    { id: 'bracket', etiqueta: 'Bracket', desc: 'Eliminación simple. Requiere 4/8/16/32/64.' },
    { id: 'suizo', etiqueta: 'Suizo', desc: 'Próximamente.', deshabilitado: true },
  ]
  const NOMBRE_TIPO = { tabla: 'Liga', grupos: 'Fase de grupos', bracket: 'Eliminatoria', suizo: 'Suizo' }

  let creando = $state(false)
  let nombre = $state('')
  let seleccion = $state(new Set()) // ids de participantes inscritos
  let sistema = $state('tabla')
  let reglas = $state(reglasPorDefecto())
  let puntos = $state(puntosPorDefecto())
  let confirmandoBorrar = $state(null)

  const participantes = $derived(estado.participantes)
  const torneos = $derived(estado.torneos)
  const abierto = $derived(ruta.param ? torneos.find((t) => t.id === ruta.param) : null)
  const nInscritos = $derived(seleccion.size)
  const bracketValido = $derived(POTENCIAS.includes(nInscritos))
  const puedeCrear = $derived(
    nombre.trim().length > 0 && nInscritos >= 2 && (sistema !== 'bracket' || bracketValido)
  )

  function alternar(id) {
    const s = new Set(seleccion)
    s.has(id) ? s.delete(id) : s.add(id)
    seleccion = s
  }

  function reiniciar() {
    creando = false
    nombre = ''
    seleccion = new Set()
    sistema = 'tabla'
    reglas = reglasPorDefecto()
    puntos = puntosPorDefecto()
  }

  function crear() {
    if (!puedeCrear) return
    const torneo = crearTorneo({
      nombre,
      participantes: [...seleccion],
      sistema,
      reglas: $state.snapshot(reglas),
      puntos: $state.snapshot(puntos),
    })
    reiniciar()
    if (torneo) irA(`torneos/${torneo.id}`) // entrar directo al torneo recién creado
  }

  function borrar(id) {
    borrarTorneo(id)
    confirmandoBorrar = null
  }
</script>

{#if abierto}
  <TorneoDetalle torneo={abierto} />
{:else}
<section class="torneos">
  <header class="cab">
    <p class="cab__marca">Fase 3 · Torneos</p>
    <h1 class="cab__titulo texto-oro">Torneos</h1>
    <p class="cab__desc">
      {#if torneos.length === 0}
        Crea tu primer torneo: elige invocadores, un sistema y las reglas de combate.
      {:else}
        {torneos.length} {torneos.length === 1 ? 'torneo' : 'torneos'} en marcha.
      {/if}
    </p>
  </header>

  <div class="top">
    <button class="boton" type="button" onclick={() => (creando ? reiniciar() : (creando = true))}>
      {creando ? 'Cancelar' : '+ Nuevo torneo'}
    </button>
  </div>

  {#if creando}
    {#if participantes.length < 2}
      <div class="aviso-vacio">
        Necesitas al menos <b>2 invocadores</b> registrados.
        <a href="#/participantes">Ir a Participantes →</a>
      </div>
    {:else}
      <form class="asistente" onsubmit={(e) => { e.preventDefault(); crear() }}>
        <!-- Nombre -->
        <label class="campo">
          <span class="campo__lbl">Nombre del torneo</span>
          <input
            class="entrada"
            type="text"
            bind:value={nombre}
            maxlength="40"
            placeholder="Copa de Verano"
            autocomplete="off"
          />
        </label>

        <!-- Participantes -->
        <div class="campo">
          <span class="campo__lbl">Invocadores inscritos · <b>{nInscritos}</b></span>
          <div class="chips">
            {#each participantes as p (p.id)}
              <button
                type="button"
                class="chip"
                class:chip--on={seleccion.has(p.id)}
                aria-pressed={seleccion.has(p.id)}
                onclick={() => alternar(p.id)}
              >
                {p.nombre}
              </button>
            {/each}
          </div>
        </div>

        <!-- Sistema -->
        <div class="campo">
          <span class="campo__lbl">Sistema de la 1ª etapa</span>
          <div class="sistemas">
            {#each SISTEMAS as s (s.id)}
              <label class="sistema" class:sistema--on={sistema === s.id} class:sistema--off={s.deshabilitado}>
                <input type="radio" name="sistema" value={s.id} bind:group={sistema} disabled={s.deshabilitado} />
                <span class="sistema__nom">{s.etiqueta}</span>
                <span class="sistema__desc">{s.desc}</span>
              </label>
            {/each}
          </div>
          {#if sistema === 'bracket' && !bracketValido}
            <p class="hint hint--mal">
              El bracket necesita 4, 8, 16, 32 o 64 invocadores (llevas {nInscritos}).
            </p>
          {/if}
        </div>

        <!-- Reglas de combate -->
        <fieldset class="reglas">
          <legend>Reglas de combate (se heredan a cada partido)</legend>

          <div class="regla">
            <span class="regla__lbl">Resolución</span>
            <div class="opciones">
              <label><input type="radio" value="manual" bind:group={reglas.resolucion} /> Manual</label>
              <label><input type="radio" value="ruleta" bind:group={reglas.resolucion} /> Ruleta <em>(Fase 1)</em></label>
            </div>
          </div>

          <div class="regla">
            <span class="regla__lbl">Formato</span>
            <div class="opciones">
              {#each ['Bo1', 'Bo3', 'Bo5'] as f}
                <label><input type="radio" value={f} bind:group={reglas.formato} /> {f}</label>
              {/each}
            </div>
          </div>

          {#if reglas.resolucion === 'ruleta'}
            <div class="regla">
              <span class="regla__lbl">Ruleta</span>
              <div class="opciones opciones--check">
                <label><input type="checkbox" bind:checked={reglas.mirror} /> Mirror match</label>
                <label><input type="checkbox" bind:checked={reglas.championPool} /> Usar champion pools</label>
                <label><input type="checkbox" bind:checked={reglas.restock} /> Restock</label>
              </div>
            </div>
            <div class="regla">
              <span class="regla__lbl">Hechizos / Runas</span>
              <div class="opciones">
                <label><input type="radio" value="predefinido" bind:group={reglas.hechizos} /> Hechizos predef.</label>
                <label><input type="radio" value="libre" bind:group={reglas.hechizos} /> Hechizos libres</label>
                <label><input type="radio" value="predefinido" bind:group={reglas.runas} /> Runas predef.</label>
                <label><input type="radio" value="libre" bind:group={reglas.runas} /> Runas libres</label>
              </div>
            </div>
          {/if}

          <div class="regla">
            <span class="regla__lbl">Puntos</span>
            <div class="puntos">
              <label>Victoria <input type="number" min="0" max="10" bind:value={puntos.victoria} /></label>
              <label>Empate <input type="number" min="0" max="10" bind:value={puntos.empate} /></label>
              <label>Derrota <input type="number" min="0" max="10" bind:value={puntos.derrota} /></label>
            </div>
          </div>

          <p class="fijas">ARAM · 1v1 · 100 creeps | 1 kill | 1 tower</p>
        </fieldset>

        <div class="asistente__pie">
          <button class="boton" type="submit" disabled={!puedeCrear}>Crear torneo</button>
        </div>
      </form>
    {/if}
  {/if}

  <!-- Listado -->
  {#if torneos.length > 0}
    <ul class="lista">
      {#each torneos as t (t.id)}
        <li class="tcard">
          <div class="tcard__main">
            <span class="tcard__nom">{t.nombre}</span>
            <span class="tcard__meta">
              {NOMBRE_TIPO[t.etapas[0]?.tipo] ?? '—'} · {t.participantes.length} invocadores ·
              {t.reglas.resolucion === 'ruleta' ? 'Ruleta' : 'Manual'} {t.reglas.formato}
            </span>
          </div>
          <div class="tcard__acc">
            <span class="estado estado--{t.estado}">{t.estado.replace('_', ' ')}</span>
            {#if confirmandoBorrar === t.id}
              <span class="conf">¿Borrar?</span>
              <button class="mini mini--peligro" type="button" onclick={() => borrar(t.id)}>Sí</button>
              <button class="mini" type="button" onclick={() => (confirmandoBorrar = null)}>No</button>
            {:else}
              <button class="mini mini--abrir" type="button" onclick={() => irA(`torneos/${t.id}`)}>Abrir</button>
              <button class="mini mini--peligro" type="button" onclick={() => (confirmandoBorrar = t.id)}>Borrar</button>
            {/if}
          </div>
        </li>
      {/each}
    </ul>
    <p class="nota-futura">Abre un torneo para gestionar su tabla y elegir combates.</p>
  {/if}
</section>
{/if}

<style>
  .torneos {
    width: 100%;
    max-width: 52rem;
    margin: 0 auto;
  }

  /* Cabecera */
  .cab {
    text-align: center;
    margin-bottom: clamp(1.2rem, 3.5vw, 2rem);
  }
  .cab__marca {
    margin: 0 0 0.7rem;
    font-size: 11px;
    letter-spacing: 0.42em;
    text-transform: uppercase;
    color: var(--arcano);
  }
  .cab__titulo {
    margin: 0;
    font-family: var(--fuente-display);
    font-weight: 900;
    font-size: clamp(1.9rem, 5.5vw, 3rem);
    line-height: 1.02;
  }
  .cab__desc {
    margin: 0.9rem 0 0;
    color: var(--humo);
  }

  .top {
    display: flex;
    justify-content: center;
    margin-bottom: 1.4rem;
  }

  /* Aviso sin participantes */
  .aviso-vacio {
    text-align: center;
    padding: 1.5rem;
    border: 1px dashed var(--borde-oro);
    border-radius: 4px;
    color: var(--humo);
    margin-bottom: 1.4rem;
  }
  .aviso-vacio a {
    display: inline-block;
    margin-top: 0.5rem;
    color: var(--arcano);
    text-decoration: none;
  }
  .aviso-vacio a:hover {
    text-decoration: underline;
  }

  /* Asistente */
  .asistente {
    display: flex;
    flex-direction: column;
    gap: 1.3rem;
    padding: clamp(1rem, 3vw, 1.6rem);
    background: linear-gradient(180deg, rgba(18, 37, 60, 0.45), rgba(7, 11, 18, 0.45));
    border: 1px solid var(--borde-oro);
    border-radius: 4px;
    margin-bottom: 1.8rem;
  }
  .campo {
    display: flex;
    flex-direction: column;
    gap: 0.55rem;
  }
  .campo__lbl {
    font-size: 0.72rem;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--humo);
  }
  .campo__lbl b {
    color: var(--oro);
  }
  .entrada {
    background: rgba(7, 11, 18, 0.6);
    border: 1px solid var(--borde-oro);
    border-radius: 2px;
    color: var(--oro-claro);
    font-family: var(--fuente-display);
    font-weight: 600;
    font-size: 1.1rem;
    padding: 0.7rem 0.85rem;
  }
  .entrada:focus {
    outline: none;
    border-color: var(--arcano);
    box-shadow: var(--brillo-arcano);
  }

  /* Chips de participantes */
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
  }
  .chip {
    background: transparent;
    border: 1px solid var(--borde-oro);
    border-radius: 999px;
    color: var(--humo);
    padding: 0.4rem 0.85rem;
    font-size: 0.85rem;
    cursor: pointer;
    transition: color 0.15s, border-color 0.15s, background 0.15s;
  }
  .chip:hover {
    color: var(--oro-claro);
    border-color: var(--borde-oro-fuerte);
  }
  .chip--on {
    color: #0a0f18;
    background: var(--oro);
    border-color: var(--oro);
    font-weight: 600;
  }

  /* Sistemas */
  .sistemas {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr));
    gap: 0.5rem;
  }
  .sistema {
    display: flex;
    flex-direction: column;
    gap: 3px;
    padding: 0.7rem 0.85rem;
    border: 1px solid var(--borde-oro-tenue);
    border-radius: 3px;
    cursor: pointer;
    transition: border-color 0.15s, background 0.15s;
  }
  .sistema:hover {
    border-color: var(--borde-oro);
  }
  .sistema--on {
    border-color: var(--borde-oro-fuerte);
    background: rgba(200, 170, 110, 0.06);
  }
  .sistema--off {
    opacity: 0.45;
    cursor: not-allowed;
  }
  .sistema input {
    display: none;
  }
  .sistema__nom {
    font-family: var(--fuente-display);
    font-weight: 600;
    color: var(--oro-claro);
  }
  .sistema--on .sistema__nom {
    color: var(--oro);
  }
  .sistema__desc {
    font-size: 0.75rem;
    color: var(--humo);
  }
  .hint {
    margin: 0;
    font-size: 0.78rem;
  }
  .hint--mal {
    color: var(--sangre);
  }

  /* Reglas */
  .reglas {
    border: 1px solid var(--borde-oro-tenue);
    border-radius: 3px;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
    margin: 0;
  }
  .reglas legend {
    font-size: 0.72rem;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--arcano);
    padding: 0 0.4rem;
  }
  .regla {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem 1rem;
    align-items: baseline;
  }
  .regla__lbl {
    min-width: 8rem;
    font-size: 0.75rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--humo);
  }
  .opciones {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem 1rem;
  }
  .opciones label,
  .puntos label {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.9rem;
    color: var(--oro-claro);
    cursor: pointer;
  }
  .opciones em {
    color: var(--humo);
    font-size: 0.75rem;
  }
  .puntos {
    display: flex;
    flex-wrap: wrap;
    gap: 0.8rem;
  }
  .puntos input {
    width: 3.4rem;
    background: rgba(7, 11, 18, 0.6);
    border: 1px solid var(--borde-oro);
    border-radius: 2px;
    color: var(--oro-claro);
    padding: 0.3rem 0.4rem;
    font-size: 0.9rem;
  }
  .fijas {
    margin: 0;
    font-size: 0.78rem;
    letter-spacing: 0.1em;
    color: var(--oro);
    opacity: 0.85;
  }

  .asistente__pie {
    display: flex;
    justify-content: flex-end;
  }

  /* Botones */
  .boton {
    font-family: var(--fuente-display);
    font-weight: 800;
    font-size: 0.9rem;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: #0a0f18;
    background: var(--oro-degradado);
    border: 1px solid #e4d3a8;
    border-radius: 2px;
    padding: 0.7rem 1.6rem;
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
  .mini {
    background: transparent;
    border: 1px solid var(--borde-oro);
    border-radius: 2px;
    color: var(--humo);
    font-size: 0.72rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    padding: 0.4rem 0.7rem;
    cursor: pointer;
    transition: color 0.15s, border-color 0.15s;
  }
  .mini:hover {
    color: var(--oro-claro);
    border-color: var(--borde-oro-fuerte);
  }
  .mini--peligro:hover {
    color: var(--sangre);
    border-color: rgba(192, 69, 92, 0.6);
  }
  .mini--abrir {
    color: var(--oro);
    border-color: var(--borde-oro);
  }

  /* Listado de torneos */
  .lista {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }
  .tcard {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 0.6rem;
    padding: 0.85rem 1rem;
    background: linear-gradient(180deg, rgba(18, 37, 60, 0.5), rgba(7, 11, 18, 0.5));
    border: 1px solid var(--borde-oro-tenue);
    border-radius: 3px;
  }
  .tcard:hover {
    border-color: var(--borde-oro);
  }
  .tcard__main {
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
  }
  .tcard__nom {
    font-family: var(--fuente-display);
    font-weight: 600;
    font-size: 1.15rem;
    color: var(--oro-claro);
  }
  .tcard__meta {
    font-size: 0.75rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--humo);
  }
  .tcard__acc {
    display: flex;
    align-items: center;
    gap: 0.45rem;
  }
  .estado {
    font-size: 0.68rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    padding: 0.25rem 0.55rem;
    border-radius: 999px;
    border: 1px solid var(--borde-oro-tenue);
    color: var(--humo);
  }
  .estado--en_curso {
    color: var(--arcano);
    border-color: var(--borde-arcano);
  }
  .estado--finalizado {
    color: var(--oro);
    border-color: var(--borde-oro);
  }
  .conf {
    font-size: 0.78rem;
    color: var(--humo);
  }
  .nota-futura {
    margin: 1rem 0 0;
    text-align: center;
    font-size: 0.75rem;
    color: rgba(122, 138, 160, 0.6);
  }

  @media (max-width: 520px) {
    .regla__lbl {
      min-width: 100%;
    }
  }
</style>
