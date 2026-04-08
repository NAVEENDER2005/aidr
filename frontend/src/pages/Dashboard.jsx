import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import api from '../api'

const STAGE_COLORS = {
  'No DR':           '#22c55e',
  'Mild DR':         '#84cc16',
  'Moderate DR':     '#f59e0b',
  'Severe DR':       '#f97316',
  'Proliferative DR':'#ef4444',
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
      <span>Loading dashboard…</span>
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
          <div className="page-title">Dashboard</div>
          <div className="page-subtitle">Overview of Diabetic Retinopathy Screening</div>
        </div>
        <button
          id="new-analysis-btn"
          className="btn btn-primary"
          onClick={() => navigate('/upload')}
        >
          🔬 New Analysis
        </button>
      </div>

      <div className="page-body animate-fade-in">
        {/* ── Stats ── */}
        <div className="stats-grid">
          <StatCard icon="🔬" label="Total Analyses" value={stats?.total ?? 0}
            color="rgba(124,58,237,0.15)" iconColor="#a855f7" />
          <StatCard icon="⚠️" label="High Risk Cases" value={highRisk}
            color="rgba(239,68,68,0.12)" iconColor="#ef4444" />
          <StatCard icon="✅" label="No DR Cases" value={stats?.stage_distribution?.['No DR'] ?? 0}
            color="rgba(34,197,94,0.12)" iconColor="#22c55e" />
          <StatCard icon="📈" label="Avg Confidence" value={`${avgConf}%`}
            color="rgba(6,182,212,0.12)" iconColor="#06b6d4" />
        </div>

        <div className="grid-2">
          {/* ── Chart ── */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">📊 Severity Distribution</span>
            </div>
            {chartData.some(d => d.value > 0) ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} barSize={28} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                  <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }}
                    tickLine={false} axisLine={false}
                    tickFormatter={n => n.replace(' DR', '').replace('Proliferative', 'Prolif.')} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#f1f5f9' }}
                    cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {chartData.map((entry) => (
                      <Cell key={entry.name} fill={STAGE_COLORS[entry.name] || '#7c3aed'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state">
                <span className="empty-state-icon">📊</span>
                <h3>No data yet</h3>
                <p>Run your first analysis to see the distribution</p>
              </div>
            )}
          </div>

          {/* ── Legend ── */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">🎯 Stage Overview</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {Object.entries(STAGE_COLORS).map(([stage, color]) => (
                <div key={stage} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
                    <span style={{ fontSize: '0.85rem', color: 'var(--slate-300)' }}>{stage}</span>
                  </div>
                  <span style={{ fontSize: '0.9rem', fontWeight: 700, color }}>
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
            <span className="card-title">🕐 Recent Analyses</span>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/history')}>View All</button>
          </div>
          {history.length === 0 ? (
            <div className="empty-state">
              <span className="empty-state-icon">🔬</span>
              <h3>No analyses yet</h3>
              <p>Upload a retinal image to get started</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Patient</th>
                    <th>File</th>
                    <th>Stage</th>
                    <th>Confidence</th>
                    <th>Date</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((p, i) => (
                    <tr key={p.id}>
                      <td style={{ color: 'var(--slate-500)' }}>{i + 1}</td>
                      <td>{p.patient_name}</td>
                      <td className="truncate" style={{ maxWidth: 140 }}>{p.filename}</td>
                      <td>{stageBadge(p.stage)}</td>
                      <td>
                        <span style={{ fontWeight: 600, color: STAGE_COLORS[p.stage] || '#fff' }}>
                          {p.confidence.toFixed(1)}%
                        </span>
                      </td>
                      <td style={{ color: 'var(--slate-400)', fontSize: '0.8rem' }}>{formatDate(p.created_at)}</td>
                      <td>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => navigate(`/result/${p.id}`)}
                        >
                          👁 View
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
      <div className="stat-icon" style={{ background: color }}>
        <span style={{ fontSize: '1.4rem' }}>{icon}</span>
      </div>
      <div className="stat-info">
        <div className="stat-value" style={{ color: iconColor }}>{value}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  )
}
