import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom'
import Layout from '@/components/Layout'
import ProtectedRoute from '@/components/ProtectedRoute'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import LoginPage from '@/pages/auth/LoginPage'
import RegisterPage from '@/pages/auth/RegisterPage'
import OrdersPage from '@/pages/orders/OrdersPage'
import UsersPage from '@/pages/users/UsersPage'
import ImportPage from '@/pages/import/ImportPage'
import StatsPage from '@/pages/stats/StatsPage'
import NotFoundPage from '@/pages/NotFoundPage'

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Navigate to="/orders" replace />} />
              <Route path="/orders" element={<OrdersPage />} />
              <Route path="/orders/import" element={<ImportPage />} />
              <Route path="/stats" element={<StatsPage />} />
              <Route path="/users" element={<UsersPage />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
