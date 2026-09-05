import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useCompetition } from '../context/CompetitionContext'
import TopBar from '../components/TopBar'
import StatusBadge from '../components/StatusBadge'
import Icon from '../components/Icon'

const BLOQUE_TITLE = {
  unico: 'Mañana — 3° a 6°',
  '3_4': 'Tarde — 3° y 4°',
  '5_6': 'Tarde — 5° y 6°',
}

const YEARS_FOR_BLOQUE = {
  unico: [3, 4, 5, 6],
  '3_4': [3, 4],
  '5_6': [5, 6],
}

const SERIES_TYPE_LABEL = {
  preliminar: 'Preliminar',
  final: 'Final',
}

const SERIES_COLOR_CLASS = {
  media_pileta: 'series-card--media-pileta',
  rojo: 'series-card--rojo',
  amarillo: 'series-card--amarillo',
  verde: 'series-card--verde',
}

function getSeriesColorClass(series) {
  if (series.tipo === 'normal') return 'series-card--none'
  return SERIES_COLOR_CLASS[series.color] || 'series-card--none'
}

function formatSeriesYears(years, bloque) {
  const presentYears = [...new Set((years || []).filter((year) => Number.isInteger(year)))].sort(
    (a, b) => a - b
  )
  if (presentYears.length === 0) return null

  const expectedYears = YEARS_FOR_BLOQUE[bloque] || []
  const isExpectedSet =
    presentYears.length === expectedYears.length &&
    presentYears.every((year, index) => year === expectedYears[index]) &&
    presentYears.every((year, index) => index === 0 || year === presentYears[index - 1] + 1)

  return presentYears.map((year) => `${year}°`).join(isExpectedSet ? '-' : '/')
}

export default function SeriesList() {
  const { turno, bloque } = useParams()
  const navigate = useNavigate()
  const { getSeriesListForBloque, addSeries, deleteSeries } = useCompetition()
  const [adding, setAdding] = useState(false)
  const [pendingDelete, setPendingDelete] = useState(null)

  const seriesList = getSeriesListForBloque(turno, bloque)
  const nextSeriesNumber =
    seriesList.length === 0 ? 1 : Math.max(...seriesList.map((s) => s.seriesNumber)) + 1

  async function handleAdd() {
    setAdding(true)
    try {
      await addSeries(turno, bloque, nextSeriesNumber)
    } finally {
      setAdding(false)
    }
  }

  function requestDelete(series) {
    setPendingDelete(series)
  }

  return (
    <div className="app-shell">
      <TopBar title={BLOQUE_TITLE[bloque] || bloque} subtitle="Seleccioná la serie" backTo="/" />
      <main>
        {seriesList.length === 0 && (
          <div className="empty-state">Todavía no hay series para este bloque.</div>
        )}

        {seriesList.map((series) => {
          const yearsLabel = formatSeriesYears(series.years, bloque)

          return (
            <div key={series.id} style={{ position: 'relative' }}>
              <button
                className={`tile series-card ${getSeriesColorClass(series)}`}
                onClick={() => navigate(`/turno/${turno}/bloque/${bloque}/serie/${series.id}`)}
              >
                <div className="series-card__info">
                  <div className="series-card__label-row">
                    <span className="tile__label">Serie {series.seriesNumber}</span>
                    {series.tipo !== 'normal' && SERIES_TYPE_LABEL[series.tipo] && (
                      <span className="series-type-badge">{SERIES_TYPE_LABEL[series.tipo]}</span>
                    )}
                  </div>
                  <div className="series-card__meta-row">
                    {yearsLabel && <span className="series-years-badge">{yearsLabel}</span>}
                    <span className="tile__meta">
                      {series.participantCount} participante
                      {series.participantCount !== 1 ? 's' : ''}
                      {series.loadedCount > 0 &&
                        ` · ${series.loadedCount}/${series.activeCount} tiempos`}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <StatusBadge status={series.status} />
                  <span className="tile__chevron"><Icon name="chevron-right" /></span>
                </div>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  requestDelete(series)
                }}
                aria-label={`Eliminar serie ${series.seriesNumber}`}
                style={{
                  position: 'absolute',
                  top: 10,
                  right: 10,
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--muted)',
                  fontSize: 13,
                  padding: 6,
                }}
              >
                Eliminar
              </button>
            </div>
          )
        })}

        <div style={{ height: 68 }} />
      </main>

      <button
        className="fab"
        onClick={handleAdd}
        disabled={adding}
        aria-label={`Agregar serie ${nextSeriesNumber}`}
      >
        {adding ? <Icon name="spinner" className="fa-spin" /> : <Icon name="plus" />}
      </button>

      {pendingDelete && (
        <ConfirmDeleteSeries
          series={pendingDelete}
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => {
            deleteSeries(pendingDelete.id)
            setPendingDelete(null)
          }}
        />
      )}
    </div>
  )
}

function ConfirmDeleteSeries({ series, onCancel, onConfirm }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15,39,51,0.45)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        zIndex: 50,
      }}
      onClick={onCancel}
    >
      <div
        style={{
          background: 'var(--surface)',
          borderRadius: '20px 20px 0 0',
          padding: '24px 20px',
          width: '100%',
          maxWidth: 480,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 6 }}>
          <Icon name="triangle-exclamation" /> ¿Eliminar Serie {series.seriesNumber}?
        </div>
        <p style={{ color: 'var(--ink-soft)', fontSize: 14, marginBottom: 20 }}>
          {series.loadedCount > 0
            ? `Tiene ${series.loadedCount} tiempo${series.loadedCount !== 1 ? 's' : ''} registrado${series.loadedCount !== 1 ? 's' : ''}. Si la eliminás, esos resultados se pierden.`
            : `Esta serie tiene ${series.participantCount} participante${series.participantCount !== 1 ? 's' : ''} asignado${series.participantCount !== 1 ? 's' : ''}.`}
          {' '}Esta acción no se puede deshacer.
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn--ghost" onClick={onCancel}>
            Cancelar
          </button>
          <button className="btn btn--danger" onClick={onConfirm}>
            Eliminar
          </button>
        </div>
      </div>
    </div>
  )
}
