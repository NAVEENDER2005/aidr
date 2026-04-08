import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'

const STAGE_COLORS = {
  'No DR':            '#22c55e',
  'Mild DR':          '#84cc16',
  'Moderate DR':      '#f59e0b',
  'Severe DR':        '#f97316',
  'Proliferative DR': '#ef4444',
}

const BADGE_CLASS = {
  'No DR':            'badge-no-dr',
  'Mild DR':          'badge-mild',
  'Moderate DR':      'badge-moderate',
  'Severe DR':        'badge-severe',
  'Proliferative DR': 'badge-prolif',
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function HistoryPage() {
  const navigate = useNavigate()
  const [history,     setHistory]     = useState([])
  const [loading,     setLoading]     = useState(true)
  const [downloading, setDownloading] = useState(null)
  const [search,      setSearch]      = useState('')
  const [filter,      setFilter]      = useState('All')

  useEffect(() => {
    api.get('/history')
      .then(res => setHistory(res.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  async function downloadPDF(id, patientName) {
    setDownloading(id)
    try {
      const res = await api.get(`/history/report/${id}`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(res.data)
      const a   = document.createElement('a')
      a.href = url
      a.download = `DR_Report_${patientName}_${id}.pdf`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch {
      alert('Failed to download report.')
    } finally {
      setDownloading(null)
    }
  }

  const stages = ['All', 'No DR', 'Mild DR', 'Moderate DR', 'Severe DR', 'Proliferative DR']

  const filtered = history.filter(p => {
    const matchSearch = search === '' ||
      p.patient_name.toLowerCase().includes(search.toLowerCase()) ||
      p.filename.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'All' || p.stage === filter
    return matchSearch && matchFilter
  })

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">History</div>
          <div className="page-subtitle">All past diabetic retinopathy analyses</div>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/upload')}>
          🔬 New Analysis
        </button>
      </div>

      <div className="page-body animate-fade-in">
        {/* Filters */}
        <div className="card mb-4">
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              id="history-search"
              className="form-input"
              style={{ maxWidth: 260 }}
              type="text"
              placeholder="🔍 Search patient or file…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {stages.map(s => (
                <button
                  key={s}
                  className={`btn btn-sm ${filter === s ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setFilter(s)}
                >
                  {s}
                </button>
              ))}
            </div>
            <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--slate-400)' }}>
              {filtered.length} record{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        <div className="card">
          {loading ? (
            <div className="loading-overlay">
              <div className="spinner" />
              <span>Loading history…</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <span className="empty-state-icon">📋</span>
              <h3>{history.length === 0 ? 'No analyses yet' : 'No matching records'}</h3>
              <p>{history.length === 0
                ? 'Upload a retinal image to get started'
                : 'Try adjusting your search or filter'}
              </p>
              {history.length === 0 && (
                <button className="btn btn-primary mt-4" onClick={() => navigate('/upload')}>
                  🔬 First Analysis
                </button>
              )}
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Patient</th>
                    <th>Image File</th>
                    <th>Stage</th>
                    <th>Confidence</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => (
                    <tr key={p.id}>
                      <td style={{ color: 'var(--slate-500)', fontFamily: 'monospace' }}>
                        #{String(p.id).padStart(4, '0')}
                      </td>
                      <td style={{ fontWeight: 500 }}>{p.patient_name}</td>
                      <td className="truncate" style={{ maxWidth: 160, color: 'var(--slate-400)' }}>
                        {p.filename}
                      </td>
                      <td>
                        <span className={`badge ${BADGE_CLASS[p.stage] || ''}`}>
                          {p.stage}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 700, color: STAGE_COLORS[p.stage] }}>
                          {p.confidence.toFixed(1)}%
                        </span>
                      </td>
                      <td style={{ color: 'var(--slate-400)', fontSize: '0.8rem' }}>
                        {formatDate(p.created_at)}
                      </td>
                      <td>
                        <div className="flex gap-2">
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => navigate(`/result/${p.id}`)}
                          >
                            👁 View
                          </button>
                          <button
                            className={`btn btn-secondary btn-sm${downloading === p.id ? ' btn-loading' : ''}`}
                            onClick={() => downloadPDF(p.id, p.patient_name)}
                            disabled={downloading === p.id}
                          >
                            {downloading !== p.id && '📄 PDF'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
