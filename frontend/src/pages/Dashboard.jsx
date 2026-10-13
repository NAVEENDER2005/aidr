import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import api from '../api'

const STAGE_COLORS = {
  'No DR':           '#10b981',
  'Mild DR':         '#0ea5e9',
  'Moderate DR':     '#f59e0b',
  'Severe DR':       '#f97316',
  'Proliferative DR':'#f43f5e',
}

const BADGE_CLASS = {
  'No DR':           'badge-no-dr',
  'Mild DR':         'badge-mild',
  'Moderate DR':     'badge-moderate',
  'Severe DR':       'badge-severe',
  'Proliferative DR':'badge-prolif',
}

function stageBadge(stage) {
  return <span className={`badge ${BADGE_CLASS[stage] || 'badge-mild'}`}>{stage}</span>
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [stats,   setStats]   = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([api.get('/history/stats'), api.get('/history')])
      .then(([sRes, hRes]) => {
        setStats(sRes.data)
        setHistory(hRes.data.slice(0, 8))
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="loading-overlay">
      <div className="spinner" />
      <span>Loading clinical dashboard…</span>
    </div>
  )

  const chartData = stats
    ? Object.entries(stats.stage_distribution).map(([name, value]) => ({ name, value }))
    : []

  const highRisk = stats
    ? (stats.stage_distribution['Severe DR'] || 0) + (stats.stage_distribution['Proliferative DR'] || 0)
    : 0

  const avgConf = history.length
    ? Math.round(history.reduce((a, b) => a + b.confidence, 0) / history.length)
    : 0

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Screening Overview</div>
          <div className="page-subtitle">Real-time diabetic retinopathy triage and stage analytics</div>
        </div>
        <button
          id="new-analysis-btn"
          className="btn btn-primary"
          onClick={() => navigate('/upload')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          New Retinal Scan
        </button>
      </div>

      <div className="page-body animate-fade-in">
        {/* ── Stats ── */}
        <div className="stats-grid">
          <StatCard
            icon={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
            }
            label="Total Screenings"
            value={stats?.total ?? 0}
            color="rgba(14, 165, 233, 0.12)"
            iconColor="#38bdf8"
          />
          <StatCard
            icon={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            }
            label="High Risk (Severe / Prolif)"
            value={highRisk}
            color="rgba(244, 63, 94, 0.12)"
            iconColor="#fb7185"
          />
          <StatCard
            icon={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            }
            label="No DR Diagnosed"
            value={stats?.stage_distribution?.['No DR'] ?? 0}
            color="rgba(16, 185, 129, 0.12)"
            iconColor="#34d399"
          />
          <StatCard
            icon={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="20" x2="18" y2="10"/>
                <line x1="12" y1="20" x2="12" y2="4"/>
                <line x1="6" y1="20" x2="6" y2="14"/>
              </svg>
            }
            label="Mean Model Confidence"
            value={`${avgConf}%`}
            color="rgba(6, 182, 212, 0.12)"
            iconColor="#22d3ee"
          />
        </div>

        <div className="grid-2">
          {/* ── Chart ── */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--sky-400)' }}>
                  <line x1="18" y1="20" x2="18" y2="10"/>
                  <line x1="12" y1="20" x2="12" y2="4"/>
                  <line x1="6" y1="20" x2="6" y2="14"/>
                </svg>
                Severity Distribution
              </span>
            </div>
            {chartData.some(d => d.value > 0) ? (
              <ResponsiveContainer width="100%" height={230}>
                <BarChart data={chartData} barSize={32} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                  <XAxis
                    dataKey="name"
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
                    tickFormatter={n => n.replace(' DR', '').replace('Proliferative', 'Prolif.')}
                  />
                  <YAxis
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: '#0f172a',
                      border: '1px solid rgba(56, 189, 248, 0.25)',
                      borderRadius: 8,
                      color: '#f1f5f9',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                    }}
                    cursor={{ fill: 'rgba(14, 165, 233, 0.05)' }}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {chartData.map((entry) => (
                      <Cell key={entry.name} fill={STAGE_COLORS[entry.name] || '#0284c7'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state">
                <span className="empty-state-icon">📊</span>
                <h3>No data registered</h3>
                <p>Execute your first retinal screening to populate the distribution</p>
              </div>
            )}
          </div>

          {/* ── Legend ── */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--sky-400)' }}>
                  <circle cx="12" cy="12" r="10"/>
                  <circle cx="12" cy="12" r="6"/>
                  <circle cx="12" cy="12" r="2"/>
                </svg>
                Stage Overview & ICDR Criteria
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {Object.entries(STAGE_COLORS).map(([stage, color]) => (
                <div key={stage} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0, boxShadow: `0 0 8px ${color}66` }} />
                    <span style={{ fontSize: '0.86rem', color: 'var(--slate-200)', fontWeight: 500 }}>{stage}</span>
                  </div>
                  <span style={{ fontSize: '0.92rem', fontWeight: 700, color, fontVariantNumeric: 'tabular-nums' }}>
                    {stats?.stage_distribution?.[stage] ?? 0}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Recent History ── */}
        <div className="card mt-6">
          <div className="card-header">
            <span className="card-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--sky-400)' }}>
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
              Recent Screenings
            </span>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/history')}>
              View Full History →
            </button>
          </div>
          {history.length === 0 ? (
            <div className="empty-state">
              <span className="empty-state-icon">🔬</span>
              <h3>No patient scans yet</h3>
              <p>Upload a fundus image to generate diagnostic prediction</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Patient</th>
                    <th>File</th>
                    <th>ICDR Stage</th>
                    <th>Confidence</th>
                    <th>Timestamp</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((p, i) => (
                    <tr key={p.id}>
                      <td style={{ color: 'var(--slate-500)', fontFamily: 'monospace' }}>{i + 1}</td>
                      <td style={{ fontWeight: 600 }}>{p.patient_name}</td>
                      <td className="truncate" style={{ maxWidth: 140, color: 'var(--slate-400)' }}>{p.filename}</td>
                      <td>{stageBadge(p.stage)}</td>
                      <td>
                        <span style={{ fontWeight: 700, color: STAGE_COLORS[p.stage] || '#fff' }}>
                          {p.confidence.toFixed(1)}%
                        </span>
                      </td>
                      <td style={{ color: 'var(--slate-400)', fontSize: '0.8rem' }}>{formatDate(p.created_at)}</td>
                      <td>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => navigate(`/result/${p.id}`)}
                        >
                          Review Scan
                        </button>
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

function StatCard({ icon, label, value, color, iconColor }) {
  return (
    <div className="stat-card">
      <div className="stat-icon" style={{ background: color, color: iconColor }}>
        {icon}
      </div>
      <div className="stat-info">
        <div className="stat-value" style={{ color: iconColor }}>{value}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  )
}
