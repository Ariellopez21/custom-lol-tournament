# 🏆 Custom LoL Tournament — Hoja de Ruta

> App web **open-source** y **local-first** para armar torneos personalizados de League of Legends: participantes, champion pools, varios sistemas de torneo y —el corazón del proyecto— un **sistema de combate épico** con ruletas que sortean campeones, hechizos, runas y hasta las propias reglas.

Trabajamos **prompt por prompt**: tú pides el siguiente punto, lo resolvemos, lo tachamos (`- [x]`) y seguimos. Este archivo es la fuente de verdad del avance.

---

## 🎯 Visión

- **Local-first**: todo se guarda en el navegador (localStorage) + **exportar/importar JSON** para respaldar y compartir temporadas entre amigos. Sin backend, sin cuentas.
- **Open-source**: cualquiera clona, corre y contribuye. Se publica gratis en **GitHub Pages**.
- **El foco es el sistema de combate.** Participantes, pools y sistemas de torneo son, en esencia, "guardar listas de opciones" y vienen después. El combate es la experiencia estrella: teatral, con ruletas, sonido y pantallas de revelación.

---

## 🛠️ Decisiones técnicas

| Tema | Decisión |
|---|---|
| **Framework** | **Svelte + Vite** ✅ *(decidido)*. Transiciones/animaciones nativas ideales para la ruleta; `stores` que calzan con la "memoria" local. La ruleta vanilla actual se porta casi tal cual. |
| **Lenguaje** | JavaScript para empezar. *(TypeScript opcional más adelante: el modelo de datos de torneos se beneficiaría.)* |
| **Persistencia** | `localStorage` con esquema versionado + export/import a archivo `.json`. |
| **Estilos** | Se conserva el **design system** que ya existe en `ruleta-espejo.html` (tokens de color, tipografías Cinzel + Barlow) como CSS global compartido. |
| **Datos de campeones** | El `id` canónico = **championId de Data Dragon** (p. ej. `Aatrox`, `MonkeyKing`, `Nunu`, `Renata`, `AurelionSol`), que ya coincide con los nombres de archivo en `champs/`. |
| **Hosting** | GitHub Pages (build estático de Vite). |
| **i18n** | Español primero; estructura preparada para añadir inglés. |

---

## 📁 Estructura de repo propuesta

```
custom-lol-tournament/
├─ index.html
├─ src/
│  ├─ core/            # datos + almacenamiento (la "memoria")
│  │  ├─ champions.js  # los 173 campeones (id, nombre, ruta de imagen)
│  │  ├─ store.js      # wrapper de localStorage + versionado
│  │  ├─ export.js     # backup / restore JSON
│  │  └─ rng.js        # azar criptográfico (ya existe en la ruleta)
│  ├─ combate/         # ⭐ EL FOCO
│  │  ├─ Ruleta.svelte # motor de ruleta reutilizable
│  │  ├─ Duelo.svelte  # flujo de combate completo
│  │  ├─ Marcador.svelte
│  │  └─ reglas.js     # presets de reglas (ARAM 1v1, etc.)
│  ├─ participantes/
│  ├─ torneo/          # brackets, grupos, suizo, tabla
│  ├─ temporadas/
│  └─ ui/              # componentes compartidos (botón, layout, tokens.css)
├─ champs/             # 172 retratos .jpg (falta Anivia)
├─ champs.txt          # listado de referencia (173)
├─ ruleta-espejo.html  # prototipo original (se conserva de referencia)
└─ ROADMAP.md          # este archivo
```

---

## 🗄️ Modelo de datos (la "memoria")

Entidades que persistiremos. Definirlas bien ahora evita rehacer torneos después.

```js
Champion   { id: "Aatrox", nombre: "Aatrox", img: "champs/Aatrox.jpg" }

Participante {
  id, nombre, avatar?,
  championPool: ["Aatrox", "Ahri", ...],   // ids; vacío = todos los 173
  creadoEn
}

ReglasCombate (el "ruleset"; se define al crear el torneo y se HEREDA por la ruleta) {
  id?, nombre?,                          // si es un preset guardado (Fase 1.5)
  resolucion: "ruleta" | "manual",       // 3.7 — ¿ruleta teatral o solo registrar resultado?
  formato: "Bo1" | "Bo3" | "Bo5",
  mirror: bool,                          // mismo campeón para ambos
  championPool: bool,                    // la ruleta sortea desde los pools de cada uno
  restock: bool,                         // ¿repetir campeón entre games?
  hechizos: "predefinido" | "libre",     // solo etiqueta
  runas: "predefinido" | "libre",        // solo etiqueta
  mapa: "ARAM", modo: "1v1",
  victoria: { creeps: 100, kills: 1, torres: 1 }   // editable
}

Duelo (el combate atómico = unidad de la Fase 1; colección aparte para las stats) {
  id, torneoId, etapaId,
  participantes: [aId, bId],
  reglas: ReglasCombate,                 // heredadas del torneo
  marcador: { a, b },                    // MANUAL (ej. Bo5 → 3-1)  · 1.8
  games: [ { n, campeones: {a, b} } ],   // solo si resolucion="ruleta" (fila 2 de jugados)
  ganador: participanteId | null,        // null + estado "terminado" = EMPATE
  estado: "pendiente" | "en_curso" | "terminado",
  jugadoEn?
}

Torneo (contenedor; puede tener VARIAS etapas bajo un mismo id) {
  id, nombre,
  estado: "borrador" | "en_curso" | "finalizado",
  reglas: ReglasCombate,
  participantes: [participanteId],
  puntos: { victoria: 3, empate: 1, derrota: 0 },   // empates permitidos, configurable
  etapas: [Etapa],                       // 3.3 — grupos → eliminatoria, etc.
  campeon: participanteId | null,        // 3.6, al finalizar
  creadoEn, actualizadoEn, temporadaId?
}

Etapa (una fase con su propio sistema) {
  id, nombre, tipo: "tabla" | "grupos" | "bracket" | "suizo",
  estado: "en_curso" | "finalizada",
  participantes: [participanteId],       // top-N a mano de la etapa anterior, o todos
  duelos: [dueloId],                     // todos los combates jugados en la etapa
  grupos?:  [ { id, nombre, participantes:[id], duelos:[dueloId] } ],   // tipo "grupos"
  bracket?: { rondas: [ { n, nombre, llaves:[Llave] } ] }               // tipo "bracket"
}

Llave (un cruce del bracket) {
  id, a: participanteId|null, b: participanteId|null,   // null = por definir/bye
  dueloId: dueloId|null, ganador: participanteId|null, avanzaA: llaveId|null
}

Temporada { id, nombre, torneos: [ids], inicio, fin? }

// DERIVADO (no se guarda): clasificar(etapa) → filas con pts/rachas/H2H/movimiento;
//   head2head(a,b), cambiosDeLiderato(etapa), rachaDe(id)…
```

---

# 🗺️ Fases

Leyenda: `- [ ]` pendiente · `- [x]` hecho · ⭐ = foco principal

## 🧭 Orden de ejecución (actualizado 2026-08-05)

Aunque las fases están numeradas **por tema**, las construimos en este orden para poder **guardar datos desde ya** y para que el combate **herede** las reglas del torneo (más rápido y sencillo):

> **Fase 0 ✅ → Fase 2 (Participantes) → Fase 3 (Torneos) → Fase 1 (⭐ Combate) → Fase 4 (Temporadas) → Fase 5 (Pulido)**

Los números de fase **se conservan** (Fase 1 sigue siendo el Combate) para no romper el vocabulario que ya venimos usando. La Fase 1 arranca cuando existan invocadores (Fase 2) y torneos (Fase 3), porque la ruleta siempre ocurre entre 2 invocadores y hereda reglas del torneo.

## Fase 0 — Fundaciones
El andamiaje mínimo para que todo lo demás se apoye.

- [x] **0.1** Inicializar el proyecto **Svelte + Vite** (esqueleto, scripts `dev`/`build`).
- [x] **0.2** Extraer el **design system** de `ruleta-espejo.html` a `ui/tokens.css` (colores, tipografías, sombras) reutilizable.
- [x] **0.3** Crear `core/champions.js` con los 173 campeones (id = championId DDragon) y su ruta de imagen.
- [x] **0.4** **Añadir la imagen faltante de Anivia** (`champs/Anivia.jpg`).
- [x] **0.5** Normalizar el *casing* de los nombres de archivo en `champs/` para que funcionen en GitHub Pages (Linux distingue mayúsculas: `Aatrox.jpg ≠ aatrox.jpg`).
- [x] **0.6** `core/store.js`: wrapper de localStorage con esquema versionado (para migraciones futuras).
- [x] **0.7** `core/export.js`: exportar/importar todo el estado a un `.json` (respaldo y compartir).
- [x] **0.8** App shell + navegación básica (Combate · Participantes · Torneos · Temporadas).

## Fase 1 — ⭐ Sistema de Combate (EL FOCO)
La joya. Un duelo 1v1 ARAM configurable, resuelto con una ruleta teatral.

> ⏱️ **Se construye tercero** (después de Fases 2 y 3, ver Orden de ejecución). Aquí abajo quedan **congeladas** todas las decisiones tomadas el **2026-08-05** para no perderlas; se pueden **editar, añadir o quitar** más adelante si cambiamos de parecer.

### 📌 Decisiones de diseño (congeladas 2026-08-05)

- **La ruleta siempre ocurre entre 2 invocadores.** Los **dos nombres son obligatorios** para girar. En Fase 1 los invocadores vienen de Participantes reales (Fase 2) y/o del partido del torneo (Fase 3) — por eso 2 y 3 van antes.
- **La ruleta ES el motor de combate del torneo (no una función suelta).** *(Aclarado 2026-08-06.)* Cada duelo del torneo se resuelve por una de **dos caras de la misma moneda**, según la regla `resolucion` heredada al crear el torneo:
  1. `resolucion = "ruleta"` → al elegir combate se abre el **VS** y la **ruleta sortea el/los campeones** según las reglas (mirror/pool); esos campeones se **heredan** al duelo.
  2. `resolucion = "manual"` → se pasa a la pantalla **ENFRENTAMIENTO** y solo se **marca el ganador** (sin sortear campeón).
  Una **ruleta suelta sin invocadores/torneo** es un **extra futuro** (pantalla aparte con otras funcionalidades); por ahora **no** se diseña para ese caso. El `CombateVista` actual (pestaña "La Ruleta") queda como **banco de pruebas de desarrollo** hasta que, más adelante, se convierta en esa pantalla suelta.
- **Única ruleta = campeones.** Hechizos y runas **no se sortean**.
- **Hechizos y runas = solo una etiqueta** en la ficha del duelo: `Predefinido` o `Libre elección`. **No** hay selector de hechizos ni editor de páginas de runas (fuera de alcance por ahora).
- **`champion pool` (sí/no) decide de dónde sortea la ruleta:**
  1. `pool = false` → sortea entre los **173** (en modo single o dual).
  2. `pool = true` + **single (mirror)** → sortea **el mismo** campeón desde la **unión** de los pools de ambos invocadores. *(Decidido 2026-08-06: **unión**, no intersección. Ej.: Inv1 = {A,B}, Inv2 = {C,D} ⇒ pool mirror = {A,B,C,D}.)* Por la convención **pool vacío = los 173**, si algún invocador no restringe su pool, la unión da los **173**.
  3. `pool = true` + **dual (no-mirror)** → sortea un campeón **distinto** para cada invocador, **desde el pool propio de cada uno** (vacío = los 173).
- **Mapeo de vocabulario (fijado 2026-08-06):** `mirror = ON ⇒ single` (1 resultado, ambos juegan el mismo) · `mirror = OFF ⇒ dual` (2 resultados, uno por invocador). El panel usa la etiqueta "Mirror match"; el motor de ruleta habla de single/dual.
- **single (mirror) vs dual (no-mirror):** el componente `Ruleta` entrega **1** resultado (mirror, ambos juegan el mismo) o **2** (uno por invocador).
- **El duelo NO es un flujo por games.** La ruleta dicta el duelo; el marcador solo registra el resultado final. No hay wizard game-a-game (perder tiempo con eso no aporta).
- **Marcador = cuadro de 2 filas:**
  - Fila 1: los dos invocadores (avatar + nombre) + su marcador **editable a mano** (ej. `Inv1 (3) — (1) Inv2`).
  - Fila 2: tira de **cuadrados del tamaño del avatar** con los campeones ya jugados (por ahora el retrato del campeón; a futuro, arte propio). *(Refinado 2026-08-07: aparece en **ambas** caras — en RULETA la anota la ruleta con «✓ Anotar»; en ENFRENTAMIENTO se marca a mano con `+`. Clic en un cuadrado = quitarlo.)*
- **Restock = regla del panel (no un flujo).** Si `restock = off`, la ruleta **excluye** los campeones ya jugados (los de la fila 2). En **Bo3/Bo5** eso implica ir **eliminándolos game a game**, aplique champion pool o no. *(2026-08-07: si el pool se agota al excluir, la ruleta no se vacía —permite repetir— para no bloquear pools pequeños.)*
- **Persistencia:** al terminar, el duelo se guarda en el **historial de la DB del torneo** (`torneoId`). Sin torneo (uso suelto), a un historial local genérico.
- **Eliminados:** ~~Modo Caos~~ y ~~atajo de teclado (Espacio = girar)~~.

### 1.a — Motor de ruleta reutilizable
- [x] **1.1** Portar el tambor de `ruleta-espejo.html` a un componente `Ruleta.svelte` que gira sobre una **lista** y aterriza en el ganador. **Solo campeones** (list-driven por dentro para soportar el modo dual). *(Hecho: `src/combate/Ruleta.svelte`, reutilizable — props `items`/`duracionMs`/`alto`/`onresultado`; API imperativa `girar(ganadorId?)`/`estaGirando()` vía `bind:this`; azar cripto uniforme; cinta de 58 ranuras + ganador centrado; retratos mini en cada ranura; respeta `prefers-reduced-motion`. Banco de pruebas en `CombateVista.svelte` con revelación del elegido.)*
- [x] **1.2** Modo **single** (mirror: 1 resultado, ambos lo juegan) y modo **dual** (no-mirror: 2 resultados, uno por invocador). *(Hecho: como la `Ruleta` entrega 1 ganador, en **dual** se montan **dos** instancias —una por invocador— con giro simultáneo; `CombateVista` trae un selector segmentado single/dual, botón que gira 1 o 2 tambores y contador `pendientes` para saber cuándo aterrizaron ambos. Ajuste en `Ruleta.svelte`: el aro pasa a `min(520px, 100%)` para caber en columnas sin desbordar.)*
- [x] **1.3** Conectar los retratos de `champs/` a la revelación (ya está el hueco `#retrato` en el prototipo). *(Hecho: revelación con retrato en **ambos** modos y **por lado** en dual, vía un `{#snippet revelacion}` reutilizable con variante compacta; los retratos ya salían en cada ranura del tambor desde 1.1.)*

### 1.b — Configuración de reglas

> 📌 **Plan acordado 2026-08-06.** El panel que pedía 1.4 **ya lo entregó 3.1** dentro del asistente de torneo (`TorneoVista.svelte`: resolución, formato, mirror, champion pool, restock, hechizos/runas y la línea fija ARAM·1v1) y el modelo `ReglasCombate` + `reglasPorDefecto()` ya viven en el store, con persistencia y el array `reglas[]` reservado para presets. Por eso 1.b se **reenfoca**:
> - **1.4 = refactor + reúso**, no construir de cero: extraer ese `<fieldset class="reglas">` a un **componente compartido `PanelReglas.svelte`** y usarlo en (a) el asistente de torneo y (b) el **combate suelto** (que hoy sortea siempre sobre los 173, sin reglas). Una sola fuente de verdad.
> - `victoria {creeps,kills,torres}` se queda **fija** (texto ARAM·1v1·100/1/1), **no editable**, por ahora.
> - **1.5 = presets**: 1-2 de **fábrica** (p.ej. "ARAM 1v1 clásico") + **guardar / renombrar / borrar** los propios, elegibles al crear torneo y en combate suelto. Se apoyan en el array `reglas[]` ya reservado en el estado.

- [x] **1.4** Extraer **`PanelReglas.svelte`** (fuente única) y reusarlo en torneo (reglas **heredadas**) y en combate suelto (editables en vivo). *(Hecho: `src/combate/PanelReglas.svelte` con props `bind:reglas`/`bind:puntos`, `leyenda`, `mostrarResolucion`, `mostrarPuntos` y `deshabilitado` —un `<fieldset disabled>` que bloquea todo el panel mientras gira—. `TorneoVista` migrado sin regresión; `CombateVista` lo usa y ahora el **Mirror del panel** deriva el modo single/dual, sustituyendo al selector segmentado hardcodeado. Champion pool/Restock quedan cableados pero su filtrado real llega en 1.7/1.9.)* El panel expone:
  - [x] Formato: **Bo1 / Bo3 / Bo5**
  - [x] **Mirror match** sí/no *(ON = single, OFF = dual)*
  - [x] **Champion pool** sí/no (sí ⇒ la ruleta sortea desde los pools; **unión** en mirror, ver decisiones)
  - [x] **Restock** sí/no (off ⇒ la ruleta elimina los campeones ya jugados)
  - [x] Hechizos: **Predefinido / Libre elección** *(solo etiqueta)*
  - [x] Runas: **Predefinido / Libre elección** *(solo etiqueta)*
  - [x] Reglas fijas visibles: **ARAM · 1v1 · 100 creeps | 1 kill | 1 tower**
- [ ] **1.5** Guardar reglas como **presets** reutilizables (localStorage): 1-2 de fábrica + gestión (guardar/renombrar/borrar) de los propios, usables en torneo y combate suelto.

### 1.c — Flujo de combate (dentro del torneo)

> 📌 **Re-plan acordado 2026-08-06.** 1.c **no** se construye en el banco suelto para después enchufarlo: se construye **directo como el puente Fase 1 ↔ Fase 3**, porque las vistas del torneo (Tabla/Grupos/Bracket) ya traen medio flujo montado (VS rudimentario + persistencia vía `registrarResultado`/`resolverLlave`). Por eso **3.7 se funde aquí dentro** (mismo trabajo). La cara **manual (ENFRENTAMIENTO)** ya existe hoy como el marcador `+/–`; lo que se construye de cero es la cara **ruleta** y el **gate por `reglas.resolucion`**. La ruleta se extrae a un **componente compartido `DueloRuleta.svelte`** que reusan las tres vistas (evita triplicar).

- [x] **1.6** Pantalla **VS** con nombres y **retratos** de ambos invocadores, dentro del flujo del torneo. *(Hecho: `src/combate/DueloRuleta.svelte` — cabecera VS con ficha (avatar/inicial + nombre) de ambos invocadores. La cara ruleta se presenta en un **modal/overlay unificado `src/combate/ModalCombate.svelte`** (la "Pantalla VS" teatral) en las tres vistas del torneo — decidido 2026-08-06 para que no se sienta apretada (sobre todo en grupos) y dar espacio a la futura tira de "campeones jugados" en Bo3/Bo5. La cara manual/ENFRENTAMIENTO sigue inline.)*
- [x] **1.7** Giro de la ruleta **según las reglas** (**solo campeón**; sin hechizos/runas) devolviendo el/los campeón(es) al duelo. *(Hecho en `DueloRuleta.svelte`: resuelve el pool según reglas —`championPool=false` ⇒ 173; **mirror** ⇒ 1 ruleta sobre la **unión** de pools; **dual** ⇒ 2 ruletas, cada una sobre el pool propio (vacío = 173)—, reusa `Ruleta.svelte`, revela el/los campeón(es) y los emite por `onsorteo`. Gateado por `reglas.resolucion === 'ruleta'` en Tabla/Grupos/Bracket. **= arranca 3.7.**)* Restock (excluir jugados) llega en 1.9.
- [x] **1.8** **Marcador de 2 filas** *(hecho)*: componente compartido `src/combate/Marcador.svelte` (fuente única en Tabla/Grupos/Bracket **y** en ambas caras). Fila 1 = ficha de cada invocador (avatar + nombre) + marcador editable `–/+`; Fila 2 = tira de **campeones jugados** en **cuadrados del mismo tamaño que el avatar** (clic = quitar). *(Ampliado 2026-08-07: la fila 2 ya no es "solo cara ruleta" — en **ENFRENTAMIENTO** se marca a mano con `+` → `src/combate/SelectorCampeon.svelte`, para apreciar/descartar lo jugado; en **RULETA** la anexa `DueloRuleta` tras cada giro con el botón «✓ Anotar».)* En Bracket el combate —manual o ruleta— pasó a jugarse en el `ModalCombate` (las llaves eran diminutas para el cuadro de 2 filas).
- [x] **1.9** **Restock** *(hecho)*: en `DueloRuleta`, si `reglas.restock === false` la ruleta **excluye** los campeones ya jugados (los de la fila 2); en Bo3/Bo5 se van eliminando **game a game** (unión de ambos en mirror; pool propio de cada uno en dual). Si al excluir se agota el pool, no se vacía la ruleta (permite repetir) para no bloquear pools pequeños. Tope de giros = `2·máx − 1` games.
- [ ] **1.10** Guardar en el duelo del torneo los campeones sorteados (`games[]`) — cae casi solo: la persistencia del duelo (`torneoId`/`etapaId`) ya existe desde Fase 3. *(Diferido a la Fase 4 por decisión 2026-08-07: hoy la fila 2 = `jugadosA/B` es estado transitorio por combate; se persistirá a `games[]` junto con el registro/historial de la Fase 4.)*

### 1.d — Lo "épico" (creativo, factible)
- [ ] **1.11** **Sonido** opcional (giro + fanfarria de revelación), con toggle de silencio.
- [ ] **1.12** **Modo Overlay/OBS**: fondo transparente para transmitir la ruleta en stream.
- [ ] **1.13** **Tarjeta de resultado** exportable como imagen para compartir el duelo.
- [x] *(ya hecho en el prototipo)* Respeto a `prefers-reduced-motion` y azar criptográfico uniforme.

## Fase 2 — Participantes & Champion Pools ✅
- [x] **2.1** CRUD de participantes (crear, editar, borrar). *(Avatar: por ahora inicial automática; la subida de imagen queda para más adelante.)*
- [x] **2.2** Editor de **Champion Pool** por participante (elegir entre los 173, buscar/filtrar). *(Modal `EditorPool.svelte`; convención pool vacío = todos.)*
- [x] ~~**2.3** Enlazar un duelo a dos participantes y cargar sus pools automáticamente.~~ *(descartado 2026-08-05: en realidad pertenece a la ruleta; el enlace duelo ↔ participantes se hará en la **Fase 1**. En modo dual, el pool de cada invocador sale de su propio champion pool — ver decisiones de Fase 1.)*

## Fase 3 — Sistemas de Torneo
Cada partido del torneo se resuelve con la ruleta (Fase 1) o registrando el resultado a mano.

> 📌 **Decisiones congeladas (2026-08-05).** Modelo de datos arriba (🗄️). **Orden de construcción dentro de la fase:** `3.1 → 3.5 → 3.6 → 3.2 → 3.3 → (3.4 futuro) → 3.7`.

### Decisiones de diseño
- **Un torneo = varias `etapas`** bajo un mismo id (grupos → eliminatoria, etc.). Avanzar entre etapas es **manual** (sin auto-clasificación: los cuadres no siempre calzan —6 grupos, repechajes para subir a 18 o bajar a 8— y se resuelven a mano).
- **Clasificación derivada:** la tabla NO se guarda; se **calcula** de los duelos terminados (puntos, rachas, head-to-head, cambios de liderato…). El humano solo marca ganadores.
- **Resolución por combate (regla del torneo):** `ruleta` (teatral, Fase 1) o `manual` (pestaña **ENFRENTAMIENTO**: solo se marca el resultado). Las reglas de ruleta (mirror/pool/restock) solo se piden si `resolucion="ruleta"`.
- **Puntos:** empates permitidos (en grupos suele haber ida/vuelta). Por defecto **victoria = 3, empate = 1, derrota = 0** (configurable). Un `Duelo` terminado con `ganador=null` = empate.
- **Emparejamiento del "ELEGIR COMBATE":** azar inteligente (prioriza menos partidos jugados + menos enfrentados, evita revancha inmediata).

### Sub-puntos
- [x] **3.1** **Asistente de creación**: nombre + participantes inscritos + sistema de la 1ª etapa + **reglas del torneo** (ruleset, con puntos y empates). *(Hecho: `TorneoVista.svelte` con el asistente + listado; store `crearTorneo`/`borrarTorneo`. La 1ª etapa nace vacía; el sorteo de grupos/llaves y la tabla los llenan 3.2/3.3/3.5.)*
- [x] **3.5** ⭐ **Campeonato por tabla de puntuación** *(hecho)*: botón **ELEGIR COMBATE** (azar inteligente) → VS con marcador de games → resultado → la tabla se recalcula y **reordena animada** (`animate:flip`). Datos de show: 🔥 en racha, ✨ invicto, 😈 némesis (H2H), 👑 cambios de liderato, ▲▼ movimiento, medidor "en llamas", **toast festivo** por resultado. Desempates: puntos → H2H → diferencia de games → menos PJ. "Elegir a mano", deshacer último, finalizar/reabrir. *(Confeti + sonido quedan para el pulido / 1.11.)* Piezas: `core/clasificacion.js` (todo derivado), `TorneoDetalle.svelte`, router con `#/torneos/<id>`.
- [x] **3.6** **Visualización interactiva** *(hecho)*: la vista ya es 100% reactiva (todo `$derived` del estado, desde 3.5). Añadido: **panel "Elegir campeón"** al finalizar (selector con el líder por defecto, se puede coronar a otro — útil en empates o decisión a mano; el store ya aceptaba `campeonId` libre) y **podio de cierre** (top-3 derivado de la tabla, gradas 2-1-3, 👑 sobre el campeón coronado). Piezas tocadas: `TorneoDetalle.svelte`.
- [x] **3.2** **Brackets clásico** *(hecho)*: eliminación simple, sin doble eliminación; tamaños potencia de 2 (4/8/16/32/64, sin byes, ya validado en el asistente 3.1). **Siembra** en dos modos: **sorteo** (barajado cripto-uniforme, re-sorteable) o **manual** (un `<select>` por hueco, sin repetidos). Genera el cuadro completo; cada **llave** se resuelve con un marcador (sin empates) y el ganador **avanza solo** a la ronda siguiente; deshacer por llave (bloqueado si la siguiente ya se jugó); "volver a sembrar" mientras no haya combates. Al decidirse la final → **"Finalizar y coronar"**. Piezas: `core/bracket.js` (puro: `construirBracket`/`barajar`/`localizarLlave`/`campeonBracket`…), store `sembrarBracket`/`resolverLlave`/`deshacerLlave`/`limpiarBracket`, `torneo/BracketVista.svelte`, dispatch en `TorneoDetalle.svelte` por `etapa.tipo`.
- [x] **3.3** **Fase de grupos** *(hecho)*: multi-etapa real. Siembra de grupos (nº de grupos + **sorteo** o **manual** por invocador; cada grupo ≥2); cada grupo con su **mini-tabla derivada** (reusa `clasificar`) y sus combates (ELEGIR COMBATE azar inteligente o a mano; **empates permitidos**; deshacer por grupo). **"Finalizar fase de grupos"** cierra la etapa (sin coronar) y el shell ofrece **"Abrir siguiente etapa"** eligiendo tipo + quiénes pasan a mano (repechajes; bracket exige potencia de 2). Refactor a shell multi-etapa: `TorneoDetalle.svelte` = cabecera + **pestañas de etapas** + dispatch; vistas extraídas `TablaVista.svelte` / `GruposVista.svelte` / `BracketVista.svelte` (todas reciben `{torneo, etapa}`). Store: `sembrarGrupos`/`limpiarGrupos`/`finalizarEtapa`/`reabrirEtapa`/`agregarEtapa`/`borrarEtapa`, `registrarResultado` y `borrarDuelo` ahora conscientes del grupo. Banner de campeón único en el shell.
- [ ] **3.4** **Sistema suizo** — *(futuro; por ahora solo texto, no se implementa)*.
- [~] **3.7** **Integración ruleta ↔ torneo** — **fundido en 1.6–1.10** (mismo trabajo, ver 1.c). El gate por `reglas.resolucion` (ruleta vs ENFRENTAMIENTO) y el retorno del resultado al torneo se construyen ahí. Arrancado en 1.6/1.7 (cara ruleta ya montada en Tabla/Grupos/Bracket); se cierra al terminar 1.8–1.10.

## Fase 4 — Temporadas & Registro
- [ ] **4.1** Modelo de **Temporada**: agrupar torneos.
- [ ] **4.2** Archivo/historial de torneos y duelos terminados (registro de "cómo ocurrieron").
- [ ] **4.3** **Estadísticas**: winrate por jugador, campeones más jugados, head-to-head.
- [ ] **4.4** Exportar/compartir resultados de una temporada (`.json` + tarjeta resumen).

## Fase 5 — Pulido & Comunidad (open-source)
- [ ] **5.1** `README` con capturas + guía de uso, `LICENSE` (MIT sugerida), `CONTRIBUTING`.
- [ ] **5.2** Deploy automático a **GitHub Pages** (GitHub Actions).
- [ ] **5.3** Accesibilidad (teclado, ARIA, contraste) e i18n español/inglés.
- [ ] **5.4** PWA / offline (instalable, funciona sin internet).
- [ ] **5.5** Temas visuales alternativos.

---

## 🔜 Próximo paso sugerido

**Fase 0 ✅ · Fase 2 ✅ · 3.1 ✅ · 3.5 ✅ · 3.6 ✅ · 3.2 ✅ · 3.3 ✅.** Fase 3 casi cerrada (queda **3.4 suizo** = futuro, y **3.7** que se funde en 1.6–1.10). Según el orden de ejecución global (Fase 3 → **Fase 1**):

- **Fase 1 ⭐ — Sistema de Combate.** 1.1 ✅ (motor `Ruleta.svelte`), 1.2 ✅ (single/dual), 1.3 ✅ (retratos en la revelación), 1.4 ✅ (`PanelReglas.svelte`; Mirror → single/dual), **1.6 ✅ · 1.7 ✅** (puente Fase 1↔3: `DueloRuleta.svelte` = VS con retratos + ruleta según reglas), **1.8 ✅** (marcador de 2 filas `Marcador.svelte` + `SelectorCampeon.svelte`; fila 2 = campeones jugados en ambas caras), **1.9 ✅** (restock: la ruleta excluye los jugados). Con esto **3.7 queda cerrado** salvo la persistencia. Sigue: **1.10** guardar `games[]` *(diferido a la Fase 4)*, y **1.5** presets de reglas *(pendiente aparte)*. La "Fase 1.d" (épico) es opcional. ← *siguiente sugerido: **Fase 4** (con 1.10 dentro) o **1.5** presets*

Tú decides el siguiente prompt; yo lo resuelvo y lo tachamos aquí.
