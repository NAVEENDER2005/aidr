import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'

export default function LoginPage() {
  const navigate = useNavigate()
  const [form, setForm]     = useState({ username: '', password: '' })
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
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
      setError(err.response?.data?.detail || 'Login failed. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-bg" />
      <div className="login-card animate-fade-in">
        <div className="login-header">
          <div className="login-logo">👁️</div>
          <h1 className="login-title">Welcome to AIDR</h1>
          <p className="login-subtitle">AI-Powered Diabetic Retinopathy Detection</p>
        </div>

        {error && <div className="login-error">⚠️ {error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="username">Username</label>
            <input
              id="username"
              className="form-input"
              type="text"
              placeholder="Enter your username"
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
              placeholder="Enter your password"
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
            {!loading && '🔐 Sign In'}
          </button>
        </form>

        <div className="login-hint">
          <strong>Demo accounts</strong><br />
          Username: <code>admin</code> / Password: <code>admin123</code><br />
          Username: <code>doctor</code> / Password: <code>doctor123</code>
        </div>
      </div>
    </div>
  )
}
