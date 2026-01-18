import React, { useState } from 'react';
import { login } from '../../../lib/authService';
import { saveTokens } from '../../../lib/authToken';
import { useAuth } from '../../../lib/authContext';

export interface LoginFormProps {
  apiBaseUrl?: string;
  onSuccess?: (data: any) => void;
}

export function LoginForm({ apiBaseUrl = '', onSuccess }: LoginFormProps) {
  const { setAuthenticated } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await login({ email, password }, apiBaseUrl);
      saveTokens(res.accessToken, res.refreshToken, res.expiresIn);
      setAuthenticated(true);
      onSuccess?.(res);
    } catch (e: any) {
      setError(e?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <div style={{ marginBottom: 12 }}>
        <label style={{ display: 'block', fontSize: 12 }}>Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={{ display: 'block', fontSize: 12 }}>Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </div>
      {error && <div style={{ color: 'red', marginBottom: 8 }}>{error}</div>}
      <button type="submit" disabled={loading}>
        {loading ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
}

export default LoginForm;
