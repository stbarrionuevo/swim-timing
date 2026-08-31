import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCompetition } from '../../context/CompetitionContext'
import { assignColor } from '../../services/seedingService'

// Columnas esperadas en el Excel (case-insensible): nombre, año/year,
// tiempo/tiempo_basico, visitante. Mismo criterio flexible que el import
// principal de alumnos.
function normalizarHeader(h) {
  return String(h || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // saca tildes: "año" -> "ano"
}

function parseFilas(sheetRows) {
  return sheetRows
    .map((row) => {
      const entries = Object.entries(row).reduce((acc, [k, v]) => {
        acc[normalizarHeader(k)] = v
        return acc
      }, {})
      const nombre = String(entries.nombre ?? entries.alumno ?? '').trim()
      const year_number = Number(entries.ano ?? entries.anio ?? entries.year ?? entries.grado)
      const tiempo_basico = Number(entries.tiempo ?? entries.tiempo_basico ?? entries.tiempobasico)
      const visitanteRaw = entries.visitante
      const es_colegio_visitante =
        visitanteRaw === true ||
        String(visitanteRaw ?? '').trim().toLowerCase() === 'si' ||
        String(visitanteRaw ?? '').trim().toLowerCase() === 'sí' ||
        String(visitanteRaw ?? '').trim().toLowerCase() === 'true'
      return { nombre, year_number, tiempo_basico, es_colegio_visitante }
    })
    .filter((r) => r.nombre)
}

export default function AdminImportBasicos() {
  const navigate = useNavigate()
  const { getUmbrales, importBaselineTimes, generatePreliminarySeries } = useCompetition()

  const [rows, setRows] = useState([])
  const [umbrales, setUmbrales] = useState({})
  const [fileName, setFileName] = useState('')
  const [step, setStep] = useState('elegir') // elegir | preview | generando | listo
  const [error, setError] = useState(null)
  const [resultado, setResultado] = useState(null)

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    setFileName(file.name)

    try {
      // Import dinámico: mismo criterio que el resto del proyecto, para
      // que xlsx no se cargue en el bundle de los profes que solo cronometran.
      const XLSX = await import('xlsx')
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: 'array' })
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
      const sheetRows = XLSX.utils.sheet_to_json(firstSheet, { defval: '' })
      const parsed = parseFilas(sheetRows)

      const invalidas = parsed.filter(
        (r) => !r.year_number || r.year_number < 1 || r.year_number > 6 || !r.tiempo_basico || r.tiempo_basico <= 0
      )
      if (invalidas.length > 0) {
        setError(
          `${invalidas.length} fila(s) con año o tiempo inválido (revisá que las columnas se llamen "nombre", "año" y "tiempo"). Se muestran igual, pero corregí el Excel antes de confirmar.`
        )
      }

      const umbralesRows = await getUmbrales()
      const umbralesPorAnio = Object.fromEntries(umbralesRows.map((u) => [u.year_number, u]))

      setUmbrales(umbralesPorAnio)
      setRows(parsed)
      setStep('preview')
    } catch (err) {
      setError(`No se pudo leer el archivo: ${err.message || err}`)
    }
  }

  const preview = useMemo(
    () =>
      rows.map((r) => ({
        ...r,
        color: assignColor(r.tiempo_basico || null, umbrales[r.year_number]),
      })),
    [rows, umbrales]
  )

  const conteoPorColor = useMemo(() => {
    const c = { rojo: 0, amarillo: 0, verde: 0 }
    for (const p of preview) c[p.color]++
    return c
  }, [preview])

  async function handleConfirmar() {
    setStep('generando')
    setError(null)
    try {
      const { participantesPorAnio, resumen } = await importBaselineTimes(rows)
      const seriesCreadas = await generatePreliminarySeries(participantesPorAnio)
      setResultado({ resumen, cantidadSeries: seriesCreadas.length })
      setStep('listo')
    } catch (err) {
      setError(`Error al generar: ${err.message || err}`)
      setStep('preview')
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="topbar__back" onClick={() => navigate('/admin')} aria-label="Volver">
          ←
        </button>
        <div>
          <div className="topbar__title">Importar tiempos básicos</div>
          <div className="topbar__subtitle">Ronda preliminar por color</div>
        </div>
      </header>

      <main>
        {step === 'elegir' && (
          <div className="form-card">
            <p className="hint-text" style={{ marginBottom: 'var(--space-3)' }}>
              Excel con columnas: <strong>nombre</strong>, <strong>año</strong> (1 a 6),{' '}
              <strong>tiempo</strong> (segundos), <strong>visitante</strong> (opcional).
            </p>
            <label className="btn btn--accent" style={{ cursor: 'pointer' }}>
              <i className="fa-solid fa-file-arrow-up" aria-hidden="true" />
              Elegir archivo
              <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} style={{ display: 'none' }} />
            </label>
          </div>
        )}

        {error && (
          <div className="form-card" style={{ borderLeft: '4px solid var(--danger)' }}>
            <p style={{ margin: 0, color: 'var(--danger)', fontSize: 13, fontWeight: 600 }}>{error}</p>
          </div>
        )}

        {(step === 'preview' || step === 'generando') && (
          <>
            <p className="hint-text">{fileName}</p>

            <div className="summary-strip">
              <div className="summary-strip__item">
                <div className="summary-strip__count" style={{ color: '#b23434' }}>
                  {conteoPorColor.rojo}
                </div>
                <div className="summary-strip__label">Rojo</div>
              </div>
              <div className="summary-strip__item">
                <div className="summary-strip__count" style={{ color: '#a06c00' }}>
                  {conteoPorColor.amarillo}
                </div>
                <div className="summary-strip__label">Amarillo</div>
              </div>
              <div className="summary-strip__item">
                <div className="summary-strip__count" style={{ color: 'var(--success)' }}>
                  {conteoPorColor.verde}
                </div>
                <div className="summary-strip__label">Verde</div>
              </div>
            </div>

            <div className="form-card">
              {preview.map((p, i) => (
                <div className="preview-row" key={i}>
                  <div className="preview-row__info">
                    <div className="preview-row__name">{p.nombre}</div>
                    <div className="preview-row__meta">
                      {p.year_number ? `${p.year_number}° año` : 'año inválido'} ·{' '}
                      {p.tiempo_basico ? `${p.tiempo_basico}s` : 'sin tiempo'}
                      {p.es_colegio_visitante ? ' · Visitante' : ''}
                    </div>
                  </div>
                  <span className={`color-badge color-badge--${p.color}`}>{p.color}</span>
                </div>
              ))}
            </div>

            <button
              className="btn btn--accent"
              disabled={step === 'generando'}
              onClick={handleConfirmar}
            >
              {step === 'generando' ? 'Generando series...' : `Confirmar e importar (${preview.length})`}
            </button>
          </>
        )}

        {step === 'listo' && resultado && (
          <div className="form-card">
            <p style={{ fontWeight: 700, marginBottom: 8 }}>Listo ✅</p>
            <p className="hint-text">
              {resultado.resumen.actualizados} alumnos actualizados, {resultado.resumen.creados} creados.
            </p>
            <p className="hint-text">{resultado.cantidadSeries} series preliminares generadas.</p>
            {resultado.resumen.errores.length > 0 && (
              <p className="hint-text" style={{ color: 'var(--danger)' }}>
                {resultado.resumen.errores.length} error(es) — revisá la consola.
              </p>
            )}
            <button className="btn btn--primary" style={{ marginTop: 12 }} onClick={() => navigate('/admin')}>
              Volver a administración
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
