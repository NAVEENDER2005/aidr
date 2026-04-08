import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage   from './pages/LoginPage'
import Layout      from './components/Layout'
import Dashboard   from './pages/Dashboard'
import UploadPage  from './pages/UploadPage'
import ResultPage  from './pages/ResultPage'
import HistoryPage from './pages/HistoryPage'

function PrivateRoute({ children }) {
  const token = localStorage.getItem('token')
  return token ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="upload"    element={<UploadPage />} />
          <Route path="result/:id" element={<ResultPage />} />
          <Route path="history"   element={<HistoryPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
