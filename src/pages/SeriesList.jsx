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

        {seriesList.map((series) => (
          <div key={series.id} style={{ position: 'relative' }}>
            <button
              className="tile"
              onClick={() => navigate(`/turno/${turno}/bloque/${bloque}/serie/${series.id}`)}
            >
              <div>
                <div className="tile__label">
                  Serie {series.seriesNumber}
                  {series.color && (
                    <span
                      className={`color-badge color-badge--${series.color.replace('_', '-')}`}
                      style={{ marginLeft: 8 }}
                    >
                      {series.color}
                    </span>
                  )}
                  {series.tipo === 'final' && (
                    <span className="visitor-tag" style={{ marginLeft: 6 }}>
                      Final
                    </span>
                  )}
                </div>
                <div className="tile__meta">
                  {series.participantCount} participante
                  {series.participantCount !== 1 ? 's' : ''}
                  {series.years.length > 0 && ` · ${series.years.map((y) => `${y}°`).join('/')}`}
                  {series.loadedCount > 0 &&
                    ` · ${series.loadedCount}/${series.activeCount} tiempos`}
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
        ))}

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
