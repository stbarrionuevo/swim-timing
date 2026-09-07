import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCompetition } from '../context/CompetitionContext'
import Icon from '../components/Icon'

function initials(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

export default function SearchResults() {
  const navigate = useNavigate()
  const { getRankingGeneral, getSeriesListForBloque, turnos, bloquesPorTurno } = useCompetition()
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState(null)

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

  const results = useMemo(() => {
    const q = normalize(query).trim()
    if (!q) return []
    return ranking
      .map((p, i) => ({ ...p, position: i + 1 }))
      .filter((p) => normalize(p.name).includes(q))
      .slice(0, 20)
  }, [ranking, query])

  const selected = results.find((p) => p.id === selectedId) || null

  function handleQueryChange(value) {
    setQuery(value)
    setSelectedId(null)
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
            fontSize: 16,
          }}
        >
          <Icon name="chevron-left" />
        </button>
        <h1 className="public-header__title" style={{ textTransform: 'uppercase' }}>
          Buscar resultado
        </h1>
        <p className="public-header__subtitle">Encontrá el tiempo que estás buscando</p>
      </header>

      <main className="public-content">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            background: 'var(--surface-white)',
            borderRadius: 14,
            padding: '14px 16px',
            marginBottom: 16,
            border: query.trim() ? '2px solid var(--color-orange-primary)' : '2px solid transparent',
          }}
        >
          <Icon name="magnifying-glass" style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="Nombre y apellido"
            autoFocus
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              fontSize: 17,
              color: 'var(--text-primary)',
              background: 'transparent',
            }}
          />
        </div>

        {!query.trim() && (
          <p style={{ color: 'var(--color-steel)', fontSize: 13, textAlign: 'center' }}>
            Escribí un nombre o apellido para empezar.
          </p>
        )}

        {query.trim() && results.length === 0 && (
          <div className="public-empty">No encontramos a nadie con ese nombre.</div>
        )}

        {results.length > 0 && (
          <div
            style={{
              background: 'var(--surface-white)',
              borderRadius: 14,
              overflow: 'hidden',
              marginBottom: 12,
            }}
          >
            {results.map((p, i) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedId(p.id)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '14px 16px',
                  background: selectedId === p.id ? 'var(--color-orange-soft-bg)' : 'transparent',
                  border: 'none',
                  borderTop: i === 0 ? 'none' : '1px solid var(--surface-gray-light)',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    background: i % 2 === 0 ? 'var(--color-orange-soft-bg-strong)' : 'var(--surface-gray-light)',
                    color: i % 2 === 0 ? 'var(--color-orange-text)' : 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: 14,
                    flexShrink: 0,
                  }}
                >
                  {initials(p.name)}
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>
                    {p.name}
                  </span>
                  <span style={{ display: 'block', fontSize: 13, color: 'var(--text-muted)' }}>
                    {p.year != null ? `${p.year}° año` : 'Año sin dato'}
                  </span>
                </span>
                <Icon name="chevron-right" style={{ color: 'var(--text-disabled)' }} />
              </button>
            ))}
          </div>
        )}

        {results.length > 0 && !selected && (
          <p style={{ color: 'var(--color-steel)', fontSize: 13, textAlign: 'center' }}>
            Tocá un resultado para ver el detalle
          </p>
        )}

        {selected && (
          <div
            style={{
              background: 'var(--color-navy-mid)',
              borderRadius: 16,
              padding: 18,
              marginTop: 8,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
              <span
                aria-hidden="true"
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: '50%',
                  background: 'var(--color-orange-soft-bg-strong)',
                  color: 'var(--color-orange-text)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: 18,
                  flexShrink: 0,
                }}
              >
                {initials(selected.name)}
              </span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 20, color: '#fff' }}>{selected.name}</div>
                {selected.year != null && (
                  <span
                    className="public-year-badge"
                    style={{ display: 'inline-flex', marginTop: 4 }}
                  >
                    <span
                      className={`public-year-badge__dot public-year-badge__dot--${
                        colorBySeriesId.get(selected.seriesId) || 'none'
                      }`}
                      aria-hidden="true"
                    />
                    <span>{selected.year}° año</span>
                  </span>
                )}
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '14px 16px',
                background: 'var(--color-navy-deep)',
                borderRadius: 12,
                marginBottom: 10,
              }}
            >
              <span style={{ color: 'var(--color-steel)', fontSize: 15 }}>Puesto general</span>
              <span style={{ color: '#fff', fontWeight: 700, fontSize: 26 }}>{selected.position}°</span>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '14px 16px',
                background: 'var(--color-navy-deep)',
                borderRadius: 12,
              }}
            >
              <span style={{ color: 'var(--color-steel)', fontSize: 15 }}>Tiempo</span>
              <span style={{ color: 'var(--color-orange-primary)', fontWeight: 700, fontSize: 30 }}>
                {Number(selected.result.time).toFixed(2)}s
              </span>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
