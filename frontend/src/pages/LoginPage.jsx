import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'

export default function LoginPage() {
  const navigate = useNavigate()
  const [form, setForm]         = useState({ username: '', password: '' })
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  async function handleSubmit(e) {
    e?.preventDefault?.()
    setError('')
    setLoading(true)
    try {
      const body = new URLSearchParams()
      body.append('username', form.username)
      body.append('password', form.password)
      const res = await api.post('/auth/login', body, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })
      localStorage.setItem('token', res.data.access_token)
      localStorage.setItem('user', JSON.stringify(res.data.user))
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.detail || 'Authentication failed. Please verify credentials.')
    } finally {
      setLoading(false)
    }
  }

  function fillDemo(username, password) {
    setForm({ username, password })
    setError('')
  }

  return (
    <div className="login-page">
      <div className="login-bg" />
      <div className="login-card animate-fade-in">
        <div className="login-header">
          <div className="login-logo" aria-hidden="true">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/>
            </svg>
          </div>
          <h1 className="login-title">AIDR Clinical Portal</h1>
          <p className="login-subtitle">AI-Powered Retinal Screening & Diagnostic Suite</p>
        </div>

        {error && (
          <div className="login-error" role="alert">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 6, verticalAlign: -2 }}>
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="username">Clinical Username</label>
            <input
              id="username"
              className="form-input"
              type="text"
              placeholder="e.g. admin or doctor"
              value={form.username}
              onChange={e => setForm({ ...form, username: e.target.value })}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <input
              id="password"
              className="form-input"
              type="password"
              placeholder="Enter your security password"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>

          <button
            id="login-btn"
            type="submit"
            className={`btn btn-primary btn-lg w-full${loading ? ' btn-loading' : ''}`}
            disabled={loading}
          >
            {!loading && 'Access Diagnostic Workspace'}
          </button>
        </form>

        <div className="login-hint">
          <div style={{ marginBottom: 6, fontWeight: 600, color: 'var(--sky-300)' }}>
            Quick Demo Access
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => fillDemo('admin', 'admin123')}
              style={{ fontSize: '0.75rem' }}
            >
              Fill Admin
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => fillDemo('doctor', 'doctor123')}
              style={{ fontSize: '0.75rem' }}
            >
              Fill Doctor
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
