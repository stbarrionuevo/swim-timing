import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCompetition } from '../../context/CompetitionContext'
import TopBar from '../../components/TopBar'
import Icon from '../../components/Icon'

// Encabezados aceptados (probamos varias variantes en minúscula/sin
// tildes, porque no todos van a exportar la planilla con el mismo
// nombre de columna).
const HEADER_ALIASES = {
  name: ['nombre', 'name', 'alumno', 'apellido y nombre'],
  year: ['año', 'anio', 'year', 'grado', 'curso'],
  series: ['serie', 'series', 'heat'],
  visitor: ['visitante', 'visitor', 'colegio visitante', 'invitado'],
}

function normalizeHeader(h) {
  return String(h || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // saca tildes
}

function findColumn(headers, aliases) {
  const normalized = headers.map(normalizeHeader)
  for (const alias of aliases) {
    const idx = normalized.indexOf(normalizeHeader(alias))
    if (idx !== -1) return idx
  }
  return -1
}

function parseVisitor(value) {
  const v = normalizeHeader(value)
  return ['si', 'sí', 'true', '1', 'x', 'yes'].includes(v)
}

function parseRows(XLSX, worksheet) {
  const raw = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' })
  if (raw.length === 0) return { rows: [], columnsFound: {} }

  const headers = raw[0]
  const nameCol = findColumn(headers, HEADER_ALIASES.name)
  const yearCol = findColumn(headers, HEADER_ALIASES.year)
  const seriesCol = findColumn(headers, HEADER_ALIASES.series)
  const visitorCol = findColumn(headers, HEADER_ALIASES.visitor)

  const rows = raw.slice(1).map((cells, i) => {
    const name = nameCol !== -1 ? String(cells[nameCol] || '').trim() : ''
    const yearRaw = yearCol !== -1 ? String(cells[yearCol] || '').trim() : ''
    const seriesRaw = seriesCol !== -1 ? String(cells[seriesCol] || '').trim() : ''
    const visitor = visitorCol !== -1 ? parseVisitor(cells[visitorCol]) : false

    const year = Number(yearRaw.replace(/[^\d]/g, ''))
    const seriesNumber = seriesRaw ? Number(seriesRaw.replace(/[^\d]/g, '')) : null

    const errors = []
    if (!name) errors.push('Falta el nombre')
    if (!year || year < 1 || year > 6) errors.push('Año inválido (debe ser 1-6)')
    if (seriesRaw && (!seriesNumber || seriesNumber < 1)) errors.push('Serie inválida')

    return {
      rowNumber: i + 2, // +2: fila 1 es encabezado, y las planillas empiezan en 1
      name,
      year,
      seriesNumber: seriesNumber || 1, // si no viene serie, van todos a la serie 1 (se puede reordenar después desde /admin)
      esColegioVisitante: visitor,
      errors,
    }
  })

  return {
    rows: rows.filter((r) => r.name || r.year), // ignora filas totalmente vacías
    columnsFound: { nameCol, yearCol, seriesCol, visitorCol },
  }
}

export default function AdminImport() {
  const { importParticipants } = useCompetition()
  const navigate = useNavigate()
  const [parsed, setParsed] = useState(null) // { rows, columnsFound }
  const [fileName, setFileName] = useState('')
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState(null)
  const [parseError, setParseError] = useState('')

  function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setResult(null)
    setParseError('')

    const reader = new FileReader()
    reader.onload = async (evt) => {
      try {
        // Import dinámico: `xlsx` pesa bastante y sólo hace falta acá, no
        // en el flujo principal de carga de tiempos que usan los 5
        // profesores — que no tiene por qué descargarlo.
        const XLSX = await import('xlsx')
        const workbook = XLSX.read(evt.target.result, { type: 'binary' })
        const sheet = workbook.Sheets[workbook.SheetNames[0]]
        const { rows, columnsFound } = parseRows(XLSX, sheet)
        if (columnsFound.nameCol === -1 || columnsFound.yearCol === -1) {
          setParseError(
            'No encontré columnas de "nombre" y "año" en el archivo. Revisá los encabezados de la primera fila.'
          )
          setParsed(null)
          return
        }
        setParsed({ rows, columnsFound })
      } catch {
        setParseError('No se pudo leer el archivo. ¿Es un .csv, .xlsx o .xls válido?')
        setParsed(null)
      }
    }
    reader.readAsBinaryString(file)
  }

  const validRows = parsed?.rows.filter((r) => r.errors.length === 0) || []
  const invalidRows = parsed?.rows.filter((r) => r.errors.length > 0) || []

  async function handleImport() {
    setImporting(true)
    try {
      const summary = await importParticipants(
        validRows.map((r) => ({
          name: r.name,
          year: r.year,
          seriesNumber: r.seriesNumber,
          esColegioVisitante: r.esColegioVisitante,
        }))
      )
      setResult(summary)
      setParsed(null)
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="app-shell">
      <TopBar icon="file-import" title="Importar alumnos" subtitle="CSV o Excel" backTo="/admin" />
      <main>
        {!parsed && !result && (
          <>
            <div className="tile" style={{ cursor: 'default', flexDirection: 'column', alignItems: 'stretch', gap: 10 }}>
              <div className="tile__label">Subí tu planilla</div>
              <div className="tile__meta">
                Columnas esperadas: <strong>nombre</strong> y <strong>año</strong> (1 a 6). Opcionales:{' '}
                <strong>serie</strong> y <strong>visitante</strong> (sí/no).
              </div>
              <input type="file" accept=".csv,.xlsx,.xls" onChange={handleFile} style={{ marginTop: 8 }} />
              {fileName && <div className="hint-text">Archivo: {fileName}</div>}
              {parseError && <div className="hint-text" style={{ color: 'var(--danger)' }}>{parseError}</div>}
            </div>
            <a
              href="/plantilla-alumnos.csv"
              download
              style={{ fontSize: 13, color: 'var(--primary)', fontWeight: 700, display: 'inline-block', marginTop: 4 }}
            >
              <Icon name="download" /> Descargar planilla de ejemplo
            </a>
          </>
        )}

        {parsed && (
          <>
            <div className="tile" style={{ cursor: 'default', flexDirection: 'column', alignItems: 'stretch' }}>
              <div className="tile__label">
                {validRows.length} alumno{validRows.length !== 1 ? 's' : ''} listo
                {validRows.length !== 1 ? 's' : ''} para importar
              </div>
              {invalidRows.length > 0 && (
                <div className="tile__meta" style={{ color: 'var(--danger)' }}>
                  {invalidRows.length} fila{invalidRows.length !== 1 ? 's' : ''} con errores (no se van a
                  importar)
                </div>
              )}
            </div>

            {invalidRows.length > 0 && (
              <>
                <div className="section-label">Filas con errores</div>
                {invalidRows.map((r) => (
                  <div key={r.rowNumber} className="participant-row" style={{ borderColor: 'var(--danger)' }}>
                    <div className="participant-row__name">
                      Fila {r.rowNumber}: {r.name || '(sin nombre)'}
                    </div>
                    <div className="hint-text" style={{ color: 'var(--danger)' }}>
                      {r.errors.join(' · ')}
                    </div>
                  </div>
                ))}
              </>
            )}

            <div className="section-label">Vista previa</div>
            {validRows.slice(0, 8).map((r) => (
              <div key={r.rowNumber} className="participant-row" style={{ padding: 12 }}>
                <div className="participant-row__name">
                  {r.name}
                  {r.esColegioVisitante && <span className="visitor-tag">Visitante</span>}
                </div>
                <div className="hint-text">
                  {r.year}° año · Serie {r.seriesNumber}
                </div>
              </div>
            ))}
            {validRows.length > 8 && (
              <div className="hint-text">…y {validRows.length - 8} más.</div>
            )}

            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button className="btn btn--ghost" onClick={() => setParsed(null)}>
                Cancelar
              </button>
              <button
                className="btn btn--accent"
                onClick={handleImport}
                disabled={importing || validRows.length === 0}
              >
                {importing ? 'Importando…' : `Importar ${validRows.length} alumnos`}
              </button>
            </div>
          </>
        )}

        {result && (
          <div className="tile" style={{ cursor: 'default', flexDirection: 'column', alignItems: 'stretch', gap: 6 }}>
            <div className="tile__label" style={{ color: 'var(--success)' }}><Icon name="check" /> Importación completa</div>
            <div className="tile__meta">
              {result.importedCount} alumno{result.importedCount !== 1 ? 's' : ''} agregado
              {result.importedCount !== 1 ? 's' : ''}
              {result.createdSeriesCount > 0 &&
                ` · ${result.createdSeriesCount} serie${result.createdSeriesCount !== 1 ? 's' : ''} nueva${
                  result.createdSeriesCount !== 1 ? 's' : ''
                } creada${result.createdSeriesCount !== 1 ? 's' : ''}`}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button className="btn btn--ghost" onClick={() => navigate('/admin')}>
                Volver a administración
              </button>
              <button className="btn btn--primary" onClick={() => setResult(null)}>
                Importar otro archivo
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
