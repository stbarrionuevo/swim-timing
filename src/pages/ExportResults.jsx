import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCompetition } from '../context/CompetitionContext'
import Icon from '../components/Icon'

const COLOR_LABELS = {
  media_pileta: 'Media pileta',
  rojo: 'Rojo',
  amarillo: 'Amarillo',
  verde: 'Verde',
}

function csvEscape(value) {
  const s = String(value ?? '')
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export default function ExportResults() {
  const navigate = useNavigate()
  const { competition, getRankingGeneral, getSeriesListForBloque, turnos, bloquesPorTurno } =
    useCompetition()
  const [downloading, setDownloading] = useState(false)

  // Mismo criterio que Public.jsx/SearchResults.jsx: el color se lee de la
  // serie ya sembrada, nunca se recalcula un umbral acá.
  const colorBySeriesId = useMemo(() => {
    const map = new Map()
    for (const turno of turnos || []) {
      for (const bloque of bloquesPorTurno?.[turno] || []) {
        for (const series of getSeriesListForBloque(turno, bloque) || []) {
          if (series.color) map.set(series.id, series.color)
        }
      }
    }
    return map
  }, [turnos, bloquesPorTurno, getSeriesListForBloque])

  const ranking = getRankingGeneral()

  function handleDownload() {
    setDownloading(true)
    try {
      const header = ['Puesto', 'Nombre', 'Año', 'Turno', 'Bloque', 'Color', 'Tiempo (s)']
      const rows = ranking.map((p, i) => [
        i + 1,
        p.name,
        p.year ?? '',
        p.turno ?? '',
        p.bloque ?? '',
        COLOR_LABELS[colorBySeriesId.get(p.seriesId)] || '',
        Number(p.result.time).toFixed(2),
      ])
      const csv = [header, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n')
      // BOM (\uFEFF) para que Excel abra los acentos bien en Windows.
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const fecha = competition?.date || new Date().toISOString().slice(0, 10)
      a.href = url
      a.download = `resultados-${fecha}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="public-view">
      <header className="public-header" style={{ alignItems: 'flex-start', textAlign: 'left' }}>
        <button
          type="button"
          onClick={() => navigate('/publico')}
          aria-label="Volver"
          style={{
            background: 'var(--color-navy-mid)',
            border: 'none',
            borderRadius: 10,
            width: 36,
            height: 36,
            color: '#fff',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="chevron-left" />
        </button>
        <h1 className="public-header__title" style={{ textTransform: 'uppercase' }}>
          Descargar resultados
        </h1>
        <p className="public-header__subtitle">
          {ranking.length} resultado{ranking.length !== 1 ? 's' : ''} cargado
          {ranking.length !== 1 ? 's' : ''} — todos los turnos y bloques
        </p>
      </header>

      <main className="public-content">
        <div style={{ background: 'var(--surface-white)', borderRadius: 16, padding: 20, textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 16 }}>
            Se descarga un archivo CSV (se abre con Excel o Google Sheets) con el ranking general
            completo: nombre, año, turno, bloque, color y tiempo de cada nadador.
          </p>
          <button
            className="btn btn--accent"
            onClick={handleDownload}
            disabled={downloading || ranking.length === 0}
            style={{ width: '100%' }}
          >
            <Icon name="download" /> {downloading ? 'Generando…' : `Descargar CSV (${ranking.length})`}
          </button>
          {ranking.length === 0 && (
            <p style={{ color: 'var(--text-disabled)', fontSize: 12, marginTop: 10 }}>
              Todavía no hay tiempos cargados.
            </p>
          )}
        </div>
      </main>
    </div>
  )
}
