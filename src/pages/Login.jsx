import { useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { sendPasswordResetEmail, signInWithEmailAndPassword } from 'firebase/auth';
import { auth, isFirebaseConfigured } from '../firebase';
import { useAuth } from '../auth/useAuth';
import logo from '../assets/logo.png';

// Friendly messages for Firebase Auth error codes
const MESSAGES = {
  'auth/invalid-credential': 'Incorrect email or password.',
  'auth/wrong-password': 'Incorrect email or password.',
  'auth/user-not-found': 'Incorrect email or password.',
  'auth/invalid-email': 'Enter a valid email address.',
  'auth/user-disabled': 'This account has been disabled.',
  'auth/too-many-requests': 'Too many attempts. Please wait a few minutes and try again.',
  'auth/network-request-failed': 'No connection. Check your internet and try again.',
  'auth/operation-not-allowed': 'Email/password sign-in is not enabled for this project yet.',
};
const message = (e) => MESSAGES[e.code] || e.message;

// Only allow redirects back into the portal
const safeNext = (next) => (next && next.startsWith('/admin') ? next : '/admin');

export default function Login() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  if (!isFirebaseConfigured || user) return <Navigate to={next} replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    setBusy(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      // The redirect happens once the user is known (see the Navigate above)
    } catch (err) {
      setError(message(err));
      setBusy(false);
    }
  };

  const handleReset = async () => {
    setError('');
    setInfo('');
    if (!email.trim()) {
      setError('Enter your email above, then click “Forgot password?” again.');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setInfo(`If ${email.trim()} has an account, a password reset link is on its way. Check your inbox.`);
    } catch (err) {
      setError(message(err));
    }
  };

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleSubmit} noValidate>
        <img src={logo} alt="SN Enterprises" className="login-logo" />
        <h1>Sign in to SN Enterprises</h1>
        <p className="muted">For SN Enterprises staff only.</p>

        {error && <div className="alert alert-error" role="alert">{error}</div>}
        {info && <div className="alert alert-success" role="status">{info}</div>}

        <label className="field">
          <span>Email</span>
          <input className="input" type="email" autoComplete="username" autoFocus value={email}
            onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="field">
          <span>Password</span>
          <div className="password-wrap">
            <input className="input" type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password}
              onChange={(e) => setPassword(e.target.value)} />
            <button type="button" className="password-toggle" onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}>
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </label>
        <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
          {busy ? <><span className="spinner" /> Signing in…</> : 'Sign in'}
        </button>
        <div className="login-links">
          <button type="button" className="link-btn" onClick={handleReset}>Forgot password?</button>
        </div>
      </form>
    </div>
  );
}
