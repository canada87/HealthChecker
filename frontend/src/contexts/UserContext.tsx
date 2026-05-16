import { createContext, useContext, useState, type ReactNode } from 'react'
import type { User } from '../types'

interface UserContextType {
  currentUser: User | null
  setCurrentUser: (user: User | null) => void
}

const UserContext = createContext<UserContextType>({ currentUser: null, setCurrentUser: () => {} })

export function UserProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUserState] = useState<User | null>(() => {
    const saved = localStorage.getItem('ht_user')
    return saved ? JSON.parse(saved) : null
  })

  const setCurrentUser = (user: User | null) => {
    setCurrentUserState(user)
    if (user) localStorage.setItem('ht_user', JSON.stringify(user))
    else localStorage.removeItem('ht_user')
  }

  return (
    <UserContext.Provider value={{ currentUser, setCurrentUser }}>
      {children}
    </UserContext.Provider>
  )
}

export const useUser = () => useContext(UserContext)
