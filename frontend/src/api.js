import axios from 'axios'
const getBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL
  if (!envUrl) return '/api'
  const cleaned = envUrl.replace(/\/+$/, '')
  return cleaned.endsWith('/api') ? cleaned : `${cleaned}/api`
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
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api
