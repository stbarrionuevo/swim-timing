# Contexto del proyecto — Sistema de carga de tiempos de competencia de natación

## 1. Objetivo del proyecto

Desarrollar una aplicación web extremadamente simple para agilizar la carga y ordenamiento de tiempos durante una competencia escolar de natación.

La prueba inicial será:

- **25 metros crol**
- Competencia prevista para el **10 de septiembre de 2026**
- Aproximadamente 40 nadadores por año.
- Los nadadores se organizan en series, normalmente de aproximadamente 5 participantes.
- Puede haber aproximadamente 8 series para 40 participantes, pero la cantidad de series y participantes debe ser flexible.
- Puede haber alumnos que no participen el día de la competencia.
- Puede haber participantes de otros colegios.
- Aproximadamente 5 profesores pueden utilizar la aplicación simultáneamente.

El objetivo principal NO es crear un sistema completo de gestión deportiva.

El objetivo es:

> **Permitir que los profesores carguen tiempos de manera rápida y sencilla durante la competencia y que la aplicación ordene automáticamente los resultados.**

La aplicación debe reemplazar/agilizar el proceso actual de anotar tiempos y luego ordenarlos manualmente.

---

# 2. Principio fundamental del proyecto

La aplicación debe estar diseñada para personas que:

- No necesariamente están acostumbradas a utilizar aplicaciones.
- Pueden estar trabajando desde un celular.
- Están en medio de una competencia.
- Necesitan cargar datos rápidamente.
- No tienen tiempo para leer instrucciones complejas.

Por lo tanto:

> **La simplicidad y velocidad de uso tienen prioridad sobre la cantidad de funcionalidades.**

Si una funcionalidad no es necesaria para registrar tiempos o consultar resultados, NO debe agregarse al MVP.

No agregar dashboards complejos, estadísticas innecesarias, perfiles, rankings sofisticados, categorías deportivas, etc.

---

# 3. Flujo principal

El flujo normal de un profesor durante la competencia debe ser:

1. Seleccionar año.
2. Seleccionar serie.
3. Ver los participantes de esa serie.
4. Introducir los tiempos.
5. Marcar como "No participa" a quien esté ausente.
6. Opcionalmente marcar a un participante como visitante.
7. Guardar los resultados.
8. Pasar a otra serie o continuar trabajando sobre la misma.

IMPORTANTE:

**Varios profesores pueden estar trabajando simultáneamente sobre la misma serie.**

Por ejemplo:

- Profesor 1 → Serie 1
- Profesor 2 → Serie 1
- Profesor 3 → Serie 1
- Profesor 4 → Serie 1
- Profesor 5 → Serie 1

Cada profesor puede cargar el tiempo de un participante diferente.

La aplicación debe soportar esto correctamente.

El profesor NO debería tener que introducir manualmente datos que ya fueron preparados previamente.

---

# 4. Concepto de año

Los cursos se identifican únicamente por año.

Ejemplos:

- 1° año
- 2° año
- 3° año
- 4° año
- 5° año
- 6° año

NO utilizar divisiones como:

- 5° A
- 5° B
- 6° A
- 6° B

No existe el concepto de comisión.

El sistema debe utilizar únicamente el número/año del curso.

---

# 5. Concepto de serie

Una serie es un grupo de participantes que nadan juntos.

Ejemplo:

Serie 1:

- Juan
- Pedro
- Martín
- Lucas
- Nicolás

Serie 2:

- ...

Una serie normalmente tendrá 5 participantes, pero esto NO debe ser una regla obligatoria.

Una serie puede tener:

- 1 participante
- 2 participantes
- 3 participantes
- 4 participantes
- 5 participantes
- más de 5 participantes

La aplicación debe ser flexible.

La cantidad de series tampoco debe estar fija en 8.

Puede haber:

- 6 series
- 8 series
- 9 series
- 10 series
- etc.

Debe existir la posibilidad de agregar series.

También debe ser posible eliminar series que todavía no tengan datos relevantes.

Si una serie tiene resultados registrados, eliminarla debe requerir una confirmación explícita.

---

# 6. Participantes

Cada participante debe tener como mínimo:

- ID
- Nombre
- Año
- Serie
- Tiempo
- Estado de participación
- Indicador de colegio visitante

Conceptualmente:

```text
Participant
├── id
├── nombre
├── año
├── serie
├── tiempo
├── participa
└── esColegioVisitante
```

---

# 7. Colegio visitante

No es necesario crear una entidad separada para colegios visitantes.

No se necesita almacenar:

- Nombre del colegio visitante.
- Dirección.
- Contacto.
- Información administrativa.
- Etc.

Solamente necesitamos un booleano:

```text
esColegioVisitante
```

Valor por defecto:

```text
false
```

En la interfaz se debe mostrar como:

```text
☐ Visitante
```

Si el profesor lo marca:

```text
☑ Visitante
```

Esto permite que un participante que no pertenece al colegio organizador pueda participar de la competencia.

No debe existir una diferencia en la lógica del ranking por ser visitante.

Los participantes visitantes compiten normalmente y aparecen en los rankings.

En los resultados se puede mostrar una pequeña indicación visual:

```text
Juan Pérez       18.42
Martín López     18.71 · Visitante
```

Pero el visitante no debe recibir un ranking separado.

---

# 8. Alumnos ausentes / No participa

Puede ocurrir que un alumno esté incluido inicialmente en una serie pero finalmente no participe.

Ejemplo:

Serie 3:

```text
Juan Pérez
Martín López
Pedro Gómez
Lucas Díaz
Nicolás Ruiz
```

Pedro no asiste.

No se debe obligar al profesor a inventar un tiempo.

Debe existir una opción:

```text
☐ No participa
```

Al marcarla:

```text
☑ No participa
```

El participante queda registrado pero no tiene tiempo válido.

El resultado debe quedar fuera de todos los rankings.

No se debe utilizar un tiempo artificial como:

```text
0
999
999.99
```

Internamente el tiempo debe ser `null` o equivalente cuando no participa.

No pedir al profesor que escriba manualmente `-`.

El símbolo `-` puede utilizarse visualmente para representar ausencia/no participación.

---

# 9. Tiempo

La aplicación inicialmente trabaja exclusivamente con:

**25 metros crol.**

Los tiempos se expresan en:

```text
segundos.centésimas
```

Ejemplos válidos:

```text
17.82
18.42
21.05
24.91
```

El usuario debe introducir solamente el tiempo.

No pedir:

- minutos
- horas
- formato complejo
- unidades separadas

La interfaz debe facilitar la entrada numérica desde celular.

El campo debería utilizar un teclado numérico cuando sea posible.

---

# 10. Validación de tiempos

La aplicación debe validar que el tiempo tenga un formato razonable.

Ejemplos válidos:

```text
17.82
18.40
21.05
```

No debería aceptar fácilmente entradas claramente inválidas como:

```text
hola
abc
18 segundos
```

Si el formato es incorrecto, mostrar un mensaje simple y comprensible.

No bloquear automáticamente tiempos extraordinariamente rápidos o lentos.

En caso de que un tiempo parezca extraño, se puede mostrar una advertencia, pero debe permitirse guardar después de confirmarla.

Ejemplo:

```text
⚠️ Este tiempo parece inusualmente bajo.
¿Seguro que querés guardar 5.12?

[Cancelar] [Guardar]
```

---

# 11. Carriles

NO utilizar carriles.

No existe ningún campo:

```text
carril
lane
lane_number
```

Los carriles no forman parte del modelo de datos ni del flujo de usuario.

Esto es deliberado para evitar pedir información innecesaria al profesor.

La aplicación solamente necesita conocer el orden de los participantes dentro de una serie.

---

# 12. Género

NO separar resultados por género.

No existe:

- Masculino
- Femenino
- Otro
- Categorías por género

La competencia utiliza un único ranking.

---

# 13. Categorías

No existen categorías adicionales.

No implementar:

- Categoría por edad.
- Categoría por género.
- Categoría por nivel.
- Categoría por federación.
- Categoría competitiva.

La única división específica de resultados es:

**por año.**

Además existe:

**ranking general.**

---

# 14. Rankings

La aplicación debe generar dos tipos de resultados.

## 14.1 Ranking por año

Ejemplo:

```text
5° año — 25 m Crol

1. Juan Pérez       17.82
2. Martín López     18.14
3. Lucas Gómez      18.51
4. Pedro Díaz       19.02
...
```

Solamente se muestran participantes con un tiempo válido.

Los participantes sin tiempo/no participantes quedan excluidos.

Los visitantes sí aparecen.

---

## 14.2 Ranking general

Debe existir un ranking que mezcle a todos los participantes de todos los años.

Ejemplo:

```text
GENERAL — 25 m Crol

1. Juan Pérez       17.82   5° año
2. Nicolás Ruiz     17.91   6° año
3. Martín López     18.14   5° año
4. Pedro Gómez      18.30   4° año
...
```

El ranking general responde a:

> ¿Quién tuvo el mejor tiempo independientemente del año?

Por lo tanto, un participante de 5° año puede quedar por encima de uno de 6° año.

La lógica es ordenar todos los tiempos válidos de menor a mayor.

---

# 15. Empates

Si dos participantes tienen exactamente el mismo tiempo:

```text
18.42
18.42
```

No inventar desempates.

Mostrar el empate de forma clara.

La implementación del ranking debe permitir posteriormente decidir cómo representar posiciones empatadas.

Para el MVP puede utilizarse el orden de registro como criterio visual secundario, pero nunca alterar el tiempo real.

---

# 16. Ordenamiento

Los tiempos deben ordenarse de:

**menor → mayor**

Porque un tiempo menor representa un mejor resultado.

Ejemplo:

```text
17.82
18.14
18.42
19.03
21.11
```

Nunca ordenar alfabéticamente ni de mayor a menor en el ranking principal.

---

# 17. Preparación previa de la competencia

Antes del día de la competencia, un administrador debe poder preparar los datos.

Debe poder:

- Crear/configurar la competencia.
- Crear los años.
- Cargar alumnos.
- Asignar alumnos a series.
- Agregar series.
- Modificar participantes.
- Revisar que los participantes estén correctamente distribuidos.

Los profesores que cargan los tiempos NO deberían tener que hacer esta preparación durante la competencia.

---

# 18. Carga de alumnos

Para el MVP debe existir una forma sencilla de cargar previamente los alumnos.

Idealmente:

- carga manual para pocos alumnos
- importación desde Excel/CSV si resulta conveniente

La importación de Excel/CSV es deseable pero NO debe retrasar la creación del MVP.

Si se implementa, debe permitir importar como mínimo:

```text
nombre
año
serie
```

El campo `esColegioVisitante` debe ser opcional y tener `false` como valor predeterminado.

---

# 19. Pantalla inicial del profesor

La pantalla inicial debe ser extremadamente simple.

Ejemplo:

```text
🏊 COMPETENCIA DE NATACIÓN

Seleccioná el año

┌─────────────────────┐
│      1° AÑO         │
└─────────────────────┘

┌─────────────────────┐
│      2° AÑO         │
└─────────────────────┘

┌─────────────────────┐
│      3° AÑO         │
└─────────────────────┘

...
```

Los botones deben ser grandes y fáciles de tocar.

---

# 20. Selección de serie

Después de seleccionar el año:

```text
3° AÑO

Seleccioná la serie

Serie 1
5 participantes

Serie 2
5 participantes

Serie 3
4 participantes

Serie 4
5 participantes

...

+ Agregar serie
```

Mostrar claramente si una serie está:

- pendiente
- en progreso
- completada

Ejemplo:

```text
Serie 1    ✅ Completada
Serie 2    ⏳ Pendiente
Serie 3    ⏳ Pendiente
```

IMPORTANTE:

No impedir que varios profesores abran simultáneamente la misma serie.

---

# 21. Pantalla de carga

Esta es la pantalla más importante de toda la aplicación.

Debe ser extremadamente limpia.

Ejemplo:

```text
← Volver

3° AÑO — SERIE 3

Juan Pérez
[ 18.42 ]

Martín López
[ 19.03 ]

Pedro Gómez
☑ No participa

Lucas Díaz
[ 20.15 ]

Nicolás Ruiz
[ 18.77 ]

        [ GUARDAR ]
```

Cada participante debe estar claramente separado.

El botón de guardar debe ser grande.

No agregar información innecesaria.

---

# 22. Carga simultánea de una misma serie

Esta es una funcionalidad crítica.

Los 5 profesores pueden tener abierta **la misma serie simultáneamente**.

Ejemplo:

```text
Serie 1

Juan Pérez       —
Pedro Gómez      —
Martín López     —
Lucas Díaz       —
Nicolás Ruiz     —
```

Los cinco profesores pueden trabajar sobre esta misma pantalla.

Por ejemplo:

```text
Profesor 1 → Juan Pérez       → 18.42
Profesor 2 → Pedro Gómez      → 19.03
Profesor 3 → Martín López     → 17.91
Profesor 4 → Lucas Díaz       → 20.15
Profesor 5 → Nicolás Ruiz     → 18.77
```

Cada resultado debe guardarse como una operación independiente.

## Regla fundamental

**Nunca guardar una serie completa reemplazando todos sus participantes de una sola vez.**

Cada participante debe tener su propio registro de resultado.

Ejemplo conceptual:

```text
participant_id = 101
time = 18.42
```

```text
participant_id = 102
time = 19.03
```

```text
participant_id = 103
time = 17.91
```

etc.

Esto permite que múltiples profesores escriban simultáneamente sin sobrescribir los datos de los demás.

---

# 23. Concurrencia y conflictos

La aplicación debe soportar como mínimo:

- 5 profesores conectados simultáneamente.
- Los 5 pueden estar en la misma serie.
- Los 5 pueden guardar resultados al mismo tiempo.
- También pueden estar trabajando en series diferentes.

Las escrituras sobre participantes distintos no deben generar conflictos.

## Caso especial: dos profesores modifican al mismo participante

Si dos dispositivos intentan modificar simultáneamente el mismo participante:

```text
Profesor 1 → Juan = 18.42
Profesor 2 → Juan = 18.52
```

La aplicación no debe sobrescribir silenciosamente un resultado sin control.

Debe detectarse el conflicto o utilizarse una estrategia de actualización segura.

Como mínimo, el usuario debe recibir una indicación si el resultado cambió desde que abrió la pantalla.

Ejemplo:

```text
⚠️ Este resultado fue modificado desde otro dispositivo.

Tiempo actual: 18.42

[Cancelar] [Revisar y guardar]
```

La prioridad es evitar pérdida silenciosa de información.

---

# 24. Actualización en tiempo real

La aplicación será utilizada simultáneamente por aproximadamente 5 profesores.

Todos deben trabajar sobre la misma información.

Cuando un profesor guarda un tiempo:

1. Se guarda en la base de datos.
2. Los demás clientes conectados reciben el cambio.
3. La interfaz actualiza el participante correspondiente.
4. Los rankings se actualizan automáticamente.

Utilizar Supabase Realtime o una solución equivalente.

No debe ser necesario recargar manualmente la página para ver nuevos resultados.

---

# 25. Ejemplo de actualización en vivo

Inicialmente:

```text
Serie 1

Juan Pérez       —
Pedro Gómez      —
Martín López     —
Lucas Díaz       —
Nicolás Ruiz     —
```

Profesor 1 guarda:

```text
Juan Pérez       18.42
```

Los demás dispositivos deberían poder recibir:

```text
Juan Pérez       18.42   ✓
```

Luego otro profesor guarda:

```text
Pedro Gómez      19.03
```

Y todos reciben:

```text
Juan Pérez       18.42   ✓
Pedro Gómez      19.03   ✓
Martín López     —       ⏳
Lucas Díaz       —       ⏳
Nicolás Ruiz     —       ⏳
```

No requiere refrescar la página.

---

# 26. Confirmación después de guardar

Después de guardar un resultado individual o una serie, mostrar una confirmación clara.

Ejemplo:

```text
✅ Tiempo guardado

Juan Pérez — 18.42
```

Si se utiliza un botón de "Guardar serie", mostrar:

```text
✅ Serie guardada

4 tiempos registrados.
1 participante no participó.
```

Pero el sistema debe permitir también que varios profesores vayan completando individualmente la misma serie.

Por eso no asumir que un profesor "posee" o "bloquea" una serie.

---

# 27. Edición de resultados

Debe ser posible corregir un tiempo.

Ejemplo:

```text
Juan Pérez

Tiempo:
[ 18.42 ]

[ Guardar cambio ]
```

Cuando se modifica un tiempo, los rankings deben actualizarse automáticamente.

---

# 28. Pantalla de resultados

Debe existir una pantalla sencilla para consultar resultados.

Ejemplo:

```text
🏆 RESULTADOS

[ Por año ] [ General ]

5° AÑO

1. Juan Pérez       17.82
2. Martín López     18.14
3. Lucas Gómez      18.51
...
```

Para la general:

```text
🏆 RESULTADO GENERAL

1. Juan Pérez       17.82   5° año
2. Nicolás Ruiz     17.91   6° año
3. Martín López     18.14   5° año
...
```

---

# 29. Pantalla pública

Debe existir una vista especialmente pensada para mostrar resultados en una computadora, TV o proyector.

Debe tener:

- texto grande
- alto contraste
- pocos elementos
- actualización automática
- sin controles administrativos

Debe ser una vista de lectura.

---

# 30. Conectividad

La competencia puede realizarse en un lugar donde la conexión a Internet no sea perfecta.

La aplicación debe minimizar el riesgo de pérdida de información.

Idealmente debe implementar:

- almacenamiento local temporal
- detección de conexión
- cola de registros pendientes
- sincronización cuando vuelva Internet

Ejemplo:

```text
📵 Sin conexión

Tiempo guardado en este dispositivo.
Se sincronizará automáticamente cuando vuelva la conexión.
```

Cuando se sincroniza:

```text
☁️ Sincronizado
```

Esta funcionalidad tiene prioridad sobre funcionalidades secundarias.

---

# 31. Arquitectura tecnológica

La arquitectura recomendada para el MVP es:

```text
                    INTERNET
                       │
        ┌──────────────┼──────────────┐
        │              │              │
      📱 P1           📱 P2           📱 P3
        │              │              │
      📱 P4           📱 P5           💻 Resultados
        │              │              │
        └──────────────┼──────────────┘
                       ↓
                  🌐 Web App
                       ↓
                   Supabase
                ┌──────┴──────┐
                │             │
          PostgreSQL       Realtime
```

Tecnologías sugeridas:

### Frontend

- HTML
- CSS
- JavaScript
- Diseño responsive/mobile-first

### Backend / base de datos

- Supabase
- PostgreSQL
- Supabase Realtime

### Hosting

Utilizar un proveedor con plan gratuito, por ejemplo:

- Vercel
- Netlify
- u otro proveedor equivalente

No asumir que se necesita un servidor pago.

La aplicación debe estar diseñada para funcionar dentro de los límites razonables de los planes gratuitos.

---

# 32. Base de datos

Modelo conceptual recomendado:

## Competition

```text
id
name
date
```

## Year

```text
id
competition_id
number
```

## Series

```text
id
competition_id
year_id
number
```

## Participant

```text
id
competition_id
year_id
series_id
name
es_colegio_visitante
participa
```

## Result

```text
id
participant_id
time
created_at
updated_at
```

No guardar el tiempo directamente en la serie.

El resultado debe estar asociado al participante.

Esto es fundamental para permitir concurrencia.

---

# 33. Relaciones

Conceptualmente:

```text
Competition
    │
    ├── Years
    │     │
    │     ├── Series
    │     │     │
    │     │     └── Participants
    │     │             │
    │     │             └── Result
    │     │
    │     └── Participants
    │
    └── All results
```

Un participante pertenece a un año y una serie.

Un resultado pertenece a un participante.

---

# 34. Reglas importantes de negocio

1. Un participante pertenece a un único año dentro de una competencia.
2. Un participante puede pertenecer a una serie.
3. Una serie pertenece a un año.
4. Una serie puede tener cualquier cantidad razonable de participantes.
5. La cantidad de series no está fija.
6. Un participante puede estar marcado como visitante.
7. Visitante es un booleano.
8. El valor predeterminado de visitante es `false`.
9. Un participante puede no participar.
10. Un participante que no participa no tiene tiempo.
11. Los participantes sin tiempo no aparecen en rankings.
12. Los visitantes participan normalmente en rankings.
13. Los tiempos menores son mejores.
14. El ranking por año solamente incluye participantes de ese año.
15. El ranking general incluye todos los años.
16. No existe ranking separado para visitantes.
17. No existe separación por género.
18. No existe separación por comisión.
19. No existe concepto de carril.
20. La serie no afecta el ranking.
21. La serie solamente organiza el proceso de competencia/carga.
22. Los resultados deben actualizarse en tiempo real.
23. Varios profesores pueden trabajar simultáneamente.
24. Los 5 profesores pueden trabajar sobre la misma serie.
25. Cada participante debe tener su propio registro de resultado.
26. Nunca sobrescribir una serie completa al guardar un único tiempo.
27. Las escrituras concurrentes sobre participantes diferentes deben funcionar sin conflictos.
28. Los conflictos sobre el mismo participante deben manejarse de forma segura.
29. Los datos no deben perderse por un corte temporal de conexión.
30. Una ausencia nunca debe convertirse en un tiempo artificial.
31. Una serie puede tener menos o más de 5 participantes.
32. Se pueden agregar nuevas series.
33. Se pueden eliminar series vacías o sin datos, con confirmación cuando corresponda.

---

# 35. Seguridad y consistencia

Aunque el proyecto sea pequeño, no confiar únicamente en la interfaz.

Las reglas importantes también deben validarse en la base de datos/backend cuando corresponda.

Evitar:

- duplicación accidental de resultados
- resultados asociados al participante equivocado
- sobrescritura accidental por concurrencia
- eliminación accidental de resultados
- tiempos inválidos

Cada resultado debe poder rastrearse hasta:

```text
competencia
→ año
→ serie
→ participante
→ tiempo
```

---

# 36. Importación de alumnos

Si se implementa importación CSV/Excel, el archivo puede tener:

```text
nombre,año,serie
Juan Pérez,5,1
Martín López,5,1
Pedro Gómez,5,1
Lucas Díaz,5,1
Nicolás Ruiz,5,1
```

El sistema debe crear automáticamente los participantes correspondientes.

El campo visitante puede quedar:

```text
false
```

por defecto.

No obligar a los profesores a importar datos durante la competencia.

---

# 37. Interfaz de administración

La administración previa puede ser algo más completa que la interfaz del profesor.

Debe permitir:

- crear años
- agregar alumnos
- editar alumnos
- asignar series
- crear series
- eliminar series
- marcar participantes visitantes
- revisar distribución de participantes

Pero debe seguir siendo sencilla.

No convertirla en un panel administrativo gigante.

---

# 38. Diferencia entre administrador y profesor

La aplicación puede tener conceptualmente dos modos:

## Administración previa

Preparar la competencia.

## Carga durante competencia

Interfaz extremadamente simple.

El profesor no necesita acceso a herramientas administrativas.

Si la implementación necesita autenticación, mantenerla lo más simple posible.

No crear un sistema de roles complejo para el MVP.

---

# 39. Diseño visual

El diseño debe ser:

- simple
- limpio
- moderno
- legible
- mobile-first
- con botones grandes
- con poco texto
- con suficiente espacio entre elementos

Evitar:

- menús complejos
- animaciones innecesarias
- dashboards
- gráficos
- exceso de colores
- iconos sin texto cuando puedan generar confusión

Priorizar texto claro sobre decoración.

---

# 40. Navegación

La navegación debe ser predecible.

Flujo principal:

```text
Inicio
  ↓
Seleccionar año
  ↓
Seleccionar serie
  ↓
Cargar tiempos
  ↓
Guardar
  ↓
Siguiente serie
```

Debe existir siempre una forma clara de volver atrás.

Evitar navegación profunda.

IMPORTANTE:

No asumir que después de guardar una serie el profesor necesariamente debe abandonar esa serie.

Puede haber varios profesores trabajando sobre ella simultáneamente.

---

# 41. Estado de una serie

Una serie puede representarse visualmente como:

### Pendiente

```text
⏳ Pendiente
```

### En progreso

```text
🔵 En progreso — 3/5 tiempos
```

### Completada

```text
✅ Completada — 5/5
```

Pero estos estados deben ser derivados de los resultados registrados siempre que sea posible, en lugar de depender de que un profesor pulse manualmente "Finalizar serie".

No bloquear una serie por estar marcada como completada.

Otro profesor debe poder corregir un resultado posteriormente si tiene permisos.

---

# 42. No bloquear series

Una serie NO debe tener un bloqueo del tipo:

```text
Serie 1 está siendo utilizada por Profesor X.
```

No implementar locking exclusivo.

Varios profesores deben poder entrar y editar simultáneamente.

El sistema debe resolver la concurrencia a nivel de registros.

---

# 43. Ejemplo completo de uso

Supongamos:

```text
3° año
40 participantes
8 series
5 participantes por serie
5 profesores
```

Los cinco profesores abren:

```text
3° año → Serie 1
```

Cada uno carga un participante.

Después de unos segundos:

```text
Juan Pérez       18.42
Martín López     17.91
Pedro Gómez      19.03
Lucas Díaz       20.15
Nicolás Ruiz     18.77
```

La serie queda completada.

Los profesores pasan a:

```text
Serie 2
```

y repiten.

Si un participante falta:

```text
Pedro Gómez
☑ No participa
```

Resultado:

```text
4 tiempos válidos
1 ausente
```

Si aparece un participante visitante:

```text
Lucas Díaz
☑ Visitante
18.72
```

Su resultado entra normalmente en el ranking.

Al finalizar las 8 series:

```text
40 participantes preparados
↓
39 participantes con tiempos válidos
↓
Ranking de 3° año
↓
Ranking general
```

---

# 44. Caso con colegio visitante

Supongamos que participan:

- 40 alumnos del colegio organizador.
- 10 alumnos visitantes.

Se pueden agregar participantes visitantes a las series correspondientes.

No crear un sistema paralelo.

Ejemplo:

```text
Serie 9

Juan Pérez       18.42
Martín López     19.01
Lucas visitante  18.15  ☑ Visitante
Pedro Gómez      20.11
```

El ranking general simplemente ordena todos:

```text
1. Lucas visitante   18.15
2. Juan Pérez        18.42
3. Martín López      19.01
...
```

Y el ranking por año también lo incluye según su año.

---

# 45. Objetivo de UX

La aplicación debe cumplir esta prueba:

> Un profesor que nunca utilizó la aplicación recibe un celular y puede cargar una serie sin necesitar una explicación extensa.

El flujo debe poder entenderse intuitivamente:

```text
Elegir año
↓
Elegir serie
↓
Ver nombres
↓
Poner tiempos
↓
Guardar
```

Si el profesor necesita leer documentación para poder utilizar la pantalla de carga, el diseño UX debe considerarse fallido.

---

# 46. Principio de mínima entrada de datos

El profesor que está tomando/cargando tiempos debe introducir la menor cantidad posible de información.

Durante la competencia NO debería tener que introducir:

- año manualmente
- nombre manualmente
- serie manualmente
- carril
- género
- comisión
- colegio visitante como texto
- categoría
- fecha
- prueba

La aplicación debe mostrar los datos previamente preparados.

El profesor principalmente introduce:

> **el tiempo.**

Y excepcionalmente puede marcar:

> **No participa**

o:

> **Visitante**

---

# 47. Prioridad de funcionalidades

## Prioridad crítica

1. Seleccionar año.
2. Seleccionar serie.
3. Mostrar participantes.
4. Cargar tiempos.
5. Marcar "No participa".
6. Marcar "Visitante".
7. Guardar resultados.
8. Ordenar resultados.
9. Ranking por año.
10. Ranking general.
11. Cinco profesores simultáneos.
12. Cinco profesores sobre la misma serie.
13. Actualización en tiempo real.
14. Persistencia de datos.
15. Protección contra pérdida de datos por problemas temporales de conexión.
16. Manejo seguro de concurrencia.

## Prioridad secundaria

17. Agregar/eliminar series.
18. Editar resultados.
19. Importar alumnos desde CSV/Excel.
20. Pantalla pública para TV/proyector.
21. Estados visuales de las series.

## Fuera del MVP

Todo lo demás.

---

# 48. Desarrollo iterativo

No intentar construir toda la aplicación de una sola vez.

Desarrollar en etapas.

## Etapa 1

Crear una interfaz funcional con datos ficticios:

```text
año → serie → participantes → tiempos
```

Sin backend complejo inicialmente.

Probar la UX desde un celular.

## Etapa 2

Conectar Supabase.

Guardar participantes y resultados.

## Etapa 3

Implementar ranking por año.

## Etapa 4

Implementar ranking general.

## Etapa 5

Implementar múltiples dispositivos simultáneos.

## Etapa 6

Implementar Supabase Realtime.

## Etapa 7

Implementar concurrencia y protección contra sobrescrituras.

## Etapa 8

Implementar almacenamiento local/offline.

## Etapa 9

Agregar administración previa.

## Etapa 10

Agregar importación CSV/Excel si resulta necesaria.

## Etapa 11

Pruebas reales y pulido de UX.

---

# 49. Pruebas obligatorias

Antes de utilizar la aplicación en la competencia, probar como mínimo:

## Caso normal

40 participantes, 8 series de 5.

## Ausencias

39 participantes.

## Muchas ausencias

Varias series con menos de 5 participantes.

## Series adicionales

Agregar una Serie 9.

## Serie con más participantes

Probar una serie con más de 5 participantes.

## Colegio visitante

Agregar participantes con:

```text
esColegioVisitante = true
```

Verificar que aparecen normalmente en los rankings.

## Ranking general

Mezclar participantes de 1° a 6° año.

## Empates

Dos o más participantes con el mismo tiempo.

## Corrección

Modificar un tiempo después de haberlo guardado.

## Concurrencia básica

Cinco dispositivos conectados simultáneamente.

## Misma serie

Los cinco dispositivos deben abrir exactamente la misma serie.

## Escritura simultánea

Los cinco dispositivos deben guardar cinco participantes diferentes casi simultáneamente.

Todos los resultados deben conservarse.

## Conflicto

Dos dispositivos deben intentar modificar simultáneamente el mismo participante.

La aplicación debe evitar una sobrescritura silenciosa.

## Actualización

Comprobar que los resultados aparecen en los demás dispositivos sin recargar manualmente.

## Pantalla pública

Comprobar que el ranking se actualiza automáticamente.

## Pérdida de conexión

Desconectar temporalmente un dispositivo y comprobar que los datos pendientes no se pierden.

## Recuperación

Volver a conectar y comprobar que los datos se sincronizan correctamente.

---

# 50. Criterio de éxito

El proyecto será considerado exitoso si:

1. Cinco profesores pueden utilizarlo simultáneamente.
2. Los cinco pueden trabajar sobre la misma serie.
3. Pueden cargar resultados de participantes diferentes simultáneamente.
4. Ningún resultado se pierde por concurrencia normal.
5. Los resultados aparecen en tiempo real.
6. Los profesores pueden utilizarlo desde celulares.
7. Un profesor nuevo puede entenderlo prácticamente sin explicación.
8. Los ausentes pueden marcarse fácilmente.
9. Los visitantes pueden marcarse con un simple checkbox.
10. Las series pueden variar en cantidad y tamaño.
11. El ranking por año se genera automáticamente.
12. El ranking general se genera automáticamente.
13. Los tiempos se ordenan correctamente de menor a mayor.
14. Un tiempo puede corregirse posteriormente.
15. Una pérdida temporal de Internet no provoca pérdida silenciosa de resultados.
16. La aplicación sigue siendo simple y rápida.

---

# 51. Regla final para Claude Code

Antes de agregar cualquier funcionalidad, preguntarse:

> **¿Esto ayuda directamente a que un profesor cargue y ordene los tiempos de la competencia más rápido y con menos errores?**

Si la respuesta es NO:

**No implementarlo en el MVP.**

La aplicación debe ser una herramienta pequeña, rápida, intuitiva y confiable.

No convertirla en un sistema general de gestión de natación.

El objetivo es:

> **Que cinco profesores puedan tomar/cargar tiempos simultáneamente desde sus celulares, que los datos se almacenen de forma segura en la nube y que los resultados se ordenen automáticamente en tiempo real.**
