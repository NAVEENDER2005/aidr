import { useEffect, useState, useRef } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import api from '../api'

const STAGE_COLORS = {
  'No DR':            '#10b981',
  'Mild DR':          '#0ea5e9',
  'Moderate DR':      '#f59e0b',
  'Severe DR':        '#f97316',
  'Proliferative DR': '#f43f5e',
}

const BADGE_CLASSES = {
  'No DR':            'badge-no-dr',
  'Mild DR':          'badge-mild',
  'Moderate DR':      'badge-moderate',
  'Severe DR':        'badge-severe',
  'Proliferative DR': 'badge-prolif',
}

function ConfBar({ label, value, color }) {
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const t = setTimeout(() => setWidth(value), 80)
    return () => clearTimeout(t)
  }, [value])

  return (
    <div className="conf-item-row">
      <span className="conf-item-label">{label}</span>
      <div style={{ flex: 1 }}>
        <div className="confidence-bar-track">
          <div
            className="confidence-bar-fill"
            style={{
              width: `${width}%`,
              background: color,
              transition: 'width 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          />
        </div>
      </div>
      <span className="conf-item-pct">{value.toFixed(1)}%</span>
    </div>
  )
}

export default function ResultPage() {
  const { id }      = useParams()
  const location    = useLocation()
  const navigate    = useNavigate()
  const [result, setResult] = useState(location.state?.result || null)
  const [loading,   setLoading]   = useState(!result)
  const [downloading, setDownloading] = useState(false)
  const imgRef = useRef(null)

  useEffect(() => {
    if (!result) {
      api.get('/history').then(res => {
        const found = res.data.find(p => p.id === parseInt(id))
        if (found) setResult(found)
      }).finally(() => setLoading(false))
    }
  }, [id, result])

  async function handleDownloadPDF() {
    setDownloading(true)
    try {
      const res = await api.get(`/history/report/${id}`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(res.data)
      const a   = document.createElement('a')
      a.href = url
      a.download = `DR_Report_${result?.patient_name || 'Patient'}_${id}.pdf`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch {
      alert('Failed to generate PDF report.')
    } finally {
      setDownloading(false)
    }
  }

  if (loading) return (
    <div className="loading-overlay">
      <div className="spinner" />
      <span>Loading screening diagnostic record…</span>
    </div>
  )

  if (!result) return (
    <div className="page-body">
      <div className="empty-state">
        <span className="empty-state-icon">⚠️</span>
        <h3>Diagnostic record not found</h3>
        <button className="btn btn-primary mt-4" onClick={() => navigate('/upload')}>
          Start New Screening
        </button>
      </div>
    </div>
  )

  const color = STAGE_COLORS[result.stage] || '#0284c7'
  const allConf = result.all_confidences || {}

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Diagnostic Screening Report</div>
          <div className="page-subtitle">
            Patient: <strong style={{ color: 'var(--slate-200)' }}>{result.patient_name || 'Anonymous'}</strong> · Scan: {result.filename}
          </div>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary" onClick={() => navigate('/upload')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            New Scan
          </button>
          <button
            id="download-pdf-btn"
            className={`btn btn-primary${downloading ? ' btn-loading' : ''}`}
            onClick={handleDownloadPDF}
            disabled={downloading}
          >
            {!downloading && (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Export PDF Dossier
              </>
            )}
          </button>
        </div>
      </div>

      <div className="page-body animate-fade-in">
        <div style={{ maxWidth: 940, margin: '0 auto' }}>

          {/* ── Stage Banner ── */}
          <div
            className="result-stage-banner mb-6"
            style={{
              borderColor: `${color}66`,
              background: `linear-gradient(180deg, ${color}18 0%, ${color}08 100%)`,
              color,
              boxShadow: `0 8px 30px ${color}1f`,
            }}
          >
            <div className="result-stage-name">{result.stage}</div>
            <div className="result-confidence" style={{ color: 'var(--slate-200)' }}>
              Confidence Metric: <strong style={{ color }}>{result.confidence?.toFixed(1)}%</strong>
            </div>
            {result.description && (
              <div className="result-description" style={{ color: 'var(--slate-300)' }}>
                {result.description}
              </div>
            )}
          </div>

          <div className="grid-2 mb-6">
            {/* ── Confidence Bars ── */}
            <div className="card">
              <div className="card-header">
                <span className="card-title">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--sky-400)' }}>
                    <line x1="18" y1="20" x2="18" y2="10"/>
                    <line x1="12" y1="20" x2="12" y2="4"/>
                    <line x1="6" y1="20" x2="6" y2="14"/>
                  </svg>
                  Neural Output Distribution
                </span>
              </div>
              <div className="all-conf-list">
                {Object.entries(allConf).map(([stage, val]) => (
                  <ConfBar
                    key={stage}
                    label={stage}
                    value={val}
                    color={STAGE_COLORS[stage] || '#0284c7'}
                  />
                ))}
              </div>
            </div>

            {/* ── Clinical Meta ── */}
            <div className="card">
              <div className="card-header">
                <span className="card-title">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--sky-400)' }}>
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 16v-4M12 8h.01"/>
                  </svg>
                  Clinical Case Profile
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <InfoRow label="Patient Identifier" value={result.patient_name || 'Anonymous'} />
                <InfoRow label="ICDR Staging" value={
                  <span className={`badge ${BADGE_CLASSES[result.stage] || ''}`}>{result.stage}</span>
                } />
                <InfoRow label="Neural Confidence" value={`${result.confidence?.toFixed(1)}%`} valueColor={color} />
                <InfoRow label="Accession Record" value={`AIDR-${String(id).padStart(5, '0')}`} />
                {result.created_at && (
                  <InfoRow label="Assessment Date" value={new Date(result.created_at).toLocaleString('en-IN')} />
                )}
              </div>

              <div style={{ marginTop: 20, padding: '12px 14px', background: 'rgba(14, 165, 233, 0.05)', borderRadius: 8, border: '1px solid rgba(56, 189, 248, 0.2)' }}>
                <div style={{ fontSize: '0.76rem', color: 'var(--slate-300)', lineHeight: 1.6 }}>
                  ℹ️ <strong style={{ color: 'var(--sky-300)' }}>Clinical Notice:</strong> This algorithmic assessment is designed as an investigative triaging instrument. Formal medical decisions require certified clinical ophthalmologic review.
                </div>
              </div>
            </div>
          </div>

          {/* ── Heatmap Images ── */}
          {(result.gradcam_b64 || result.overlay_b64) && (
            <div className="card">
              <div className="card-header">
                <span className="card-title">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--sky-400)' }}>
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="2" y1="12" x2="22" y2="12"/>
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                  </svg>
                  Grad-CAM Feature Attributions
                </span>
                <span className="text-xs text-muted">
                  Spatial attribution of network activation
                </span>
              </div>
              <div className="heatmap-grid">
                {result.overlay_b64 && (
                  <div className="heatmap-box">
                    <img
                      ref={imgRef}
                      src={`data:image/png;base64,${result.overlay_b64}`}
                      alt="Grad-CAM overlay on fundus image"
                    />
                    <div className="heatmap-label">Retinal Image + Grad-CAM Heatmap Overlay</div>
                  </div>
                )}
                {result.gradcam_b64 && (
                  <div className="heatmap-box">
                    <img
                      src={`data:image/png;base64,${result.gradcam_b64}`}
                      alt="Raw gradient class activation map"
                    />
                    <div className="heatmap-label">Extracted Saliency Intensity Map</div>
                  </div>
                )}
              </div>
              <div style={{ marginTop: 14, padding: '12px 14px', background: 'rgba(255,255,255,0.02)', borderRadius: 8, fontSize: '0.8rem', color: 'var(--slate-400)', lineHeight: 1.6 }}>
                <strong style={{ color: 'var(--slate-200)' }}>Interpretability Guide:</strong> Warmer regions highlight areas with highest gradient weight during classification, corresponding to pathological hallmarks such as hard exudates, cotton wool spots, or proliferative neovascularization.
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function InfoRow({ label, value, valueColor }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: 10 }}>
      <span style={{ fontSize: '0.82rem', color: 'var(--slate-400)', fontWeight: 500 }}>{label}</span>
      <span style={{ fontSize: '0.86rem', color: valueColor || 'var(--slate-200)', fontWeight: 600 }}>{value}</span>
    </div>
  )
}
