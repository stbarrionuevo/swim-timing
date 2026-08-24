import { createClient } from '@supabase/supabase-js'

const url = process.env.VITE_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  console.error(
    ' Faltan variables de entorno. Necesitás VITE_SUPABASE_URL y ' +
      'SUPABASE_SERVICE_ROLE_KEY en tu .env, y correr el script con ' +
      '`node --env-file=.env scripts/init.mjs`.'
  )
  process.exit(1)
}

const supabase = createClient(url, serviceKey)

async function main() {
  const { data: existing, error: checkError } = await supabase
    .from('competitions')
    .select('id, name')
    .limit(1)
  if (checkError) throw checkError

  if (existing?.length) {
    console.log(`  Ya existe una competencia ("${existing[0].name}"), no se crea otra.`)
    console.log(`   id: ${existing[0].id}`)
    return
  }

  const { data, error } = await supabase
    .from('competitions')
    .insert({
      name: process.env.COMPETITION_NAME || 'Competencia de Natación',
      event: process.env.COMPETITION_EVENT || '25 m Crol',
      date: process.env.COMPETITION_DATE || new Date().toISOString().slice(0, 10),
    })
    .select()
    .single()
  if (error) throw error

  console.log(' Competencia creada (vacía, sin alumnos):')
  console.log(`   ${data.name} — ${data.event} — ${data.date}`)
  console.log(`   id: ${data.id}`)
  console.log('   Ahora podés cargar el plantel real desde /admin o importando un CSV/Excel.')
}

main().catch((err) => {
  console.error(' Error:', err.message || err)
  process.exit(1)
})
