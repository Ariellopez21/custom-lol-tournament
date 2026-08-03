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

## Fase 0 — Fundaciones
El andamiaje mínimo para que todo lo demás se apoye.

- [ ] **0.1** Inicializar el proyecto **Svelte + Vite** (esqueleto, scripts `dev`/`build`).
- [ ] **0.2** Extraer el **design system** de `ruleta-espejo.html` a `ui/tokens.css` (colores, tipografías, sombras) reutilizable.
- [ ] **0.3** Crear `core/champions.js` con los 173 campeones (id = championId DDragon) y su ruta de imagen.
- [ ] **0.4** **Añadir la imagen faltante de Anivia** (`champs/Anivia.jpg`).
- [ ] **0.5** Normalizar el *casing* de los nombres de archivo en `champs/` para que funcionen en GitHub Pages (Linux distingue mayúsculas: `Aatrox.jpg ≠ aatrox.jpg`).
- [ ] **0.6** `core/store.js`: wrapper de localStorage con esquema versionado (para migraciones futuras).
- [ ] **0.7** `core/export.js`: exportar/importar todo el estado a un `.json` (respaldo y compartir).
- [ ] **0.8** App shell + navegación básica (Combate · Participantes · Torneos · Temporadas).

## Fase 1 — ⭐ Sistema de Combate (EL FOCO)
La joya. Un duelo 1v1 ARAM configurable, resuelto con ruletas teatrales.

**1.a — Motor de ruleta reutilizable**
- [ ] **1.1** Portar la ruleta de `ruleta-espejo.html` a un componente `Ruleta.svelte` que gire sobre **cualquier** lista (campeones, hechizos, runas, opciones sí/no).
- [ ] **1.2** Modo *single* (mirror: un solo ganador) y modo *dual* (no-mirror: un campeón por jugador en paralelo).
- [ ] **1.3** Conectar los retratos de `champs/` a la revelación (ya está el hueco `#retrato` en el prototipo).

**1.b — Configuración de reglas**
- [ ] **1.4** Panel de reglas del duelo:
  - [ ] Formato: **Bo1 / Bo3 / Bo5**
  - [ ] **Mirror match** sí/no
  - [ ] Origen de campeones: **Libre (173)** / **Champion Pool**, con **/ sin restock**
  - [ ] Hechizos: **mismos / distintos** (/ libres)
  - [ ] Runas: **mismas / distintas** (/ libres)
  - [ ] Reglas fijas visibles y editables: **ARAM · 1v1 · 100 creeps | 1 kill | 1 tower**
- [ ] **1.5** Guardar reglas como **presets** reutilizables (localStorage).

**1.c — Flujo de combate**
- [ ] **1.6** Pantalla **VS** con nombres y retratos de ambos invocadores.
- [ ] **1.7** Secuencia de ruletas según las reglas: campeón(es) → hechizos → runas (tensión creciente).
- [ ] **1.8** **Marcador Bo3/Bo5**: registrar ganador de cada game; detectar cierre de serie.
- [ ] **1.9** Lógica de **restock**: sin restock ⇒ quitar del pool los campeones ya jugados entre games.
- [ ] **1.10** Pantalla de **victoria del duelo** + guardar el duelo en el historial.

**1.d — Lo "épico" (creativo, factible)**
- [ ] **1.11** **Modo Caos**: la propia ruleta decide las reglas (¿mirror? ¿restock? ¿hechizos distintos?) antes de sortear campeones.
- [ ] **1.12** **Sonido** opcional (giro + fanfarria de revelación), con toggle de silencio.
- [ ] **1.13** **Atajo de teclado** (Espacio = girar) para dirigir el duelo en vivo.
- [ ] **1.14** **Modo Overlay/OBS**: fondo transparente para transmitir la ruleta en stream.
- [ ] **1.15** **Tarjeta de resultado** exportable como imagen para compartir el duelo.
- [x] *(ya hecho en el prototipo)* Respeto a `prefers-reduced-motion` y azar criptográfico uniforme.

## Fase 2 — Participantes & Champion Pools
- [ ] **2.1** CRUD de participantes (crear, editar, borrar, avatar opcional).
- [ ] **2.2** Editor de **Champion Pool** por participante (elegir entre los 173, buscar/filtrar).
- [ ] **2.3** Enlazar un duelo a dos participantes y cargar sus pools automáticamente.

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

Arrancar **0.1** (esqueleto Svelte + Vite), o —si prefieres ver movimiento rápido— empezar por **0.3 + 0.4 + 0.5** (datos de campeones + Anivia + casing), que dejan la base de imágenes lista para la ruleta.

Tú decides el siguiente prompt; yo lo resuelvo y lo tachamos aquí.
