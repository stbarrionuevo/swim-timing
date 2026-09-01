import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCompetition } from '../../context/CompetitionContext'

export default function AdminFinales() {
  const navigate = useNavigate()
  const { generateFinalSeries } = useCompetition()

  const [generando, setGenerando] = useState(false)
  const [resultado, setResultado] = useState(null)
  const [error, setError] = useState(null)

  async function handleGenerar() {
    setGenerando(true)
    setError(null)
    try {
      const creadas = await generateFinalSeries()
      setResultado(creadas)
    } catch (err) {
      setError(err.message || String(err))
    } finally {
      setGenerando(false)
    }
  }

  const nuevas = resultado?.filter((r) => !r.omitido) ?? []
  const omitidas = resultado?.filter((r) => r.omitido) ?? []

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="topbar__back" onClick={() => navigate('/admin')} aria-label="Volver">
          ←
        </button>
        <div>
          <div className="topbar__title">Series finales</div>
          <div className="topbar__subtitle">Top 5 por color y año</div>
        </div>
      </header>

      <main>
        <div className="form-card">
          <p className="hint-text" style={{ marginBottom: 'var(--space-4)' }}>
            Toma el tiempo real que nadó cada chico en su serie preliminar (no el tiempo básico del
            Excel) y arma una final por año y color con los 5 más rápidos. Correr esto recién cuando
            todas las series preliminares tengan resultado cargado — si alguna final ya tiene tiempos
            cargados, NO se toca.
          </p>
          <button className="btn btn--accent" disabled={generando} onClick={handleGenerar}>
            {generando ? 'Generando...' : 'Generar series finales'}
          </button>
        </div>

        {error && (
          <div className="form-card" style={{ borderLeft: '4px solid var(--danger)' }}>
            <p style={{ margin: 0, color: 'var(--danger)', fontSize: 13, fontWeight: 600 }}>{error}</p>
          </div>
        )}

        {resultado && (
          <div className="form-card">
            <p className="section-label">Generadas ({nuevas.length})</p>
            {nuevas.length === 0 && <p className="hint-text">Ninguna — revisá si faltan resultados preliminares.</p>}
            {nuevas.map((s, i) => (
              <div className="preview-row" key={i}>
                <div className="preview-row__info">
                  <div className="preview-row__name">{s.year_number}° año</div>
                  <div className="preview-row__meta">{s.cantidad} nadadores</div>
                </div>
                <span className={`color-badge color-badge--${s.color}`}>{s.color}</span>
              </div>
            ))}

            {omitidas.length > 0 && (
              <>
                <p className="section-label" style={{ marginTop: 'var(--space-4)' }}>
                  Omitidas ({omitidas.length})
                </p>
                {omitidas.map((s, i) => (
                  <div className="preview-row" key={i}>
                    <div className="preview-row__info">
                      <div className="preview-row__name">
                        {s.year}° año — {s.color}
                      </div>
                      <div className="preview-row__meta">{s.motivo}</div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
