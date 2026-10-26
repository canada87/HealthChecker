import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { UserProvider, useUser } from './contexts/UserContext'
import { ToastProvider } from './contexts/ToastContext'
import SelectUser from './pages/SelectUser'
import Home from './pages/Home'
import Crises from './pages/Crises'
import CrisisReport from './pages/CrisisReport'
import History from './pages/History'
import Stats from './pages/Stats'
import Settings from './pages/Settings'
import Admin from './pages/Admin'
import BottomNav from './components/BottomNav'
import Sidebar from './components/Sidebar'

function AppRoutes() {
  const { currentUser } = useUser()

  if (!currentUser) return <SelectUser />

  return (
    <div className="flex h-screen bg-slate-50 print:block print:h-auto print:bg-white">
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col max-w-lg mx-auto lg:max-w-none print:max-w-none">
        <main className="flex-1 overflow-y-auto print:overflow-visible">
          <div className="lg:max-w-6xl lg:mx-auto lg:px-6">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/crises" element={<Crises />} />
              <Route path="/crises/report" element={<CrisisReport />} />
              <Route path="/history" element={<History />} />
              <Route path="/stats" element={<Stats />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </main>
        <BottomNav />
      </div>
    </div>
  )
}

export default function App() {
  return (
    <UserProvider>
      <ToastProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </ToastProvider>
    </UserProvider>
  )
}
