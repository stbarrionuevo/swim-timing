
export const COMPETITION = {
  id: 'comp-1',
  name: 'Competencia de Natación 2026',
  date: '2026-09-10',
  event: '25 m Crol',
}

export const YEARS = [1, 2, 3, 4, 5, 6]

// Genera participantes ficticios: ~40 por año, en series de ~5.
function buildMockParticipants() {
  const firstNames = [
    'Juan', 'Martín', 'Pedro', 'Lucas', 'Nicolás', 'Tomás', 'Santiago',
    'Facundo', 'Agustín', 'Bautista', 'Valentín', 'Ignacio', 'Joaquín',
    'Benjamín', 'Franco', 'Mateo', 'Emiliano', 'Bruno', 'Ramiro', 'Simón',
  ]
  const lastNames = [
    'Pérez', 'López', 'Gómez', 'Díaz', 'Ruiz', 'Fernández', 'García',
    'Martínez', 'Sánchez', 'Romero', 'Torres', 'Flores', 'Acosta', 'Molina',
  ]

  let idCounter = 1
  const participants = []

  YEARS.forEach((year) => {
    const count = 38 + (year % 5) // ~38-42 por año, determinístico
    const perSerie = 5
    const seriesCount = Math.ceil(count / perSerie)

    for (let i = 0; i < count; i++) {
      const serieNumber = Math.floor(i / perSerie) + 1
      const name = `${firstNames[(idCounter + i) % firstNames.length]} ${
        lastNames[(idCounter * 3 + i) % lastNames.length]
      }`
      participants.push({
        id: `p-${idCounter}`,
        competitionId: COMPETITION.id,
        year,
        series: serieNumber,
        name,
        esColegioVisitante: false,
        participa: true,
  
        result: {
          time: null, // null = todavía no cargado
          updatedAt: null,
        },
      })
      idCounter++
    }


    const visitorCount = year % 2 === 0 ? 1 : 0
    for (let v = 0; v < visitorCount; v++) {
      participants.push({
        id: `p-${idCounter}`,
        competitionId: COMPETITION.id,
        year,
        series: seriesCount,
        name: `${firstNames[(idCounter + 7) % firstNames.length]} ${
          lastNames[(idCounter + 2) % lastNames.length]
        } (visitante)`,
        esColegioVisitante: true,
        participa: true,
        result: { time: null, updatedAt: null },
      })
      idCounter++
    }
  })

  return participants
}

export const MOCK_PARTICIPANTS = buildMockParticipants()
