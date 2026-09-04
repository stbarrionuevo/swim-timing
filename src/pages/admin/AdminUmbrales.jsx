import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCompetition } from '../../context/CompetitionContext'

const TURNOS = [
  { key: 'mañana', label: 'Mañana (3ro a 6to)' },
  { key: 'tarde', label: 'Tarde (3ro a 6to, dos bloques horarios)' },
]

const BLOQUE_LABEL = {
  unico: 'Mañana',
  '3_4': '3° y 4°',
  '5_6': '5° y 6°',
}

export default function AdminUmbrales() {
  const navigate = useNavigate()
  const { getUmbrales, upsertUmbral, generatePreliminarySeries } = useCompetition()

  // { [turno]: { corteAmarilloVerde, corteRojoAmarillo, corteMediaPileta } }
  const [valores, setValores] = useState({})
  const [loading, setLoading] = useState(true)
  const [savingTurno, setSavingTurno] = useState(null)
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
          next[row.turno] = {
            corteAmarilloVerde: String(row.corte_amarillo_verde),
            corteRojoAmarillo: String(row.corte_rojo_amarillo),
            corteMediaPileta: String(row.corte_media_pileta),
          }
        }
        setValores(next)
      })
      .finally(() => activo && setLoading(false))
    return () => {
      activo = false
    }
  }, [getUmbrales])

  function handleChange(turno, campo, value) {
    setValores((prev) => ({
      ...prev,
      [turno]: { ...prev[turno], [campo]: value },
    }))
  }

  async function handleGuardar(turno) {
    const v = valores[turno]
    const amarilloVerde = Number(v?.corteAmarilloVerde)
    const rojoAmarillo = Number(v?.corteRojoAmarillo)
    const mediaPileta = Number(v?.corteMediaPileta)

    if (
      !v?.corteAmarilloVerde ||
      !v?.corteRojoAmarillo ||
      !v?.corteMediaPileta ||
      Number.isNaN(amarilloVerde) ||
      Number.isNaN(rojoAmarillo) ||
      Number.isNaN(mediaPileta)
    ) {
      setToast('Completá los tres tiempos para guardar')
      setTimeout(() => setToast(null), 2500)
      return
    }
    if (!(amarilloVerde < rojoAmarillo && rojoAmarillo < mediaPileta)) {
      setToast('El orden tiene que ser: amarillo/verde < rojo/amarillo < media pileta')
      setTimeout(() => setToast(null), 3000)
      return
    }

    setSavingTurno(turno)
    try {
      await upsertUmbral(turno, amarilloVerde, rojoAmarillo, mediaPileta)
      setToast(`Turno ${turno} guardado`)
    } catch (err) {
      setToast(`Error: ${err.message || err}`)
    } finally {
      setSavingTurno(null)
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

  // Agrupa por turno+bloque (ya no por año — una serie preliminar ahora
  // mezcla los años de ese bloque).
  const resumen = useMemo(() => {
    if (!resultadoPreliminares) return []
    const porTurnoBloque = {}
    for (const s of resultadoPreliminares) {
      const key = `${s.turno}-${s.bloque}`
      porTurnoBloque[key] ??= {
        turno: s.turno,
        bloque: s.bloque,
        media_pileta: 0,
        rojo: 0,
        amarillo: 0,
        verde: 0,
      }
      porTurnoBloque[key][s.color]++
    }
    return Object.values(porTurnoBloque).sort((a, b) =>
      a.turno === b.turno ? a.bloque.localeCompare(b.bloque) : a.turno === 'mañana' ? -1 : 1
    )
  }, [resultadoPreliminares])

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="topbar__back" onClick={() => navigate('/admin')} aria-label="Volver">
          ←
        </button>
        <div>
          <div className="topbar__title">Umbrales de color</div>
          <div className="topbar__subtitle">Cortes de tiempo por turno</div>
        </div>
      </header>

      <main>
        <p className="hint-text" style={{ marginBottom: 'var(--space-4)' }}>
          Los cortes son fijos por turno (mañana / tarde), no por año. Un tiempo mayor al corte
          "media pileta" nada medio largo en vez de 25m completos. Entre ese corte y el de
          rojo/amarillo, rojo. Entre rojo/amarillo y amarillo/verde, amarillo. Un tiempo menor o
          igual al corte amarillo/verde, verde.
        </p>

        {loading ? (
          <div className="empty-state">Cargando...</div>
        ) : (
          <div className="form-card">
            {TURNOS.map(({ key, label }) => (
              <div className="umbral-row" key={key} style={{ flexWrap: 'wrap' }}>
                <div className="umbral-row__year">{label}</div>
                <div className="umbral-row__field">
                  <div className="umbral-row__field-label">VERDE → AMARILLO</div>
                  <input
                    className="field-input"
                    type="number"
                    step="0.01"
                    inputMode="decimal"
                    placeholder="seg"
                    value={valores[key]?.corteAmarilloVerde ?? ''}
                    onChange={(e) => handleChange(key, 'corteAmarilloVerde', e.target.value)}
                  />
                </div>
                <div className="umbral-row__field">
                  <div className="umbral-row__field-label">AMARILLO → ROJO</div>
                  <input
                    className="field-input"
                    type="number"
                    step="0.01"
                    inputMode="decimal"
                    placeholder="seg"
                    value={valores[key]?.corteRojoAmarillo ?? ''}
                    onChange={(e) => handleChange(key, 'corteRojoAmarillo', e.target.value)}
                  />
                </div>
                <div className="umbral-row__field">
                  <div className="umbral-row__field-label">ROJO → MEDIA PILETA</div>
                  <input
                    className="field-input"
                    type="number"
                    step="0.01"
                    inputMode="decimal"
                    placeholder="seg"
                    value={valores[key]?.corteMediaPileta ?? ''}
                    onChange={(e) => handleChange(key, 'corteMediaPileta', e.target.value)}
                  />
                </div>
                <button
                  className="btn btn--ghost"
                  style={{ width: 'auto', minHeight: 44, padding: '0 14px' }}
                  disabled={savingTurno === key}
                  onClick={() => handleGuardar(key)}
                >
                  {savingTurno === key ? '...' : 'Guardar'}
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="section-label">Series preliminares</div>
        <div className="form-card">
          <p className="hint-text" style={{ marginBottom: 'var(--space-3)' }}>
            Agrupa a los alumnos que ya tienen tiempo básico cargado (columna "tiempo" del import) en
            heats de 5 por turno + bloque + color, del más lento al más rápido — mezclando los años
            de ese bloque. Los que no tienen tiempo básico entran en rojo. Corré esto una sola vez,
            después de cargar los umbrales de los 2 turnos.
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
              {resumen.map((r) => (
                <div className="preview-row" key={`${r.turno}-${r.bloque}`}>
                  <div className="preview-row__info">
                    <div className="preview-row__name">
                      {r.turno} · {BLOQUE_LABEL[r.bloque] || r.bloque}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <span className="color-badge color-badge--media-pileta">{r.media_pileta}</span>
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
