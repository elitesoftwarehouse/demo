import React, { useMemo, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';

export type AuthPageProps = {
  baseUrl?: string; // API base
  onSuccess?: () => void; // called after successful login
  i18n?: (key: string) => string; // optional i18n function
};

function isValidEmail(email: string): boolean {
  const re = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
  return re.test((email || '').trim());
}

export const AuthPage: React.FC<AuthPageProps> = ({ baseUrl = '/api', onSuccess, i18n }) => {
  const { login, signup, loading, error } = useAuth(baseUrl);
  const [mode, setMode] = useState<'login' | 'signup'>('login');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const t = useMemo(() => {
    const F = i18n || ((k: string) => k);
    return (k: string) => F(k);
  }, [i18n]);

  const clientErrors = useMemo(() => {
    const errs: Record<string, string> = {};
    if (!isValidEmail(email)) errs.email = t('auth.email_invalid');
    if (!password || password.length < 6) errs.password = t('auth.password_too_short');
    if (mode === 'signup' && password !== confirm) errs.confirm = t('auth.password_mismatch');
    return errs;
  }, [email, password, confirm, mode, t]);

  const canSubmit = Object.keys(clientErrors).length === 0 && !loading;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched({ email: true, password: true, confirm: true });
    if (!canSubmit) return;
    try {
      if (mode === 'login') {
        await login(email.trim().toLowerCase(), password);
        onSuccess && onSuccess();
      } else {
        await signup(email.trim().toLowerCase(), password);
        // Optionally switch to login after successful signup
        setMode('login');
      }
    } catch {
      // errors handled via hook state
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.switcher}>
          <button
            type="button"
            onClick={() => setMode('login')}
            disabled={loading}
            style={{ ...styles.tab, ...(mode === 'login' ? styles.tabActive : {}) }}
          >
            {t('auth.login')}
          </button>
          <button
            type="button"
            onClick={() => setMode('signup')}
            disabled={loading}
            style={{ ...styles.tab, ...(mode === 'signup' ? styles.tabActive : {}) }}
          >
            {t('auth.signup')}
          </button>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>
            <span>{t('auth.email')}</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setTouched((s) => ({ ...s, email: true }))}
              placeholder="name@example.com"
              style={styles.input}
              required
            />
            {touched.email && clientErrors.email && (
              <span style={styles.error}>{clientErrors.email}</span>
            )}
          </label>

          <label style={styles.label}>
            <span>{t('auth.password')}</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => setTouched((s) => ({ ...s, password: true }))}
              placeholder={t('auth.password_placeholder')}
              style={styles.input}
              required
              minLength={6}
            />
            {touched.password && clientErrors.password && (
              <span style={styles.error}>{clientErrors.password}</span>
            )}
          </label>

          {mode === 'signup' && (
            <label style={styles.label}>
              <span>{t('auth.confirm_password')}</span>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                onBlur={() => setTouched((s) => ({ ...s, confirm: true }))}
                placeholder={t('auth.confirm_password_placeholder')}
                style={styles.input}
                required
                minLength={6}
              />
              {touched.confirm && clientErrors.confirm && (
                <span style={styles.error}>{clientErrors.confirm}</span>
              )}
            </label>
          )}

          {error && (
            <div role="alert" style={styles.backendError}>
              {t(`error.${error}`)}
            </div>
          )}

          <button type="submit" disabled={!canSubmit} style={styles.submit}>
            {loading ? t('auth.loading') : mode === 'login' ? t('auth.login') : t('auth.signup')}
          </button>
        </form>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    background: '#f6f7fb',
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    background: '#fff',
    borderRadius: 8,
    boxShadow: '0 6px 24px rgba(0,0,0,0.08)',
    padding: 24,
  },
  switcher: {
    display: 'flex',
    marginBottom: 16,
    background: '#f0f2f5',
    borderRadius: 8,
    overflow: 'hidden',
  },
  tab: {
    flex: 1,
    padding: '10px 12px',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
  },
  tabActive: {
    background: '#fff',
    boxShadow: 'inset 0 -2px 0 #2c7be5',
    fontWeight: 600,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  label: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    fontSize: 14,
  },
  input: {
    padding: '10px 12px',
    borderRadius: 6,
    border: '1px solid #d9dde3',
    outline: 'none',
  },
  error: {
    color: '#c92a2a',
    fontSize: 12,
  },
  backendError: {
    color: '#c92a2a',
    background: '#fff5f5',
    border: '1px solid #ffc9c9',
    padding: '8px 10px',
    borderRadius: 6,
    fontSize: 13,
  },
  submit: {
    marginTop: 8,
    padding: '10px 12px',
    background: '#2c7be5',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    fontWeight: 600,
  },
};

export default AuthPage;
