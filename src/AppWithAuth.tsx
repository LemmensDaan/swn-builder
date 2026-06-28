import { useEffect, useState } from 'react';
import App from './App';
import LoginScreen from './components/LoginScreen';

const isDev = import.meta.env.DEV;
const DEV_PASSWORD = 'test'; // Change to your test password

// Timing-safe password comparison
function comparePasswords(input: string, expected: string): boolean {
  const inputBytes = new TextEncoder().encode(input);
  const expectedBytes = new TextEncoder().encode(expected);

  if (inputBytes.length !== expectedBytes.length) {
    return false;
  }

  let mismatch = 0;
  for (let i = 0; i < inputBytes.length; i++) {
    mismatch |= inputBytes[i] ^ expectedBytes[i];
  }
  return mismatch === 0;
}

export default function AppWithAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const hasAuth = localStorage.getItem('swnauth') === 'true';
    setIsAuthenticated(hasAuth);
  }, []);

  const handleLogin = async (password: string): Promise<boolean> => {
    if (isDev) {
      // Local development: accept test password
      if (comparePasswords(password, DEV_PASSWORD)) {
        localStorage.setItem('swnauth', 'true');
        setIsAuthenticated(true);
        return true;
      }
      return false;
    } else {
      // Production: validate against /__auth/login endpoint
      try {
        const response = await fetch('/__auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password }),
        });

        if (response.ok) {
          localStorage.setItem('swnauth', 'true');
          setIsAuthenticated(true);
          return true;
        }
        return false;
      } catch {
        return false;
      }
    }
  };

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <span className="text-amber-400 text-sm font-medium tracking-wide animate-pulse">
          Stars Without Number
        </span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return <App />;
}
