import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const LoginPage: React.FC = () => {
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!emailRegex.test(email)) {
      setError('Inserisci un\'email valida');
      return;
    }
    if (!password) {
      setError('Inserisci la password');
      return;
    }
    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      const status = err?.status;
      if (status === 401) setError('Credenziali non valide');
      else if (status === 403) setError('Utente non abilitato');
      else setError(err?.message || 'Errore inaspettato');
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <form onSubmit={onSubmit} style={{ width: '100%', maxWidth: 420 }}>
        <h1 style={{ fontSize: 28, marginBottom: 12, textAlign: 'center' }}>SmartDesk</h1>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span>Email</span>
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nome@azienda.com"
              style={{ padding: 12, fontSize: 16, borderRadius: 8, border: '1px solid #ccc' }}
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span>Password</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{ padding: 12, fontSize: 16, borderRadius: 8, border: '1px solid #ccc' }}
            />
          </label>
          {error && (
            <div role="alert" style={{ color: '#b00020', fontSize: 14 }}>{error}</div>
          )}
          <button
            type="submit"
            disabled={isLoading}
            style={{
              padding: 14,
              fontSize: 18,
              borderRadius: 10,
              border: 'none',
              background: isLoading ? '#9aa' : '#0ea5e9',
              color: 'white',
              width: '100%',
            }}
          >
            {isLoading ? 'Accesso…' : 'Accedi'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default LoginPage;
