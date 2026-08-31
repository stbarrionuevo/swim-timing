import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCompetition } from '../../context/CompetitionContext'

const YEARS = [1, 2, 3, 4, 5, 6]

export default function AdminUmbrales() {
  const navigate = useNavigate()
  const { getUmbrales, upsertUmbral } = useCompetition()

  // { [year]: { corteRojoAmarillo, corteAmarilloVerde } }
  const [valores, setValores] = useState({})
  const [loading, setLoading] = useState(true)
  const [savingYear, setSavingYear] = useState(null)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    let activo = true
    getUmbrales()
      .then((rows) => {
        if (!activo) return
        const next = {}
        for (const row of rows) {
          next[row.year_number] = {
            corteRojoAmarillo: String(row.corte_rojo_amarillo),
            corteAmarilloVerde: String(row.corte_amarillo_verde),
          }
        }
        setValores(next)
      })
      .finally(() => activo && setLoading(false))
    return () => {
      activo = false
    }
  }, [getUmbrales])

  function handleChange(year, campo, value) {
    setValores((prev) => ({
      ...prev,
      [year]: { ...prev[year], [campo]: value },
    }))
  }

  async function handleGuardar(year) {
    const v = valores[year]
    const rojoAmarillo = Number(v?.corteRojoAmarillo)
    const amarilloVerde = Number(v?.corteAmarilloVerde)

    if (!v?.corteRojoAmarillo || !v?.corteAmarilloVerde || Number.isNaN(rojoAmarillo) || Number.isNaN(amarilloVerde)) {
      setToast('Completá los dos tiempos para guardar')
      setTimeout(() => setToast(null), 2500)
      return
    }
    if (rojoAmarillo >= amarilloVerde) {
      setToast('El corte rojo/amarillo debe ser menor que el amarillo/verde')
      setTimeout(() => setToast(null), 3000)
      return
    }

    setSavingYear(year)
    try {
      await upsertUmbral(year, rojoAmarillo, amarilloVerde)
      setToast(`${year}° año guardado`)
    } catch (err) {
      setToast(`Error: ${err.message || err}`)
    } finally {
      setSavingYear(null)
      setTimeout(() => setToast(null), 2000)
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="topbar__back" onClick={() => navigate('/admin')} aria-label="Volver">
          ←
        </button>
        <div>
          <div className="topbar__title">Umbrales de color</div>
          <div className="topbar__subtitle">Cortes de tiempo por año</div>
        </div>
      </header>

      <main>
        <p className="hint-text" style={{ marginBottom: 'var(--space-4)' }}>
          Un tiempo mayor al corte "rojo/amarillo" queda en rojo. Entre los dos cortes, amarillo.
          Un tiempo menor o igual al corte "amarillo/verde" queda en verde.
        </p>

        {loading ? (
          <div className="empty-state">Cargando...</div>
        ) : (
          <div className="form-card">
            {YEARS.map((year) => (
              <div className="umbral-row" key={year}>
                <div className="umbral-row__year">{year}°</div>
                <div className="umbral-row__field">
                  <div className="umbral-row__field-label">ROJO → AMARILLO</div>
                  <input
                    className="field-input"
                    type="number"
                    step="0.01"
                    inputMode="decimal"
                    placeholder="seg"
                    value={valores[year]?.corteRojoAmarillo ?? ''}
                    onChange={(e) => handleChange(year, 'corteRojoAmarillo', e.target.value)}
                  />
                </div>
                <div className="umbral-row__field">
                  <div className="umbral-row__field-label">AMARILLO → VERDE</div>
                  <input
                    className="field-input"
                    type="number"
                    step="0.01"
                    inputMode="decimal"
                    placeholder="seg"
                    value={valores[year]?.corteAmarilloVerde ?? ''}
                    onChange={(e) => handleChange(year, 'corteAmarilloVerde', e.target.value)}
                  />
                </div>
                <button
                  className="btn btn--ghost"
                  style={{ width: 'auto', minHeight: 44, padding: '0 14px' }}
                  disabled={savingYear === year}
                  onClick={() => handleGuardar(year)}
                >
                  {savingYear === year ? '...' : 'Guardar'}
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
