---
name: swim-timing-visual-redesign
description: Rediseño visual completo de la app de cronometraje de natación (swim-timing), adaptado al modelo de siembra global turno × bloque × color (post-restructuración de contextSiembraGlobal.md / CONTEXTOcompleto.md). Aplica un sistema de diseño "deportivo/energético" — paleta azul petróleo + naranja vibrante, tipografía condensada para datos numéricos, indicadores semánticos por color de heat (media_pileta/rojo/amarillo/verde) resueltos siempre por el backend, año como tag informativo del alumno, estados de visitante/no-participa, y animaciones específicas para la pantalla pública. Usar esta skill cuando se trabaje en cualquier componente visual de la app: Home, Series, carga de tiempos, admin, Resultados y Público.
---

# Rediseño visual — Swim Timing App (TITO)

## Contexto y objetivo

App de cronometraje de competencias de natación escolar, usada en dos contextos muy distintos:

1. **Uso operativo (profesores/admin):** carga de tiempos junto a la pileta, con posible exposición a sol directo y salpicaduras de agua sobre la pantalla. Prioridad: legibilidad, contraste, targets táctiles grandes.
2. **Uso público (pantalla de resultados):** vista mostrada a las gradas/público, sin restricciones de "manos mojadas". Prioridad: impacto visual, jerarquía clara, algo de espectáculo.

El rediseño debe convivir con ambos contextos sin contradecirlos: no usar fondos oscuros en áreas de lectura de datos operativos, pero sí mayor intensidad visual y animación en la pantalla pública.

**Restricción dura de accesibilidad:** todo texto o dato crítico (tiempos, nombres, posiciones) mantiene contraste WCAG AA mínimo sobre su fondo, incluso bajo la premisa de "legibilidad al sol". No sacrificar contraste por estética.

## 0. Modelo de agrupamiento — para que el diseño no contradiga la lógica

Esta sección no es negociable a nivel visual: cualquier componente nuevo tiene que poder expresar esto sin inventar una jerarquía paralela.

- **Agrupamiento real de una serie: turno × bloque × color.** El año dejó de ser un criterio de armado de heats — es un **tag informativo por alumno** (`participants.year_number`), no algo que se lea de la serie.
- **Bloques:** `mañana` tiene un único bloque (`unico`, 3°-6° comparten agua). `tarde` tiene dos bloques secuenciales: `3_4` y `5_6`. El bloque se deriva automático del año, nunca se pide como dato manual — no debe haber un selector de "bloque" que el usuario configure a mano, solo tabs/tiles que navegan a bloques ya fijos.
- **4 colores de heat, no 3:** `media_pileta` (el más lento, nada medio largo) → `rojo` → `amarillo` → `verde` (el más rápido). Cualquier componente que muestre "colores de umbral" tiene que contemplar los 4, no 3.
- **El color que se muestra en pantalla es siempre el que resolvió el backend** (`series.color` para una serie ya sembrada vía `seedingService.js`). **El frontend nunca recalcula la asignación de color a partir de `tiempo_basico` + umbrales**, aunque tenga acceso a ambos valores — es la regla dura ya establecida en el proyecto. Una serie `tipo='normal'` (la que recibe a un alumno recién importado, antes de generar preliminares) todavía no tiene color asignado: en ese estado no se muestra borde/badge de color, se usa el estilo neutro por defecto (ver 3.4).
- **Dentro de un heat (serie `preliminar`/`final`) todos los participantes comparten el mismo color** — es un dato de la serie, no de cada alumno individualmente. Esto simplifica la UI: el indicador de color se pinta una vez por pantalla/card de serie, no se recalcula por fila.
- **Las series se identifican por `id` (uuid) en rutas**, no por `series_number` — puede haber una serie `normal` y una `final` compartiendo turno+bloque+número.
- **Rutas de navegación:** `/turno/:turno/bloque/:bloque` y `/turno/:turno/bloque/:bloque/serie/:serieId`.

---

## 1. Sistema de color

### Paleta base (tokens) — sin cambios

| Token | Hex | Uso |
|---|---|---|
| `--color-navy-deep` | `#0B2A3D` | Fondo de headers/navegación, fondo general de pantalla Público |
| `--color-navy-mid` | `#12384D` | Fondo de botones secundarios sobre navy, contenedores dentro de navy |
| `--color-navy-border` | `#1B4256` | Bordes/divisores sutiles sobre fondo navy |
| `--color-steel` | `#7FA8BD` | Texto secundario sobre fondo navy |
| `--color-orange-primary` | `#FF5A1F` | Acento de marca: estado activo, "EN VIVO", CTA principal, selección |
| `--color-orange-soft-bg` | `#FFF0E8` | Fondo de iconos/chips relacionados al acento naranja |
| `--color-orange-soft-bg-strong` | `#FFE4D6` | Fondo de chips destacados (ej. badge de año en 1er puesto) |
| `--color-orange-text` | `#D85A30` | Texto sobre fondos naranja-suave |
| `--surface-white` | `#FFFFFF` | Fondo de cards en zonas operativas y listas |
| `--surface-gray-light` | `#F1F5F7` | Fondo de chips neutros (serie sin color asignado todavía) |
| `--text-primary` | `#1B1B1B` | Texto principal sobre superficies blancas |
| `--text-muted` | `#7A8A94` | Texto secundario sobre superficies blancas (subtítulos, timestamps) |
| `--text-disabled` | `#9AA5AB` | Texto terciario / metadata |

### Paleta semántica — color de heat (4 categorías, resueltas por backend)

**Regla dura:** este color viene siempre de `series.color`. El frontend no tiene lógica de corte (`>=`, `<`) en ningún componente — eso vive exclusivamente en `assignColor()` de `seedingService.js`. Si un componente necesita "saber" el color de un alumno antes de que exista una serie sembrada, la respuesta correcta es no mostrar indicador de color todavía (ver estado "sin sembrar" más abajo), nunca replicar la fórmula de corte en el cliente.

| Token | Hex | Corresponde a |
|---|---|---|
| `--threshold-media-pileta` | `#5C6BC0` (índigo) | `series.color === 'media_pileta'` |
| `--threshold-red` | `#E24B4A` | `series.color === 'rojo'` |
| `--threshold-yellow` | `#EF9F27` | `series.color === 'amarillo'` |
| `--threshold-green` | `#639922` | `series.color === 'verde'` |
| `--threshold-none` | `#C7D0D4` (gris neutro) | Serie `tipo='normal'`, todavía sin sembrar — no hay color asignado |

**Nota sobre `--threshold-media-pileta`:** es un token nuevo, no existía en la versión de 3 colores. Se eligió un índigo en vez de "un rojo más oscuro" a propósito: `media_pileta` no es solo "más lento que rojo", es una modalidad de nado distinta (medio largo vs. 25m completos), y visualmente conviene que no se lea como una simple extensión de la rampa rojo→amarillo→verde. **Confirmar este hex con Santi/la coordinadora antes de darlo por definitivo** — es la única decisión de esta sesión sin validar contra una referencia visual ya usada en la app.

### Paleta de podio (posiciones) — sin cambios

| Posición | Avatar bg | Barra bg |
|---|---|---|
| 1° | `#FFD98A` (oro) | `--color-orange-primary` |
| 2° | `#C7D3D9` (plata) | `--surface-white` |
| 3° | `#E3B98A` (bronce) | `--surface-white` |

El color de posición (oro/plata/bronce) y el color de heat son señales independientes, nunca se mezclan (ver sección 4).

## 2. Tipografía

Sin cambios respecto a la versión anterior en familias y pesos, con un ajuste de jerarquía:

- **Familia UI general:** sans-serif estándar del proyecto. Sin cambios.
- **Familia numérica (tiempos, posiciones):** condensada (`Archivo Narrow`/`Oswald`), peso 700, solo en valores de tiempo y números de posición.
- **El número de año deja de ser el elemento hero de Home** (antes era la card grande del selector de año). Ahora el hero de Home es el **bloque** (ver 3.2); el año pasa a vivir como **badge/tag secundario** sobre la fila del alumno y en el podio — mantiene la tipografía condensada pero a tamaño de badge (ver escala), no de card grande.

### Escala tipográfica (actualizada)

| Uso | Tamaño | Peso | Familia |
|---|---|---|---|
| Título de pantalla (header) | 22–24px | 700 | Sans-serif |
| Subtítulo de header | 13px | 400 | Sans-serif |
| Nombre de nadador (card/fila) | 14px | 500 | Sans-serif |
| Metadata (tiempo base, "visitante", tipo de serie) | 11px | 400–500 | Sans-serif |
| Tiempo en chip (carga de serie) | 26px | 700 | Condensada |
| Tiempo en resultados/podio | 17–20px | 700 | Condensada |
| Número de posición en podio (1°/2°/3°) | 20–24px | 700 | Condensada |
| **Etiqueta de bloque (tile de Home)** | 28px | 700 | Condensada |
| **Badge de año (por alumno, ya no card grande)** | 12px | 700 | Condensada |
| Label bajo el bloque ("MAÑANA", "3° Y 4°") | 11px | 500, letter-spacing 0.5px | Sans-serif |

No usar mayúscula sostenida salvo en "EN VIVO".

## 3. Layout y componentes por pantalla

### 3.1 Header (todas las pantallas) — sin cambios

Fondo `--color-navy-deep`, botón volver 36×36px sobre `--color-navy-mid`, indicador "EN VIVO" en naranja con pulso, título blanco 22-24px, subtítulo `--color-steel` 13px.

### 3.2 Pantalla Home — ahora es turno → bloque, no turno → año

- Header con ícono de disciplina + nombre de competencia + fecha, centrado. Sin cambios.
- Tabs "Mañana/Tarde": sin cambios visuales (activo = fondo naranja, inactivo = borde navy).
- **Contenido debajo de las tabs cambia según turno:**
  - **Mañana:** un solo bloque (`unico`). No tiene sentido mostrar un grid de 1 elemento — se muestra una única card ancha ("hero tile") con label "Ver series — 3° a 6°" que navega directo a `/turno/mañana/bloque/unico`. Sin paso de selección intermedio.
  - **Tarde:** grid de 2 tiles, uno por bloque:
    - Tile "3° y 4°" → `/turno/tarde/bloque/3_4`
    - Tile "5° y 6°" → `/turno/tarde/bloque/5_6`
  - Cada tile de bloque (tarde) o el hero tile (mañana): fondo blanco, `border-radius: 14px`, ícono de bloque (ej. `layer-group` o similar) en tipografía condensada 28px + label de años debajo en gris muted. Ya no es un número de año — es el rango de años del bloque.
- Bottom nav: sin cambios (Series, Resultados, Público, Admin).

### 3.3 Pantalla Series (listado de series por turno+bloque)

- Header: título `{Turno} · {Label de bloque}` (ej. "Tarde · 3° y 4°"), subtítulo "Seleccioná la serie".
- Cards horizontales, una por serie, ordenadas por `series_number` dentro del turno+bloque:
  - **Borde lateral izq. 5px:** color de heat (tabla de la sección 1) si `tipo !== 'normal'`; `--threshold-none` (gris) si es `tipo='normal'` (todavía sin sembrar).
  - **Badge de tipo:** pill chica, solo visible si `tipo !== 'normal'` — texto "Preliminar" o "Final", fondo `--color-navy-mid`, texto blanco, 10px. Nunca compite con el badge de color (van en posiciones distintas de la card, ver sección 4).
  - **Badge de años mezclados:** como el bloque puede mezclar años (especialmente `unico`), mostrar un badge chico con los años presentes en esa serie, ej. "3°-6°" si son contiguos y todos están, o "3°/5°" si es un subconjunto. Fondo `--surface-gray-light`, texto `--text-muted`, 10px.
  - Resto de la card (contador de participantes, estado pendiente/en progreso/completada, ícono eliminar, chevron): sin cambios respecto al diseño original.
- Botón flotante "+" (agregar serie manual, `tipo='normal'`): circular, naranja, esquina inferior derecha. Sin cambios.
- Navegación al tocar una card usa `serie.id`, no `series_number`.

### 3.4 Pantalla de carga de tiempos (dentro de una serie) — admin/operativo

El indicador de color se resuelve **una sola vez por pantalla** (a nivel de header de la serie), no por fila — dentro de un heat todos comparten color:

```
┌───────────────────────────────────────────────────┐
│  HEADER: Serie N · [badge color] · [badge tipo]    │
├───────────────────────────────────────────────────┤
│ ┃ [ícono cronómetro]  Nombre Apellido  [✈] [3° año]│
│ ┃                                   [ 00.00 ]      │
└───────────────────────────────────────────────────┘
  ↑
  El borde lateral de CADA card de nadador repite el
  mismo color de la serie (consistencia visual, no
  información nueva por fila).
```

**Especificaciones:**
- Card por nadador: fondo blanco, `border-radius: 0 14px 14px 0`, padding `12px 14px 12px 12px`.
- Borde lateral: 5px, color de la serie (tabla sección 1). Si la serie es `tipo='normal'` sin color todavía: `--threshold-none`.
- Ícono de cronómetro: contenedor 34×34px, `border-radius: 8px`, fondo `--color-orange-soft-bg`, ícono `--color-orange-text`.
- **Badge de año por alumno:** pill chica junto al nombre (ya no es "año de la serie" — es el tag propio del alumno), fondo `--surface-gray-light`, texto `--text-muted`, tipografía condensada 12px. Necesario porque dentro de un bloque mixto (especialmente `unico`) conviven alumnos de distintos años en el mismo heat.
- Chip de tiempo: fondo `--surface-gray-light`, texto `--color-navy-deep`, condensada 26px bold, `border-radius: 8px`. Seleccionada/cargando: fondo `--color-orange-soft-bg`, texto naranja, card con borde `2px solid --color-orange-primary` + `scale(1.02)`.

**Estado "Visitante"** — sin cambios: ícono avión 13px `--color-steel` junto al nombre, metadata agrega "· visitante".

**Estado "No participa"** — sin cambios: card `opacity: 0.55`, nombre tachado, ícono de cronómetro-tachado, chip muestra "—".

### 3.5 Pantalla Resultados (admin) — jerarquía Preliminares / Finales

Esta pantalla ya no es "por año" — sigue la jerarquía de dos niveles confirmada en `CONTEXTOcompleto.md` sección 5:

```
Resultados
├─ Tab "Preliminares"
│   ├─ Selector turno + bloque (mismo patrón de tabs/tiles que Home)
│   ├─ Sub-tab "General del bloque" → todos, ordenados por tiempo, badge de año por fila
│   └─ Sub-tab "Por curso" → filtro adicional por año dentro del bloque ya seleccionado
└─ Tab "Finales"
    ├─ Selector turno + bloque
    └─ Un ranking por color (media_pileta / rojo / amarillo / verde), cada uno con su propio podio mini o lista
```

- Tabs de nivel superior (Preliminares/Finales): mismo estilo que tabs Mañana/Tarde existentes.
- Dentro de "Finales", cada color tiene su propio bloque de resultados con un **header de sección con el punto de color** (mismo token de la tabla de sección 1) + label del color, para que quede claro qué ranking se está mirando sin depender solo del orden.
- El selector de bloque solo aparece cuando el turno es tarde (mañana tiene un solo bloque, se omite el paso) — mismo criterio ya usado en Home.

### 3.6 Pantalla Público — resultados generales

- Header de sección: título `Turno {Turno}` + subtítulo explícito `Resultado general — todos los años y bloques` (esta pantalla sigue siendo un ranking mezclado a propósito, no navega por bloque — si eso cambia a futuro, actualizar este subtítulo).
- **Podio (top 3):** misma estructura de siempre (2°-1°-3°, avatares escalonados 44/38/34px), con el badge de año por nadador ahora mostrando el punto de color de heat + año + ícono visitante si aplica — el punto de color usa la tabla de 4 colores de la sección 1, no la de 3.
- **Barra de posición:** sin cambios (1° naranja 72px, 2°/3° blancas 56/44px).
- **Lista de resultados (4° en adelante):** sin cambios de layout; el año sigue debajo del nombre, sin borde de color (reservado a la pantalla operativa).
- **Leyenda de color (pie de podio):** ahora necesita los **4 puntos**, no 3 — media_pileta, rojo, amarillo, verde, cada uno con su label corta. Sin esta leyenda actualizada el público no puede interpretar el nuevo color índigo.
- **Comportamiento "mostrar todos"**: sin cambios.

## 4. Reglas de jerarquía entre señales de color

1. **Naranja `--color-orange-primary` es exclusivo de marca/estado activo** (seleccionado, en vivo, 1er puesto, CTA). Nunca representa color de heat ni año.
2. **El color de heat vive solo en:** borde lateral de card (carga de series, repetido por fila dentro del mismo heat), punto pequeño en badge de año (podio), y punto de header de sección en Finales por color. Nunca como fondo de card completo ni color de texto del nombre.
3. **Oro/plata/bronce es exclusivo del podio.**
4. **El ícono de visitante es monocromático** — no compite con el punto de color de heat que está al lado.
5. **El badge de "tipo de serie" (Preliminar/Final) usa fondo neutro navy-mid**, nunca un color de heat — es una señal distinta (estado del flujo, no nivel del nadador) y no debe leerse como un 5to color.
6. **El badge de "años mezclados" de una serie es siempre gris neutro** (`--surface-gray-light` / `--text-muted`) — es metadata organizativa, no debe competir visualmente con el color de heat que sí importa para leer el nivel.
7. Cuando un elemento junta varias señales (podio: posición + año + color de heat + visitante), cada señal ocupa su espacio dedicado, nunca se superponen sobre el mismo elemento gráfico.

## 5. Animación y microinteracciones — sin cambios de fondo

- **Pantalla operativa:** transición de selección 150-200ms ease-out, sin animación de entrada en la carga inicial.
- **Pantalla Público:** pulso "EN VIVO" continuo (1.6s), entrada de podio escalonada (450ms, delays 0/0.1s/0.2s), entrada de filas (350ms, delay 0.05s×índice por tanda), botón "Ver todos" dispara la misma animación solo sobre las filas nuevas.
- Respetar `prefers-reduced-motion` en todos los casos.

## 6. Accesibilidad y legibilidad (no negociable)

- Contraste AA (4.5:1 texto normal, 3:1 texto grande ≥18px bold) en toda combinación texto/fondo.
- **Daltonismo, ahora con 4 colores en vez de 3:** el sistema media_pileta/rojo/amarillo/verde no puede depender solo del hue — cada indicador de color siempre va acompañado del label textual del color (en la leyenda pública) o del texto de tipo/tiempo base en la pantalla operativa. No eliminar esos textos aunque el color ya esté presente. Con 4 colores el riesgo de confusión rojo↔índigo es menor que rojo↔verde, pero igual no depender solo del color.
- Focus visible en todos los elementos interactivos.
- Targets táctiles mínimos 44×44px en toda la interfaz operativa.

## 7. Fuentes y librerías necesarias — sin cambios

`Archivo Narrow` / `Oswald` vía Google Fonts o self-hosted. Un único set de íconos consistente (cronómetro, cronómetro-tachado, avión, chevrons, check, settings, trofeo, capas/bloque, tv).

## 8. Checklist de validación antes de dar por cerrado el rediseño

- [ ] Ningún fondo oscuro (navy) se usa en zonas de lectura/toque operativo bajo sol (solo headers y pantalla Público).
- [ ] El naranja de marca no se reutiliza para color de heat, año, o tipo de serie en ningún componente.
- [ ] El color de heat mostrado en pantalla proviene siempre de `series.color` — ningún componente recalcula el corte a partir de `tiempo_basico` + umbral.
- [ ] Los 4 colores (media_pileta/rojo/amarillo/verde) están contemplados donde antes había 3 — especialmente en la leyenda pública y en el token `--threshold-none` para series sin sembrar.
- [ ] El hex de `--threshold-media-pileta` fue confirmado con Santi/coordinadora (pendiente a la fecha de este documento).
- [ ] Home y AdminHome navegan turno→bloque, no turno→año — el año ya no tiene un selector propio de nivel superior.
- [ ] El badge de año aparece a nivel de alumno (fila/podio), no a nivel de serie, salvo el badge informativo de "años mezclados" en la lista de Series.
- [ ] Toda navegación a una serie puntual usa su `id`, nunca `series_number` solo.
- [ ] Todo nadador sin tiempo base muestra borde `--threshold-red` por defecto (asignación sigue siendo responsabilidad del backend).
- [ ] "No participa" nunca aparece en podio ni en lista de resultados públicos.
- [ ] "Visitante" muestra ícono + texto tanto en carga de series como en podio/resultados.
- [ ] La pantalla Resultados (admin) separa claramente Preliminares (general del bloque / por curso) de Finales (por color) — no las mezcla en un único listado.
- [ ] La pantalla Público aclara textualmente que el ranking general mezcla años y bloques.
- [ ] Leyenda de 4 colores presente y actualizada en la pantalla Público.
- [ ] Animaciones de entrada disparan una sola vez por carga/actualización, no en loop (excepto el pulso "EN VIVO").
- [ ] Contraste AA verificado en combinaciones nuevas, en particular el índigo de `media_pileta` sobre blanco.
