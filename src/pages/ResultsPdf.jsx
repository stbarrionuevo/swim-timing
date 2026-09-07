import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { useCompetition } from '../context/CompetitionContext'
import Icon from '../components/Icon'

const COLOR_LABELS = {
  media_pileta: 'Media pileta',
  rojo: 'Rojo',
  amarillo: 'Amarillo',
  verde: 'Verde',
}

const BLOQUE_LABELS = {
  unico: 'Único',
  '3_4': '3° y 4°',
  '5_6': '5° y 6°',
}

const TURNO_LABELS = {
  mañana: 'Mañana',
  tarde: 'Tarde',
}

export default function ResultsPdf() {
  const navigate = useNavigate()
  const { competition, getRankingGeneral, getSeriesListForBloque, turnos, bloquesPorTurno } =
    useCompetition()
  const [generating, setGenerating] = useState(false)

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
    setGenerating(true)
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })
      const pageWidth = doc.internal.pageSize.getWidth()

      // Header navy, igual a la paleta de Public.jsx.
      doc.setFillColor(11, 42, 61)
      doc.rect(0, 0, pageWidth, 70, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(16)
      doc.text(competition?.name || 'Torneo de natación', 40, 32)

      const fecha = competition?.date
        ? new Date(`${competition.date}T00:00:00`).toLocaleDateString('es-AR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })
        : ''
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      doc.text(`${competition?.event || ''}${fecha ? ' · ' + fecha : ''}`, 40, 50)

      const rows = ranking.map((p, i) => [
        `${i + 1}°`,
        p.name,
        p.year != null ? `${p.year}°` : '—',
        TURNO_LABELS[p.turno] || p.turno || '—',
        BLOQUE_LABELS[p.bloque] || p.bloque || '—',
        COLOR_LABELS[colorBySeriesId.get(p.seriesId)] || '—',
        `${Number(p.result.time).toFixed(2)}s`,
      ])

      autoTable(doc, {
        startY: 90,
        head: [['Puesto', 'Nombre', 'Año', 'Turno', 'Bloque', 'Color', 'Tiempo']],
        body: rows,
        theme: 'striped',
        headStyles: { fillColor: [11, 42, 61], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [241, 245, 247] },
        styles: { fontSize: 9, cellPadding: 6, textColor: [27, 27, 27] },
        columnStyles: {
          0: { cellWidth: 45, halign: 'center' },
          6: { cellWidth: 60, halign: 'right', textColor: [255, 90, 31], fontStyle: 'bold' },
        },
        margin: { left: 40, right: 40 },
      })

      const fechaArchivo = competition?.date || new Date().toISOString().slice(0, 10)
      doc.save(`resultados-${fechaArchivo}.pdf`)
    } finally {
      setGenerating(false)
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
            Se descarga un PDF prolijo con el ranking general completo, listo para compartir o
            imprimir: puesto, nombre, año, turno, bloque, color y tiempo de cada nadador.
          </p>
          <button
            className="btn btn--accent"
            onClick={handleDownload}
            disabled={generating || ranking.length === 0}
            style={{ width: '100%' }}
          >
            <Icon name="download" /> {generating ? 'Generando…' : `Descargar PDF (${ranking.length})`}
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
