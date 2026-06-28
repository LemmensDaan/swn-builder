import { useState } from 'react';

interface LoginScreenProps {
  onLogin: (password: string) => Promise<boolean>;
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const success = await onLogin(password);
      if (!success) {
        setError('Invalid password');
        setPassword('');
      }
    } catch (err) {
      setError('Authentication failed. Please try again.');
      setPassword('');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="bg-gray-900 border border-amber-400/20 rounded-lg p-8 shadow-2xl">
          <h1 className="text-2xl font-bold text-amber-400 text-center mb-2">SWN Builder</h1>
          <p className="text-gray-400 text-center text-sm mb-8">Stars Without Number Complete Toolset</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter password"
                disabled={isLoading}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-500 focus:outline-none focus:border-amber-400 disabled:opacity-50 disabled:cursor-not-allowed"
                autoFocus
              />
            </div>

            {error && (
              <div className="text-red-400 text-sm text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={!password || isLoading}
              className="w-full bg-amber-600 hover:bg-amber-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded transition-colors"
            >
              {isLoading ? 'Logging in...' : 'Access'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
