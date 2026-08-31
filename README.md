# Carga de tiempos — Competencia de natación

App para que ~5 profesores carguen tiempos de una competencia escolar de
natación (25 m crol) desde el celular, en tiempo real y de forma simultánea,
y que la app ordene los resultados automáticamente.


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

