import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/auth';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Basic validation
    const emailOk = /.+@.+\..+/.test(email.trim());
    if (!emailOk) {
      setError('Inserisci un indirizzo email valido');
      return;
    }
    if (!password) {
      setError('Inserisci la password');
      return;
    }

    setLoading(true);
    try {
      await login(email.trim(), password);
      navigate('/');
    } catch (err: any) {
      if (err?.status === 401) setError('Email o password non corrette');
      else if (err?.status === 403) setError('Utente non abilitato all\'accesso');
      else setError(err?.message || 'Errore di autenticazione');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <h1 style={titleStyle}>SmartDesk</h1>
        <form onSubmit={onSubmit} style={formStyle}>
          {error && <div style={errorStyle} role="alert">{error}</div>}
          <label style={labelStyle}>
            Email
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nome@azienda.com"
              style={inputStyle}
              required
            />
          </label>
          <label style={labelStyle}>
            Password
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={inputStyle}
              required
            />
          </label>
          <button type="submit" style={{ ...buttonStyle, opacity: loading ? 0.7 : 1 }} disabled={loading}>
            {loading ? 'Accesso…' : 'Accedi'}
          </button>
        </form>
      </div>
    </div>
  );
}

// Inline styles for simplicity and mobile-first
const containerStyle: React.CSSProperties = {
  minHeight: '100dvh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#0f172a',
  padding: '16px',
};

const cardStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: 420,
  background: '#ffffff',
  borderRadius: 12,
  padding: 24,
  boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  marginBottom: 12,
  fontSize: 28,
  textAlign: 'center',
};

const formStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
};

const labelStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  fontSize: 14,
};

const inputStyle: React.CSSProperties = {
  marginTop: 6,
  fontSize: 16,
  padding: '14px 16px',
  borderRadius: 10,
  border: '1px solid #e5e7eb',
};

const buttonStyle: React.CSSProperties = {
  marginTop: 8,
  fontSize: 16,
  fontWeight: 600,
  padding: '14px 16px',
  borderRadius: 10,
  border: 'none',
  background: '#2563eb',
  color: 'white',
};

const errorStyle: React.CSSProperties = {
  background: '#fee2e2',
  color: '#991b1b',
  padding: '10px 12px',
  borderRadius: 8,
  fontSize: 14,
};
