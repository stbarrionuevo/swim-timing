

import { createClient } from '@supabase/supabase-js'
import { COMPETITION, MOCK_PARTICIPANTS } from '../src/data/mockData.js'

const url = process.env.VITE_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  console.error(
    '❌ Faltan variables de entorno. Necesitás VITE_SUPABASE_URL y ' +
      'SUPABASE_SERVICE_ROLE_KEY en tu .env, y correr el script con ' +
      '`node --env-file=.env scripts/seed.mjs`.'
  )
  process.exit(1)
}

const supabase = createClient(url, serviceKey)

async function main() {
  console.log('Borrando competencia existente (si había)…')
  const { data: existing } = await supabase.from('competitions').select('id')
  if (existing?.length) {
    const ids = existing.map((c) => c.id)
    const { error } = await supabase.from('competitions').delete().in('id', ids)
    if (error) throw error
  }

  console.log(' Creando competencia…')
  const { data: competition, error: competitionError } = await supabase
    .from('competitions')
    .insert({ name: COMPETITION.name, event: COMPETITION.event, date: COMPETITION.date })
    .select()
    .single()
  if (competitionError) throw competitionError

  console.log('Creando series…')
  const seriesKeys = [
    ...new Set(MOCK_PARTICIPANTS.map((p) => `${p.year}-${p.series}`)),
  ].map((key) => {
    const [year, seriesNumber] = key.split('-').map(Number)
    return { year, seriesNumber }
  })

  const seriesToInsert = seriesKeys.map((s) => ({
    competition_id: competition.id,
    year_number: s.year,
    series_number: s.seriesNumber,
  }))

  const { data: insertedSeries, error: seriesError } = await supabase
    .from('series')
    .insert(seriesToInsert)
    .select()
  if (seriesError) throw seriesError

  const seriesIdByKey = new Map(
    insertedSeries.map((s) => [`${s.year_number}-${s.series_number}`, s.id])
  )

  console.log(` Creando ${MOCK_PARTICIPANTS.length} participantes…`)
  const participantsToInsert = MOCK_PARTICIPANTS.map((p) => ({
    competition_id: competition.id,
    series_id: seriesIdByKey.get(`${p.year}-${p.series}`),
    name: p.name,
    es_colegio_visitante: p.esColegioVisitante,
    participa: p.participa,
  }))

 
  const chunkSize = 100
  for (let i = 0; i < participantsToInsert.length; i += chunkSize) {
    const chunk = participantsToInsert.slice(i, i + chunkSize)
    const { error } = await supabase.from('participants').insert(chunk)
    if (error) throw error
  }

  console.log('- Listo.')
  console.log(`   Competencia: ${competition.name} (${competition.id})`)
  console.log(`   Series: ${insertedSeries.length}`)
  console.log(`   Participantes: ${participantsToInsert.length}`)
}

main().catch((err) => {
  console.error('- Error al sembrar datos:', err.message || err)
  process.exit(1)
})
