import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom'
import Layout from '@/components/Layout'
import OrdersPage from '@/pages/orders/OrdersPage'
import UsersPage from './pages/users/UsersPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/orders" replace />} />
        <Route element={<Layout />}>
          <Route path="/orders" element={<OrdersPage />} />
          <Route path='/users' element = {<UsersPage />} />
          <Route path="/orders/import" element={<div className="p-8 text-muted-foreground">Import page — coming soon</div>} />
          <Route path="/stats" element={<div className="p-8 text-muted-foreground">Stats page — coming soon</div>} />
        </Route>
        <Route path="/login" element={<div className="p-8">Login</div>} />
      </Routes>
    </BrowserRouter>
  )
}
