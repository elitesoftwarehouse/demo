import React from 'react';
import { useAuth } from '../context/AuthContext';

// Simple, responsive profile page for viewing/updating basic user data
// Fields: firstName, lastName, avatarUrl (URL). Uses AuthContext tokens to call backend.
// Endpoints assumed:
//  - GET /api/profile -> { firstName?, lastName?, avatarUrl? }
//  - PUT /api/profile -> accepts same fields and returns updated object

const MAX_NAME_LEN = 100;
const MAX_URL_LEN = 2048;

type ProfilePayload = {
  firstName?: string | null;
  lastName?: string | null;
  avatarUrl?: string | null;
};

const ProfilePage: React.FC = () => {
  const { tokens } = useAuth();

  const [form, setForm] = React.useState<ProfilePayload>({
    firstName: '',
    lastName: '',
    avatarUrl: '',
  });
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  const accessToken = tokens?.accessToken;

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const validate = (data: ProfilePayload): string | null => {
    const fn = (data.firstName || '').trim();
    const ln = (data.lastName || '').trim();
    const av = (data.avatarUrl || '').trim();

    if (fn.length > MAX_NAME_LEN) return `Il nome non può superare ${MAX_NAME_LEN} caratteri.`;
    if (ln.length > MAX_NAME_LEN) return `Il cognome non può superare ${MAX_NAME_LEN} caratteri.`;
    if (av.length > 0) {
      if (av.length > MAX_URL_LEN) return `L'URL dell'avatar non può superare ${MAX_URL_LEN} caratteri.`;
      try {
        // Basic URL validation
        // eslint-disable-next-line no-new
        new URL(av);
      } catch {
        return 'L\'URL dell\'avatar non è valido.';
      }
    }
    return null;
  };

  const loadProfile = React.useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch('/api/profile', {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!res.ok) {
        const msg = `Errore nel caricamento del profilo (${res.status})`;
        setError(msg);
        return;
      }
      const data = await res.json();
      setForm({
        firstName: data.firstName ?? '',
        lastName: data.lastName ?? '',
        avatarUrl: data.avatarUrl ?? '',
      });
    } catch (e: any) {
      setError('Impossibile caricare il profilo. Controlla la connessione.');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  React.useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const validation = validate(form);
    if (validation) {
      setError(validation);
      return;
    }

    if (!accessToken) {
      setError('Sessione non valida. Effettua nuovamente il login.');
      return;
    }

    setSaving(true);
    try {
      const payload: ProfilePayload = {
        firstName: (form.firstName || '').trim() || null,
        lastName: (form.lastName || '').trim() || null,
        avatarUrl: (form.avatarUrl || '').trim() || null,
      };

      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let msg = `Aggiornamento non riuscito (${res.status})`;
        try {
          const err = await res.json();
          if (err?.message) msg = err.message;
        } catch { /* ignore parse */ }
        setError(msg);
        return;
      }

      const updated = await res.json();
      setForm({
        firstName: updated.firstName ?? '',
        lastName: updated.lastName ?? '',
        avatarUrl: updated.avatarUrl ?? '',
      });
      setSuccess('Profilo aggiornato con successo.');
    } catch (e: any) {
      setError('Si è verificato un errore durante il salvataggio.');
    } finally {
      setSaving(false);
    }
  };

  const avatarSrc = (form.avatarUrl || '').trim();

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '1rem' }}>
      <h1 style={{ marginBottom: '1rem' }}>Profilo utente</h1>

      {loading && <div>Caricamento in corso…</div>}
      {error && (
        <div style={{ background: '#fde8e8', color: '#611a15', padding: '0.75rem', borderRadius: 6, marginBottom: '1rem' }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{ background: '#e6ffed', color: '#1e4620', padding: '0.75rem', borderRadius: 6, marginBottom: '1rem' }}>
          {success}
        </div>
      )}

      <form onSubmit={onSubmit} style={{ display: 'grid', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ width: 96, height: 96, borderRadius: '50%', overflow: 'hidden', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {avatarSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarSrc} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ color: '#6b7280' }}>No avatar</span>
            )}
          </div>
          <div style={{ flex: 1, minWidth: 260 }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>URL Avatar</label>
            <input
              type="url"
              name="avatarUrl"
              placeholder="https://..."
              value={form.avatarUrl || ''}
              onChange={onChange}
              maxLength={MAX_URL_LEN}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: 6 }}
            />
            <small style={{ color: '#6b7280' }}>Puoi incollare l'URL di un'immagine (PNG/JPG/SVG) accessibile pubblicamente.</small>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Nome</label>
            <input
              type="text"
              name="firstName"
              value={form.firstName || ''}
              onChange={onChange}
              maxLength={MAX_NAME_LEN}
              placeholder="Mario"
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: 6 }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Cognome</label>
            <input
              type="text"
              name="lastName"
              value={form.lastName || ''}
              onChange={onChange}
              maxLength={MAX_NAME_LEN}
              placeholder="Rossi"
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: 6 }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button type="submit" disabled={saving} style={{ padding: '0.5rem 1rem', background: '#111827', color: '#fff', border: 0, borderRadius: 6 }}>
            {saving ? 'Salvataggio…' : 'Salva modifiche'}
          </button>
          <button type="button" onClick={() => void loadProfile()} disabled={loading || saving} style={{ padding: '0.5rem 1rem', background: '#e5e7eb', color: '#111827', border: 0, borderRadius: 6 }}>
            Ricarica
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProfilePage;
