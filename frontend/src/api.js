import axios from 'axios'
const getBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL
  if (envUrl) {
    const cleaned = envUrl.replace(/\/+$/, '')
    return cleaned.endsWith('/api') ? cleaned : `${cleaned}/api`
  }
  // If hosted on Vercel or in production, target the Render backend directly
  if (typeof window !== 'undefined' && window.location.hostname.includes('vercel.app')) {
    return 'https://ai-diabetic-retinopathy.onrender.com/api'
  }
  return '/api'
}

const api = axios.create({ baseURL: getBaseUrl() })

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    // Only redirect if 401 occurs on authenticated routes (not during login attempt)
    if (err.response?.status === 401 && !err.config?.url?.includes('/auth/login')) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(err)
  }
)

export default api
