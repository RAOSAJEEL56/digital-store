import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { StoreProvider } from './context/StoreContext.jsx'
import AppLayout from './components/common/AppLayout.jsx'
import BillingPage from './pages/BillingPage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import InventoryPage from './pages/InventoryPage.jsx'
import SalesPage from './pages/SalesPage.jsx'
import KhataPage from './pages/KhataPage.jsx'
import ProfitPage from './pages/ProfitPage.jsx'
import OnlinePaymentsPage from './pages/OnlinePaymentsPage.jsx'
import SettingsPage from './pages/SettingsPage.jsx'

function App() {
  return (
    <StoreProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<Navigate to="/billing" replace />} />
            <Route path="billing" element={<BillingPage />} />
            <Route path="analytics" element={<DashboardPage />} />
            <Route path="stock" element={<InventoryPage />} />
            <Route path="sales" element={<SalesPage />} />
            <Route path="khata" element={<KhataPage />} />
            <Route path="profit" element={<ProfitPage />} />
            <Route path="online-payments" element={<OnlinePaymentsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/billing" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </StoreProvider>
  )
}

export default App
