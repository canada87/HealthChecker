import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { UserProvider, useUser } from './contexts/UserContext'
import SelectUser from './pages/SelectUser'
import Home from './pages/Home'
import History from './pages/History'
import Stats from './pages/Stats'
import Settings from './pages/Settings'
import Admin from './pages/Admin'
import BottomNav from './components/BottomNav'

function AppRoutes() {
  const { currentUser } = useUser()

  if (!currentUser) return <SelectUser />

  return (
    <div className="flex flex-col h-screen bg-slate-50 max-w-lg mx-auto">
      <div className="flex-1 overflow-y-auto">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/history" element={<History />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      <BottomNav />
    </div>
  )
}

export default function App() {
  return (
    <UserProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </UserProvider>
  )
}
