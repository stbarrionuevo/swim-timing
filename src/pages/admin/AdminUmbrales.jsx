import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCompetition } from '../../context/CompetitionContext'

const YEARS = [1, 2, 3, 4, 5, 6]

export default function AdminUmbrales() {
  const navigate = useNavigate()
  const { getUmbrales, upsertUmbral, generatePreliminarySeries } = useCompetition()

  // { [year]: { corteRojoAmarillo, corteAmarilloVerde } }
  const [valores, setValores] = useState({})
  const [loading, setLoading] = useState(true)
  const [savingYear, setSavingYear] = useState(null)
  const [toast, setToast] = useState(null)

  const [generando, setGenerando] = useState(false)
  const [resultadoPreliminares, setResultadoPreliminares] = useState(null)
  const [errorPreliminares, setErrorPreliminares] = useState(null)

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

  async function handleGenerarPreliminares() {
    setGenerando(true)
    setErrorPreliminares(null)
    try {
      const creadas = await generatePreliminarySeries()
      setResultadoPreliminares(creadas)
    } catch (err) {
      setErrorPreliminares(err.message || String(err))
    } finally {
      setGenerando(false)
    }
  }

  const resumenPorAnio = useMemo(() => {
    if (!resultadoPreliminares) return []
    const porAnio = {}
    for (const s of resultadoPreliminares) {
      if (!porAnio[s.year_number]) porAnio[s.year_number] = { rojo: 0, amarillo: 0, verde: 0 }
      porAnio[s.year_number][s.color]++
    }
    return Object.entries(porAnio)
      .map(([year, colores]) => ({ year: Number(year), ...colores }))
      .sort((a, b) => a.year - b.year)
  }, [resultadoPreliminares])

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

        <div className="section-label">Series preliminares</div>
        <div className="form-card">
          <p className="hint-text" style={{ marginBottom: 'var(--space-3)' }}>
            Agrupa a los alumnos que ya tienen tiempo básico cargado en
            series de 5 por color, del más lento al más rápido. Los que no tienen tiempo básico entran
            en rojo. Correr esto UNA SOLA vez, después de cargar los umbrales de los 6 años.
          </p>
          <button className="btn btn--accent" disabled={generando} onClick={handleGenerarPreliminares}>
            {generando ? 'Generando...' : 'Generar series preliminares'}
          </button>

          {errorPreliminares && (
            <p className="hint-text" style={{ color: 'var(--danger)', marginTop: 8 }}>
              {errorPreliminares}
            </p>
          )}

          {resultadoPreliminares && (
            <div style={{ marginTop: 'var(--space-4)' }}>
              <p className="hint-text" style={{ marginBottom: 8 }}>
                {resultadoPreliminares.length} series creadas.
              </p>
              {resumenPorAnio.map((r) => (
                <div className="preview-row" key={r.year}>
                  <div className="preview-row__info">
                    <div className="preview-row__name">{r.year}° año</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <span className="color-badge color-badge--rojo">{r.rojo}</span>
                    <span className="color-badge color-badge--amarillo">{r.amarillo}</span>
                    <span className="color-badge color-badge--verde">{r.verde}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
