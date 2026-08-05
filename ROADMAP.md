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

Reglas (preset de combate) {
  id, nombre,
  formato: "Bo1" | "Bo3" | "Bo5",
  mirror: bool,                 // mismo campeón para ambos
  origen: "libre" | "pool",     // 173 campeones o el pool del jugador
  restock: bool,                // ¿se puede repetir campeón entre games?
  hechizos: "mismos" | "distintos" | "libres",
  runas: "mismas" | "distintas" | "libres",
  mapa: "ARAM", modo: "1v1",
  victoria: { creeps: 100, kills: 1, torres: 1 }   // editable
}

Duelo {
  id, participantes: [idA, idB], reglas,
  games: [ { n, campeones: {A,B}, hechizos:{A,B}, runas:{A,B}, ganador } ],
  ganador, estado: "config"|"en_curso"|"terminado", creadoEn,
  torneoId?                     // si nació dentro de un torneo
}

Torneo {
  id, nombre,
  sistema: "brackets" | "grupos" | "suizo" | "tabla",
  participantes: [ids], estructura: {...},   // bracket/grupos/rondas
  duelos: [idsDeDuelo], clasificacion: [...],
  estado, temporadaId?
}

Temporada { id, nombre, torneos: [ids], inicio, fin? }
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
- **Única ruleta = campeones.** Hechizos y runas **no se sortean**.
- **Hechizos y runas = solo una etiqueta** en la ficha del duelo: `Predefinido` o `Libre elección`. **No** hay selector de hechizos ni editor de páginas de runas (fuera de alcance por ahora).
- **`champion pool` (sí/no) decide de dónde sortea la ruleta:**
  1. `pool = false` → sortea entre los **173** (en modo single o dual).
  2. `pool = true` + **single (mirror)** → sortea **el mismo** campeón desde el champion pool para ambos. *(Pendiente por decidir en Fase 1: ¿de qué pool sale? probablemente la **intersección** de los pools de ambos invocadores.)*
  3. `pool = true` + **dual (no-mirror)** → sortea un campeón **distinto** para cada invocador, **desde el pool propio de cada uno**.
- **single (mirror) vs dual (no-mirror):** el componente `Ruleta` entrega **1** resultado (mirror, ambos juegan el mismo) o **2** (uno por invocador).
- **El duelo NO es un flujo por games.** La ruleta dicta el duelo; el marcador solo registra el resultado final. No hay wizard game-a-game (perder tiempo con eso no aporta).
- **Marcador = cuadro de 2 filas:**
  - Fila 1: los dos invocadores + su marcador **editable a mano** (ej. `Inv1 (3) — (1) Inv2`).
  - Fila 2: tira de **iconos ~20px** de los campeones ya jugados (por ahora el retrato mini del campeón; a futuro, arte propio).
- **Restock = regla del panel (no un flujo).** Si `restock = off`, la ruleta **excluye** los campeones ya jugados (los de la fila 2). En **Bo3/Bo5** eso implica ir **eliminándolos game a game**, aplique champion pool o no.
- **Persistencia:** al terminar, el duelo se guarda en el **historial de la DB del torneo** (`torneoId`). Sin torneo (uso suelto), a un historial local genérico.
- **Eliminados:** ~~Modo Caos~~ y ~~atajo de teclado (Espacio = girar)~~.

### 1.a — Motor de ruleta reutilizable
- [ ] **1.1** Portar el tambor de `ruleta-espejo.html` a un componente `Ruleta.svelte` que gira sobre una **lista** y aterriza en el ganador. **Solo campeones** (list-driven por dentro para soportar el modo dual).
- [ ] **1.2** Modo **single** (mirror: 1 resultado, ambos lo juegan) y modo **dual** (no-mirror: 2 resultados, uno por invocador).
- [ ] **1.3** Conectar los retratos de `champs/` a la revelación (ya está el hueco `#retrato` en el prototipo).

### 1.b — Configuración de reglas
- [ ] **1.4** Panel de reglas del duelo (en torneo, se **heredan** del torneo — Fase 3):
  - [ ] Formato: **Bo1 / Bo3 / Bo5**
  - [ ] **Mirror match** sí/no
  - [ ] **Champion pool** sí/no (sí ⇒ la ruleta sortea desde los pools; ver decisiones)
  - [ ] **Restock** sí/no (off ⇒ la ruleta elimina los campeones ya jugados)
  - [ ] Hechizos: **Predefinido / Libre elección** *(solo etiqueta)*
  - [ ] Runas: **Predefinido / Libre elección** *(solo etiqueta)*
  - [ ] Reglas fijas visibles: **ARAM · 1v1 · 100 creeps | 1 kill | 1 tower**
- [ ] **1.5** Guardar reglas como **presets** reutilizables (localStorage).

### 1.c — Flujo de combate
- [ ] **1.6** Pantalla **VS** con nombres y retratos de ambos invocadores (necesita invocadores).
- [ ] **1.7** Giro de la ruleta según las reglas (**solo campeón**; sin hechizos/runas). Requiere ambos invocadores.
- [ ] **1.8** **Marcador de 2 filas**: fila 1 = invocadores + marcador editable a mano; fila 2 = tira de campeones jugados.
- [ ] **1.9** **Restock**: si off, excluir de la ruleta los campeones ya jugados; en Bo3/Bo5, eliminándolos game a game.
- [ ] **1.10** Guardar el duelo terminado en el **historial de la DB del torneo** (`torneoId`).

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
Cada partido del torneo lanza el sistema de combate de la Fase 1.

- [ ] **3.1** Asistente de creación de torneo (elegir participantes + sistema).
- [ ] **3.2** **Brackets clásico** (eliminación simple; luego doble eliminación).
- [ ] **3.3** **Fase de grupos** (sorteo de grupos + round-robin interno).
- [ ] **3.4** **Sistema suizo** (emparejamiento por puntaje, sin repetir rivales).
- [ ] **3.5** **Campeonato por tabla de puntuación** (todos contra todos + tabla).
- [ ] **3.6** Visualización: bracket interactivo, tablas de posiciones, avance de rondas.
- [ ] **3.7** Integración: al abrir un partido del torneo se dispara el Duelo y el resultado vuelve al torneo.

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

**Fase 0 ✅ · Fase 2 ✅** (2.3 descartado, se hará con la ruleta en la Fase 1). Siguiente en el orden de ejecución:

- **Fase 3 — Torneos.** Primer punto **3.1**: asistente de creación de torneo (elegir participantes + sistema).

Tú decides el siguiente prompt; yo lo resuelvo y lo tachamos aquí.
