# `core/` — La "memoria" del proyecto

Esta carpeta es el **cerebro de datos** de la app: no dibuja nada en pantalla, solo
sabe *qué* campeones existen y *cómo* se guarda y comparte todo. La interfaz (Svelte)
se limita a consumir lo que hay aquí.

Tres archivos:

| Archivo | En una frase |
|---|---|
| `champions.js` | El catálogo de los 173 campeones (id, nombre e imagen). |
| `store.js` | Guarda y lee **todo el estado** de la app en el navegador. |
| `export.js` | Respalda o restaura ese estado en un archivo `.json`. |

---

## Parte 1 · Conceptos (el "por qué")

**Data Dragon.** Es el CDN oficial de datos de Riot para LoL. Tomamos su `championId`
(p. ej. `AurelionSol`, `MonkeyKing`) como identificador estable de cada campeón.

**RETRATO.** Es la foto/cara de un campeón, el archivo `champs/<id>.jpg`. En
`champions.js`, la constante `RETRATOS` es el mapa que Vite arma con esas imágenes
para entregarnos la URL final de cada una.

**¿Por qué no `public/`?** Porque dejamos `champs/` en la raíz (como el ROADMAP) y
`import.meta.glob` ya empaqueta las imágenes desde ahí; no hace falta moverlas.

**"Agnóstico del framework".** `core/` es JavaScript puro, **sin nada de Svelte**.
Así la lógica de datos se puede probar y reutilizar sola, sin depender de la interfaz;
si algún día cambiáramos Svelte por otra cosa, esta carpeta seguiría igual.

**MIGRACIONES.** Recetas para actualizar datos ya guardados cuando cambiamos la
forma del estado. Evitan que alguien pierda sus torneos al actualizarse la app.

### El porqué de `export.js` (en detalle)

La app es **local-first**: no hay servidor ni cuentas, todo vive en tu navegador. Eso
tiene un problema: ¿cómo respaldas tus torneos o los compartes con un amigo? La
respuesta es un **archivo `.json`**, y de eso se encarga `export.js`. Sus funciones,
por su nombre:

- **`serializar`** — "serializar" = convertir un objeto en memoria a **texto**. Toma el
  estado y lo vuelve una cadena JSON (con metadatos: qué formato es y cuándo se creó).
- **`deserializar`** — lo contrario: de **texto** JSON de vuelta a objeto, comprobando
  que de verdad sea un respaldo nuestro (si no, avisa con un error claro).
- **`exportarArchivo`** — serializa y **descarga** el resultado como archivo.
- **`importar`** — lee un archivo (o texto), lo deserializa, lo **migra** al esquema
  actual y lo **guarda**. Así hasta un respaldo antiguo queda al día al abrirlo.
- **`nombreSugerido`** — solo propone el nombre del archivo (`clt-respaldo-AAAA-MM-DD.json`).

---

## Parte 2 · Uso (el "cómo")

### `champions.js`

Importa `CHAMPIONS` para listar o mostrar campeones, y `getChampion(id)` para buscar uno.

```js
import { CHAMPIONS, getChampion } from './core/champions.js'
CHAMPIONS.length              // 173
getChampion('MonkeyKing')     // { id: 'MonkeyKing', nombre: 'Wukong', img: '...' }
```

### `store.js`

El estado completo es **un solo objeto** (participantes, reglas, duelos, torneos,
temporadas, ajustes). El ciclo de trabajo es siempre el mismo:

1. **`cargar()`** al abrir la app → te devuelve el estado guardado (o uno vacío).
2. Modificas ese objeto en memoria como quieras.
3. **`guardar(estado)`** para persistir los cambios.

```js
import { cargar, guardar } from './core/store.js'

const estado = cargar()
estado.participantes.push({ id: 'p1', nombre: 'Ari' })
guardar(estado)
```

Además tienes: **`reiniciar()`** (borra todo y empieza limpio) y **`alCambiar(cb)`**
(te avisa si el estado cambió en otra pestaña, para mantenerlas sincronizadas).
No necesitas tocar `migrar()` en el día a día: se aplica sola dentro de `cargar()`.

### `export.js`

Ya explicado arriba; en la práctica son dos gestos:

```js
import { exportarArchivo, importar } from './core/export.js'
import { cargar } from './core/store.js'

exportarArchivo(cargar())     // botón "Exportar": descarga el respaldo
await importar(archivo)       // input de archivo "Importar": restaura y guarda
```

---

> ¿Vas a aportar? Si cambias la **forma** del estado (nuevos campos en `store.js`),
> sube `SCHEMA_VERSION` y añade su migración; así nadie pierde sus datos. `champions.js`
> se **genera** a partir de `champs/` y `champs.txt`: no lo edites a mano.
