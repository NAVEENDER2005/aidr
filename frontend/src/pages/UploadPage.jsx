import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { useNavigate } from 'react-router-dom'
import api from '../api'

export default function UploadPage() {
  const navigate = useNavigate()
  const [file,        setFile]        = useState(null)
  const [preview,     setPreview]     = useState(null)
  const [patientName, setPatientName] = useState('')
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState('')
  const [progress,    setProgress]    = useState(0)

  const onDrop = useCallback((accepted) => {
    if (!accepted.length) return
    const f = accepted[0]
    setFile(f)
    setError('')
    const reader = new FileReader()
    reader.onloadend = () => setPreview(reader.result)
    reader.readAsDataURL(f)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.bmp', '.tiff'] },
    maxFiles: 1,
    maxSize: 20 * 1024 * 1024,
  })

  async function handleAnalyze() {
    if (!file) return
    setLoading(true)
    setError('')
    setProgress(10)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('patient_name', patientName.trim() || 'Anonymous Patient')

    try {
      setProgress(30)
      const res = await api.post('/predict', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (ev) => {
          setProgress(30 + Math.round((ev.loaded / ev.total) * 30))
        },
      })
      setProgress(100)
      navigate(`/result/${res.data.id}`, { state: { result: res.data } })
    } catch (err) {
      const detail = err.response?.data?.detail || err.message || 'Diagnostic inference failed. Please check backend connection.'
      setError(detail)
      console.error('Predict error:', err.response?.data || err)
      setProgress(0)
    } finally {
      setLoading(false)
    }
  }

  function handleClear() {
    setFile(null)
    setPreview(null)
    setError('')
    setProgress(0)
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">New Retinal Screening</div>
          <div className="page-subtitle">Upload digital fundus photography for neural network DR staging</div>
        </div>
      </div>

      <div className="page-body animate-fade-in">
        <div style={{ maxWidth: 740, margin: '0 auto' }}>

          {/* Patient Name */}
          <div className="card mb-4">
            <div className="card-header">
              <span className="card-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--sky-400)' }}>
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                Patient Identification
              </span>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="patient-name">Patient Name or MRN (Medical Record Number)</label>
              <input
                id="patient-name"
                className="form-input"
                type="text"
                placeholder="e.g. John Doe / MRN-84729"
                value={patientName}
                onChange={e => setPatientName(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          {/* Drop Zone */}
          <div className="card mb-4">
            <div className="card-header">
              <span className="card-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--sky-400)' }}>
                  <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
                  <circle cx="9" cy="9" r="2"/>
                  <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
                </svg>
                Fundus Photography Upload
              </span>
              {file && (
                <button className="btn btn-secondary btn-sm" onClick={handleClear} disabled={loading}>
                  ✕ Replace Image
                </button>
              )}
            </div>

            {!preview ? (
              <div {...getRootProps()} className={`dropzone${isDragActive ? ' active' : ''}`} id="dropzone">
                <input {...getInputProps()} id="file-input" />
                <div className="dropzone-icon" aria-hidden="true">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" style={{ margin: '0 auto', color: 'var(--sky-400)' }}>
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/>
                    <line x1="12" y1="2" x2="12" y2="4"/>
                    <line x1="12" y1="20" x2="12" y2="22"/>
                    <line x1="2" y1="12" x2="4" y2="12"/>
                    <line x1="20" y1="12" x2="22" y2="12"/>
                  </svg>
                </div>
                <p className="dropzone-title">
                  {isDragActive ? 'Release image file here' : 'Select or drag fundus scan image'}
                </p>
                <p className="dropzone-sub">Supports standardized high-resolution retinal photography</p>
                <p className="dropzone-hint">Formats: JPG, PNG, BMP, TIFF · Maximum size 20 MB</p>
              </div>
            ) : (
              <div className="upload-preview">
                <img src={preview} alt="Retinal fundus scan preview" />
                <div className="upload-preview-footer">
                  <span>📄 {file.name}</span>
                  <span>{(file.size / (1024 * 1024)).toFixed(2)} MB</span>
                </div>
              </div>
            )}
          </div>

          {/* Progress */}
          {loading && (
            <div className="card mb-4">
              <div style={{ fontSize: '0.85rem', color: 'var(--sky-300)', marginBottom: 10, fontWeight: 500 }}>
                {progress < 30 ? 'Preprocessing image with CLAHE adaptive equalization…'
                  : progress < 60 ? 'Streaming fundus tensor to backend…'
                  : progress < 90 ? 'EfficientNet-B0 deep neural network inference in progress…'
                  : 'Synthesizing Grad-CAM explainability heatmap…'}
              </div>
              <div className="confidence-bar-track">
                <div className="confidence-bar-fill" style={{ width: `${progress}%` }} />
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--slate-400)', marginTop: 6, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                {progress}%
              </div>
            </div>
          )}

          {error && (
            <div className="login-error mb-4">
              ⚠️ {error}
            </div>
          )}

          {/* Info Box (Clinical Precision, NO Purple) */}
          {!file && (
            <div className="card mb-4" style={{ borderColor: 'rgba(56, 189, 248, 0.22)', background: 'rgba(14, 165, 233, 0.04)' }}>
              <div className="card-title" style={{ marginBottom: 12, color: 'var(--sky-300)' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="16" x2="12" y2="12"/>
                  <line x1="12" y1="8" x2="12.01" y2="8"/>
                </svg>
                Diagnostic Pipeline Overview
              </div>
              <ol style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  'Upload calibrated color retinal photography centered on macula or optic disc',
                  'CLAHE enhances microaneurysms, hemorrhages, and fine retinal vascularization',
                  'EfficientNet-B0 extracts hierarchical spatial features across MBConv residual blocks',
                  'Grad-CAM maps gradient activations to provide transparent explainability',
                  'Generate and export tamper-evident clinical PDF screening report',
                ].map((s, i) => (
                  <li key={i} style={{ fontSize: '0.84rem', color: 'var(--slate-300)', lineHeight: 1.6 }}>{s}</li>
                ))}
              </ol>
            </div>
          )}

          <button
            id="analyze-btn"
            className={`btn btn-primary btn-lg w-full${loading ? ' btn-loading' : ''}`}
            onClick={handleAnalyze}
            disabled={!file || loading}
          >
            {!loading && 'Run Neural DR Diagnostic Analysis'}
          </button>
        </div>
      </div>
    </>
  )
}
