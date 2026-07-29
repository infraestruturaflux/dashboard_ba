import { createContext, useContext, useState } from "react";
import { CREDENTIALS } from "@/constants/analistas";

const AuthContext = createContext(null);

const STORAGE_KEY = "ba_dashboard_auth";

function loadSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(loadSession);

  function login(username, password) {
    const cred = CREDENTIALS.find(
      (c) => c.username === username && c.password === password
    );
    if (!cred) return false;
    const session = { username: cred.username, role: cred.role, displayName: cred.displayName };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    setUser(session);
    return true;
  }

  function logout() {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, isAdmin: user?.role === "admin" }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
