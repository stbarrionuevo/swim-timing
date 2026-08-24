# Carga de tiempos — Competencia de natación

App para que ~5 profesores carguen tiempos de una competencia escolar de
natación (25 m crol) desde el celular, en tiempo real y de forma simultánea,
y que la app ordene los resultados automáticamente.

Ver el contexto funcional completo del proyecto en `context-3.md` (todas las
reglas de negocio salen de ese documento).

## Estado actual: Pulido UX (nav inferior + cronómetro en la app)

Esto no estaba en el plan de etapas original — surgió al pedir que la
carga de tiempos se sintiera tan familiar como la app de Reloj de
Google. Se tomaron dos ideas de ahí y se dejó una tercera afuera a
propósito (ver más abajo por qué).

### Navegación por pestañas abajo

Home, Resultados y Admin ahora comparten una barra inferior fija (Series /
Resultados / Público / Admin) — `src/components/BottomNav.jsx` — en vez de
la pila de botones que tenía Home antes. Las pantallas de detalle (cargar
una serie puntual, administrar un año, importar) siguen usando la TopBar
con flecha de volver: son pasos dentro de un flujo, no secciones
principales, así que no les puse la barra.

### Botón flotante (FAB) chico

Sólo en `SeriesList` (agregar serie), que es el único lugar con una acción
de "+" sin ambigüedad. Lo pensé también para la pantalla de admin por
año, pero ahí cada serie ya tiene su propio formulario de "agregar
alumno" — un FAB único hubiera sido ambiguo (¿agrega serie o alumno?), así
que esa pantalla se quedó con el botón de siempre.

### Cronómetro en la app

Tocando el nombre de un alumno (con el ⏱ al lado) se despliega un
cronómetro: Iniciar → corre en vivo → Parar → aparece el valor capturado
con "Confirmar" o "Descartar". Al confirmar entra por el mismo camino que
cualquier otro guardado — mismo control de concurrencia (Etapa 7), misma
cola offline si no hay señal (Etapa 8), mismo aviso de "tiempo inusual"
para valores fuera de 8-60 segundos.

Un detalle de implementación que importa para la confiabilidad: el
tiempo final **nunca** se calcula sumando los "ticks" del temporizador
(`setInterval`) — siempre se recalcula como `Date.now() - momento de
inicio` en el instante exacto en que se toca "Parar". Así, si el
navegador frena el timer un rato (pantalla bloqueada, una notificación,
cambiar de app), el valor que queda registrado sigue siendo exacto — lo
único que se pierde es la actualización visual en vivo mientras esos
cortes duran, no la precisión del resultado.

La carga manual (escribir el número) sigue ahí siempre — el cronómetro es
una alternativa, no un reemplazo. Un profesor puede seguir usando su
propio cronómetro físico y tipeando el valor, exactamente como antes.

_Por qué no copié el círculo de progreso de un timer de Clock:_ no tiene
un equivalente natural en esta app — se probó en el mockup y competía
visualmente con el chip de tiempo, que es el elemento más importante de
la pantalla. Se descartó a propósito.

### Qué cambió en el código

- `src/components/BottomNav.jsx` — nuevo.
- `src/components/ParticipantRow.jsx` — reescrito: el nombre del
  participante ahora es un botón que despliega el panel del cronómetro;
  `attemptSave` es el único punto de validación que usan tanto el campo
  manual como el cronómetro (antes esa lógica vivía sólo en `commit`).
- `src/pages/Home.jsx`, `src/pages/Results.jsx`,
  `src/pages/admin/AdminHome.jsx` — usan `<BottomNav />`, ya no repiten
  botones de navegación entre sí.
- `src/pages/SeriesList.jsx` — el botón "+ Agregar serie" pasó a ser un
  FAB.
- `src/styles.css` — estilos de `.bottom-nav`, `.fab` y
  `.stopwatch-panel`.

## Estado anterior: Etapa 9 + 10 (administración e importación)

También se hicieron juntas: la importación masiva reutiliza exactamente la
misma lógica de "crear alumno en una serie" que el alta manual del panel
de administración — importar un CSV es, para el código, simplemente
llamar a esa función muchas veces en vez de una.

### Etapa 9 — Panel de administración (`/admin`)

Hasta acá, la única forma de poblar la base era `npm run seed` (con
alumnos ficticios) — cualquier competencia real requería tocar código.
Ahora hay una pantalla para armar todo desde la app:

- **Datos de la competencia** — nombre, prueba y fecha, editables.
- **Por año** (`/admin/anio/:año`) — ver/editar/eliminar alumnos de cada
  serie, agregar alumnos nuevos, agregar/eliminar series. Reutiliza el
  mismo `getSeriesListForYear`/`getParticipantsForSeries` que ya usaban
  las pantallas de los profesores — no hay una segunda fuente de verdad.
- Los cambios acá también viajan por Realtime (Etapa 6): si un admin
  agrega un alumno mientras un profesor tiene la lista de series abierta,
  aparece solo.

No hay un login separado para "administrador" — las políticas de RLS
siguen abiertas (ver `supabase/schema.sql`), así que en la práctica
cualquiera con el link puede entrar a `/admin`. Es una decisión consciente
por la simplicidad que pide el contexto (sección 38); si en algún momento
hace falta restringirlo, es un cambio de políticas de Supabase, no de
estructura.

Para arrancar una competencia real desde cero (sin los alumnos
ficticios de prueba):

```bash
npm run init   # crea sólo la fila de la competencia, vacía
```

(`npm run seed` sigue estando para pruebas — llena todo con alumnos
ficticios y borra lo que hubiera antes.)

### Etapa 10 — Importar CSV / Excel (`/admin/importar`)

Subís un archivo `.csv`, `.xlsx` o `.xls` con columnas **nombre** y
**año** (1 a 6) obligatorias, y opcionalmente **serie** y **visitante**
(si no viene serie, todos entran a la Serie 1 y se pueden reordenar
después desde `/admin`). Hay una plantilla de ejemplo descargable desde la
misma pantalla (`public/plantilla-alumnos.csv`).

El archivo se parsea en el navegador (nadie sube nada a ningún servidor
intermedio), se muestra una vista previa separando filas válidas de filas
con error (falta el nombre, año fuera de 1-6, etc.), y recién al confirmar
se crean las series que falten y se insertan los alumnos en tandas.

_Nota técnica:_ la librería de parseo (`xlsx`/SheetJS) tiene una
vulnerabilidad conocida sin parche (ver `npm audit`) ante archivos
maliciosos. Como es una herramienta de uso interno donde sólo se importa
la propia planilla de alumnos, el riesgo es bajo — pero no le subas
archivos de origen desconocido. También está separada en su propio chunk
(`xlsx-*.js`) para que los profesores que sólo cargan tiempos no la
descarguen — sólo pesa cuando alguien entra a `/admin/importar`.

### Qué cambió en el código

- `src/services/resultsService.js` — `createParticipant`,
  `updateParticipant`, `deleteParticipant`, `bulkCreateParticipants`,
  `updateCompetition`.
- `src/context/CompetitionContext.jsx` — `createParticipant`,
  `updateParticipant`, `deleteParticipant`, `updateCompetition`,
  `importParticipants` (agrupa filas por año+serie, crea las series que
  falten, e inserta en tandas), y `findOrCreateSeries` como utilidad
  compartida. También nuevos casos de Realtime para altas/bajas
  individuales de participantes (antes sólo se manejaban ediciones y
  bajas en cascada por borrado de serie).
- `src/pages/admin/` — `AdminHome.jsx`, `AdminYear.jsx`,
  `AdminImport.jsx`.
- `scripts/init.mjs` — bootstrap de una competencia vacía.

### Qué todavía no hay (a propósito)

- Autenticación / roles — sigue siendo un panel abierto (sección 38 del
  contexto).
- Edición de series/participantes con el mismo control de concurrencia
  de la Etapa 7 — el panel de admin asume que no hay dos personas
  administrando exactamente al mismo alumno en el mismo instante (un
  supuesto razonable para esta herramienta).

## Estado anterior: Etapa 7 + 8 (concurrencia real y modo offline)

Estas dos etapas se construyeron juntas a propósito: el modo offline
necesita el mismo mecanismo de "¿alguien más cambió esto mientras yo no
miraba?" que la protección contra sobrescrituras — sólo que en vez de
dispararse mientras el profesor edita, se dispara al reconectar y
sincronizar lo que quedó pendiente en el celular.

### Etapa 7 — Concurrencia real (control de versión optimista)

Hasta la etapa anterior, si dos profesores cargaban un tiempo para el
mismo alumno casi al mismo tiempo, ganaba el último "Guardar" — en
silencio, sin que nadie se enterara de que pisó el valor de otro.

Ahora cada guardado de tiempo viaja con el valor que el profesor tenía en
pantalla cuando empezó a escribir (`{ time, updatedAt }`). Del lado de la
base:

- Si no había tiempo cargado, se intenta **insertar**. Si alguien más ya
  insertó uno un segundo antes, el `unique(participant_id)` de la tabla
  rechaza el insert — eso ya es, por sí solo, la detección de conflicto.
- Si ya había un tiempo, se **actualiza sólo si `updated_at` sigue siendo
  el mismo** que el profesor vio por última vez (`update ... where
  participant_id = ? and updated_at = ?`). Si no matchea ninguna fila,
  quiere decir que cambió mientras tanto.

En cualquiera de los dos casos, la app no sobrescribe nada a ciegas: le
muestra al profesor un banner con **su valor** y **el valor que quedó
guardado**, y dos botones — quedarse con el valor ajeno o forzar el
propio. Se ve en `src/components/ParticipantRow.jsx` y en
`resolveConflict` dentro del context.

_Nota de alcance:_ el control de versión aplica al campo de **tiempo**,
que es el dato central de la app y donde un conflicto real importa.
"No participa" y "Visitante" siguen siendo último-en-guardar-gana — dos
profesores tildando el mismo checkbox al mismo milisegundo es un caso
mucho más raro y de bajo impacto si se pisa.

### Etapa 8 — Modo offline

Si el celular se queda sin señal (algo bastante común en un natatorio),
la app no se rompe ni pierde lo que el profesor está cargando:

- Guardar un tiempo, marcar "No participa" o "Visitante" con la conexión
  caída (o si el pedido de red directamente falla) hace que la operación
  se guarde en una cola local (`localStorage`, ver
  `src/lib/offlineQueue.js`) y se refleje igual en pantalla con un
  indicador de "⏳ pendiente de sincronizar" — el profesor sigue cargando
  la serie normalmente, sin darse cuenta de que está offline salvo por el
  badge de arriba.
- Apenas el navegador avisa que volvió la conexión (evento `online`), la
  app recorre la cola y reintenta cada operación una por una. Los
  tiempos pasan por el mismo control de versión de la Etapa 7: si mientras
  el celular estaba offline alguien más cargó un valor distinto para ese
  mismo alumno, aparece como conflicto — nunca se pisa en silencio.
- El badge de arriba muestra "🔴 Sin conexión" + la cantidad de cambios
  pendientes mientras dura el corte.

_Nota de alcance:_ la cola offline cubre la carga de tiempos y las marcas
de ausente/visitante — el corazón de lo que un profesor hace parado al
lado de la pileta. Agregar o eliminar series todavía requiere conexión
(son operaciones puntuales del que arma la competencia, no algo que se
haga bajo presión de tiempo en el momento de la carrera).

### Cómo probarlas

**Conflicto (Etapa 7):** abrí la misma serie en dos pestañas, hacé foco en
el mismo campo de tiempo en ambas (sin guardar todavía), guardá primero en
una — y recién después guardá en la otra con un valor distinto. La segunda
debería mostrar el banner de conflicto en vez de pisar el valor.

**Offline (Etapa 8):** con la app abierta, cortá la red desde las devtools
(Network → Offline) o poné el celular en modo avión, cargá un par de
tiempos (deberían verse en amarillo, "pendiente de sincronizar"), y volvé
a activar la conexión — deberían confirmarse solos (pasan a verde) sin
que hiciste nada más.

### Qué cambió en el código

- `src/services/resultsService.js` — `saveParticipantTime` ahora hace
  insert-o-update-condicionado en vez de upsert ciego; nuevo
  `isNetworkError` para distinguir "no hay conexión" de un error real.
- `src/lib/offlineQueue.js` — cola de escrituras pendientes en
  `localStorage`.
- `src/context/CompetitionContext.jsx` — nuevo estado `conflicts` (con
  `getConflict` / `resolveConflict`), `isOnline` y `pendingCount`; las
  funciones de escritura (`saveTime`, `setAbsent`, `setVisitor`) ahora
  encolan en vez de fallar cuando no hay red, y hay un `flushQueue` que se
  dispara al reconectar.
- `src/components/ParticipantRow.jsx` — captura el valor "base" al hacer
  foco en el campo (para poder detectar conflictos), y muestra el banner
  de resolución y el estado "pendiente".
- `src/components/LiveBadge.jsx` — ahora también informa sin
  conexión / cantidad de pendientes.

### Qué todavía no hay (a propósito)

- Panel de administración — Etapa 9.
- Importación CSV/Excel — Etapa 10.

Flujo implementado:

```
Inicio → Seleccionar año → Seleccionar serie → Cargar tiempos → Resultados
```

Funcionalidades cubiertas (prioridad crítica del contexto):

- Selección de año y serie.
- Carga de tiempos por participante, con guardado individual (nunca se
  sobrescribe la serie completa — cada tiempo es una operación
  independiente, ver `src/services/resultsService.js`).
- Marcar "No participa" (ausente) — nunca genera un tiempo artificial.
- Marcar "Visitante" (booleano simple, sin entidad de colegio).
- Validación de formato de tiempo, con confirmación para tiempos inusuales.
- Ranking por año y ranking general, ordenados de menor a mayor tiempo.
- Estados de serie (pendiente / en progreso / completada), derivados de los
  datos, no de un botón manual.
- Agregar / eliminar series (eliminar pide confirmación si ya tiene
  resultados cargados).
- Pantalla pública de solo lectura (para TV/proyector).

Lo que **todavía no existe** (a propósito, es de otra etapa):

- Panel de administración para preparar la competencia (años, alumnos,
  series) — hoy los datos se cargan con `npm run seed` (Etapa 9).
- Importación CSV/Excel de alumnos (Etapa 10).
- Autenticación — las políticas de RLS son abiertas a propósito (ver nota
  en `supabase/schema.sql`), siguiendo la sección 38 del contexto: nada de
  roles complejos para el MVP.

## Por qué está armado así

El código está separado en capas para que cada etapa nueva sea agregar una
pieza, no reescribir lo anterior:

- `src/data/mockData.js` — generador de datos ficticios, usado hoy sólo
  por `scripts/seed.mjs` para poblar Supabase (hasta que exista el panel
  de administración de la Etapa 9).
- `src/services/resultsService.js` — toda la comunicación con Supabase:
  lectura inicial, escrituras (siempre **un participante o una serie a la
  vez**, nunca "toda la serie" de un saque) y la suscripción de Realtime.
- `src/context/CompetitionContext.jsx` — estado de la app + selectores
  derivados (listado de series con su estado, ranking por año, ranking
  general). Las pantallas no calculan nada por su cuenta. También es el
  punto donde conviven las escrituras locales y los eventos que llegan por
  Realtime, ambos alimentando el mismo estado.
- `src/pages/` — una pantalla por paso del flujo.
- `src/components/` — piezas reutilizables (fila de participante, badge de
  estado, fila de ranking, barra superior, indicador de conexión en vivo).

## Poner en marcha Supabase (una sola vez, proyecto nuevo)

1. Creá un proyecto gratuito en [supabase.com](https://supabase.com).
2. SQL Editor → New query → pegá `supabase/schema.sql` → Run.
3. SQL Editor → New query → pegá `supabase/enable_realtime.sql` → Run.
4. Project Settings → API → copiá `Project URL`, `anon public key` y
   `service_role key`.
5. `cp .env.example .env` y completá esos tres valores.

## Correr el proyecto

```bash
npm install
npm run seed            # carga datos ficticios (podés repetirlo cuando quieras)
npm run dev             # http://localhost:5173 — probar con las devtools en modo celular
npm run build            # build de producción a /dist
```

_Nota sobre versiones:_ `vite` está fijado en `6.x` (no la última) y
`@vitejs/plugin-react` en `4.x` a propósito. La versión más nueva de Vite
trae por defecto un motor de build experimental (rolldown/oxc) que en las
pruebas de este proyecto generaba un `build` "exitoso" pero con el bundle
final vacío de código de la app (sólo dependencias, sin ninguna pantalla)
— sin ningún error visible. `npm run dev` no se ve afectado, sólo
`npm run build`. Si en algún momento actualizás `vite`, verificá que el
`dist/assets/index-*.js` generado realmente contenga texto de la app (por
ejemplo `grep -a "Cargando" dist/assets/index-*.js`) antes de confiar en
el build.

## Roadmap (etapas siguientes, según el contexto)

1. ~~Interfaz funcional con datos ficticios~~ ✅
2. ~~Conectar Supabase — guardar participantes y resultados reales~~ ✅
3. ~~Ranking por año desde la base de datos~~ ✅
4. ~~Ranking general desde la base de datos~~ ✅
5. ~~Múltiples dispositivos simultáneos~~ ✅
6. ~~Supabase Realtime (actualización en vivo entre profesores)~~ ✅
7. ~~Concurrencia y protección contra sobrescrituras silenciosas~~ ✅ (esta etapa)
8. ~~Almacenamiento local/offline y cola de sincronización~~ ✅ (esta etapa)
9. ~~Administración previa (años, alumnos, series)~~ ✅ (esta etapa)
10. ~~Importación CSV/Excel~~ ✅ (esta etapa)
11. Pruebas reales y pulido de UX — en curso (nav inferior + cronómetro
    en la app ya hechos; falta probarlo con los 5 profesores reales).
