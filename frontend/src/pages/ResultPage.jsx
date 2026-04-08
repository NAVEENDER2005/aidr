import { useEffect, useState, useRef } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import api from '../api'

const STAGE_COLORS = {
  'No DR':            '#22c55e',
  'Mild DR':          '#84cc16',
  'Moderate DR':      '#f59e0b',
  'Severe DR':        '#f97316',
  'Proliferative DR': '#ef4444',
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
  useEffect(() => { setTimeout(() => setWidth(value), 100) }, [value])
  return (
    <div className="conf-item-row">
      <span className="conf-item-label">{label}</span>
      <div style={{ flex: 1 }}>
        <div className="confidence-bar-track">
          <div
            className="confidence-bar-fill"
            style={{ width: `${width}%`, background: color, transition: 'width 1s cubic-bezier(.4,0,.2,1)' }}
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
      // Fetch from history by id — re-run predict not possible, show stored data
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
    } catch (e) {
      alert('Failed to download report.')
    } finally {
      setDownloading(false)
    }
  }

  if (loading) return (
    <div className="loading-overlay">
      <div className="spinner" />
      <span>Loading result…</span>
    </div>
  )

  if (!result) return (
    <div className="page-body">
      <div className="empty-state">
        <span className="empty-state-icon">❌</span>
        <h3>Result not found</h3>
        <button className="btn btn-primary mt-4" onClick={() => navigate('/upload')}>New Analysis</button>
      </div>
    </div>
  )

  const color = STAGE_COLORS[result.stage] || '#7c3aed'
  const allConf = result.all_confidences || {}

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Analysis Result</div>
          <div className="page-subtitle">
            {result.patient_name || 'Anonymous'} · {result.filename}
          </div>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary" onClick={() => navigate('/upload')}>
            🔬 New Analysis
          </button>
          <button
            id="download-pdf-btn"
            className={`btn btn-primary${downloading ? ' btn-loading' : ''}`}
            onClick={handleDownloadPDF}
            disabled={downloading}
          >
            {!downloading && '📄 Download PDF'}
          </button>
        </div>
      </div>

      <div className="page-body animate-fade-in">
        <div style={{ maxWidth: 900, margin: '0 auto' }}>

          {/* ── Stage Banner ── */}
          <div
            className="result-stage-banner mb-6"
            style={{
              borderColor: color,
              background: `${color}14`,
              color,
            }}
          >
            <div className="result-stage-name">{result.stage}</div>
            <div className="result-confidence">
              Confidence: <strong>{result.confidence?.toFixed(1)}%</strong>
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
                <span className="card-title">📊 Stage Probabilities</span>
              </div>
              <div className="all-conf-list">
                {Object.entries(allConf).map(([stage, val]) => (
                  <ConfBar
                    key={stage}
                    label={stage}
                    value={val}
                    color={STAGE_COLORS[stage] || '#7c3aed'}
                  />
                ))}
              </div>
            </div>

            {/* ── About Diagnosis ── */}
            <div className="card">
              <div className="card-header">
                <span className="card-title">🏥 Clinical Information</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <InfoRow label="Patient" value={result.patient_name || 'Anonymous'} />
                <InfoRow label="Diagnosis" value={
                  <span className={`badge ${BADGE_CLASSES[result.stage] || ''}`}>{result.stage}</span>
                } />
                <InfoRow label="Confidence" value={`${result.confidence?.toFixed(1)}%`} valueColor={color} />
                <InfoRow label="Report ID" value={`AIDR-${String(id).padStart(5, '0')}`} />
                {result.created_at && (
                  <InfoRow label="Date" value={new Date(result.created_at).toLocaleString('en-IN')} />
                )}
              </div>

              <div style={{ marginTop: 20, padding: '12px 14px', background: 'rgba(124,58,237,0.07)', borderRadius: 8, border: '1px solid rgba(124,58,237,0.2)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--slate-400)', lineHeight: 1.7 }}>
                  ⚠️ <strong style={{ color: 'var(--slate-300)' }}>Disclaimer:</strong> This AI-generated result is for screening purposes only and does not replace professional ophthalmological evaluation.
                </div>
              </div>
            </div>
          </div>

          {/* ── Heatmap Images ── */}
          {(result.gradcam_b64 || result.overlay_b64) && (
            <div className="card">
              <div className="card-header">
                <span className="card-title">🔥 Grad-CAM Explainability</span>
                <span className="text-xs text-muted">
                  Highlighted regions influence the prediction most
                </span>
              </div>
              <div className="heatmap-grid">
                {result.overlay_b64 && (
                  <div className="heatmap-box">
                    <img
                      ref={imgRef}
                      src={`data:image/png;base64,${result.overlay_b64}`}
                      alt="Grad-CAM overlay on retinal image"
                    />
                    <div className="heatmap-label">🌡️ Grad-CAM Overlay</div>
                  </div>
                )}
                {result.gradcam_b64 && (
                  <div className="heatmap-box">
                    <img
                      src={`data:image/png;base64,${result.gradcam_b64}`}
                      alt="Grad-CAM raw heatmap"
                    />
                    <div className="heatmap-label">🔴 Raw Heatmap</div>
                  </div>
                )}
              </div>
              <div style={{ marginTop: 14, padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, fontSize: '0.8rem', color: 'var(--slate-400)', lineHeight: 1.7 }}>
                <strong style={{ color: 'var(--slate-300)' }}>How to read:</strong> Red/hot areas indicate regions the model focuses on most when making predictions.
                In Diabetic Retinopathy, these correspond to microaneurysms, haemorrhages, or abnormal blood vessels.
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
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 10 }}>
      <span style={{ fontSize: '0.8rem', color: 'var(--slate-400)', fontWeight: 500 }}>{label}</span>
      <span style={{ fontSize: '0.85rem', color: valueColor || 'var(--slate-200)', fontWeight: 600 }}>{value}</span>
    </div>
  )
}
