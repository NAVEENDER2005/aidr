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
    formData.append('patient_name', patientName.trim() || 'Anonymous')

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
      const detail = err.response?.data?.detail || err.message || 'Analysis failed. Please try again.'
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
          <div className="page-title">New Analysis</div>
          <div className="page-subtitle">Upload a retinal fundus image for DR detection</div>
        </div>
      </div>

      <div className="page-body animate-fade-in">
        <div style={{ maxWidth: 700, margin: '0 auto' }}>

          {/* Patient Name */}
          <div className="card mb-4">
            <div className="card-header">
              <span className="card-title">👤 Patient Information</span>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="patient-name">Patient Name (optional)</label>
              <input
                id="patient-name"
                className="form-input"
                type="text"
                placeholder="e.g. Ravi Kumar"
                value={patientName}
                onChange={e => setPatientName(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          {/* Drop Zone */}
          <div className="card mb-4">
            <div className="card-header">
              <span className="card-title">🖼️ Retinal Image</span>
              {file && (
                <button className="btn btn-secondary btn-sm" onClick={handleClear} disabled={loading}>
                  ✕ Clear
                </button>
              )}
            </div>

            {!preview ? (
              <div {...getRootProps()} className={`dropzone${isDragActive ? ' active' : ''}`} id="dropzone">
                <input {...getInputProps()} id="file-input" />
                <span className="dropzone-icon">👁️</span>
                <p className="dropzone-title">
                  {isDragActive ? 'Drop the retinal image here…' : 'Drag & drop a retinal fundus image'}
                </p>
                <p className="dropzone-sub">or click to browse files</p>
                <p className="dropzone-hint">Supports JPG, PNG, BMP, TIFF · Max 20 MB</p>
              </div>
            ) : (
              <div className="upload-preview">
                <img src={preview} alt="Preview of uploaded retinal image" />
                <div className="upload-preview-footer">
                  <span>📁 {file.name}</span>
                  <span>{(file.size / 1024).toFixed(0)} KB</span>
                </div>
              </div>
            )}
          </div>

          {/* Progress */}
          {loading && (
            <div className="card mb-4">
              <div style={{ fontSize: '0.85rem', color: 'var(--slate-400)', marginBottom: 10 }}>
                {progress < 30 ? '⚙️ Preparing image…'
                  : progress < 60 ? '📤 Uploading…'
                  : progress < 90 ? '🧠 Running EfficientNet inference…'
                  : '🎨 Generating Grad-CAM heatmap…'}
              </div>
              <div className="confidence-bar-track">
                <div className="confidence-bar-fill" style={{ width: `${progress}%` }} />
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)', marginTop: 6, textAlign: 'right' }}>{progress}%</div>
            </div>
          )}

          {error && (
            <div className="login-error mb-4">⚠️ {error}</div>
          )}

          {/* Info Box */}
          {!file && (
            <div className="card mb-4" style={{ borderColor: 'rgba(124,58,237,0.3)', background: 'rgba(124,58,237,0.05)' }}>
              <div className="card-title" style={{ marginBottom: 12 }}>ℹ️ How It Works</div>
              <ol style={{ paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  'Upload a high-quality retinal fundus image (colour photograph of the retina)',
                  'The system applies CLAHE preprocessing to enhance contrast',
                  'EfficientNet-B0 classifies the image into one of 5 DR severity stages',
                  'Grad-CAM generates a heatmap highlighting affected regions',
                  'Download a PDF report with all findings',
                ].map((s, i) => (
                  <li key={i} style={{ fontSize: '0.85rem', color: 'var(--slate-400)', lineHeight: 1.6 }}>{s}</li>
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
            {!loading && '🧠 Analyse Retinal Image'}
          </button>
        </div>
      </div>
    </>
  )
}
