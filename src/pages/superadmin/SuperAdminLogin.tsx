// TypeScript page component.
import { useState, type FormEvent } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { IconMail, IconLock } from '../../components/icons';
import { loginSuperAdmin, isSuperAdminAuthed, DEMO_LOGIN_HINT } from '../../lib/superAdminAuth';

export default function SuperAdminLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (isSuperAdminAuthed()) {
    return <Navigate to="/superadmin/dashboard" replace />;
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email.trim() || !password) { setError('Please enter both email and password.'); return; }
    setError('');
    setLoading(true);
    setTimeout(() => {
      const ok = loginSuperAdmin(email, password);
      setLoading(false);
      if (ok) {
        const dest = location.state?.from?.pathname || '/superadmin/dashboard';
        navigate(dest, { replace: true });
      } else {
        setError('Invalid email or password.');
      }
    }, 350);
  }

  return (
    <div className="sa-theme sa-login-page">
      <div className="sa-login-card">
        <div className="sa-login-brand">
          <div className="sa-login-logo">EMI</div>
          <div>
            <div className="sa-login-title">SaaS Owner Panel</div>
            <div className="sa-login-sub">Manage customers, payments &amp; pricing</div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <div className="sa-input-wrap">
              <IconMail />
              <input
                type="email" placeholder="owner@yourcompany.com" autoFocus
                value={email} onChange={e => setEmail(e.target.value)}
              />
            </div>
          </div>
          <div className="form-group">
            <label>Password</label>
            <div className="sa-input-wrap">
              <IconLock />
              <input
                type="password" placeholder="••••••••"
                value={password} onChange={e => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && <div className="sa-login-error">{error}</div>}

          <button type="submit" className="btn-primary btn sa-login-submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <div className="sa-login-hint">
          Demo credentials: <strong>{DEMO_LOGIN_HINT}</strong>
        </div>
      </div>
    </div>
  );
}
