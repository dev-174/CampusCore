import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';

export default function ClaimPage() {
  const [step, setStep]         = useState(1);
  const [role, setRole]         = useState('');
  const [code, setCode]         = useState('');
  const [email, setEmail]       = useState('');
  const [foundName, setFoundName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');
  const [loading, setLoading]   = useState(false);

  const verify = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await api.post('auth/claim/verify/', {
        role, university_code: code.trim().toUpperCase(), email: email.trim().toLowerCase()
      });
      setFoundName(res.data.name);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.error || 'Verification failed.');
    } finally { setLoading(false); }
  };

  const setPass = async (e) => {
    e.preventDefault();
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setLoading(true); setError('');
    try {
      await api.post('auth/claim/set-password/', { email, password });
      setSuccess('🎉 Account activated! You can now login.');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to set password.');
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-box">
        <div className="auth-logo">🎓 CampusCore</div>
        <h1 className="auth-title">Claim Your Account</h1>
        <p className="auth-sub">
          {step === 1 ? 'Step 1 of 2 — Verify your identity' : `Step 2 of 2 — Hi ${foundName}, set your password`}
        </p>

        {error   && <div className="alert alert-error">⚠️ {error}</div>}
        {success && (
          <div className="alert alert-ok">
            {success} <Link to="/login" style={{ color: 'var(--accent-h)', marginLeft: 8 }}>→ Login</Link>
          </div>
        )}

        {!success && step === 1 && (
          <form onSubmit={verify}>
            <div className="form-group">
              <label className="form-label">I am a…</label>
              <select className="form-select" value={role} onChange={e => setRole(e.target.value)} required>
                <option value="">Select role</option>
                <option value="student">Student</option>
                <option value="faculty">Faculty</option>
                <option value="parent">Parent</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">University Code</label>
              <input className="form-input" type="text" value={code}
                onChange={e => setCode(e.target.value)} placeholder="e.g. UNI-A3X9K2" required />
            </div>
            <div className="form-group">
              <label className="form-label">Email (as added by admin)</label>
              <input className="form-input" type="email" value={email}
                onChange={e => setEmail(e.target.value)} placeholder="your@email.com" required />
            </div>
            <button className="btn btn-primary" type="submit"
              style={{ width: '100%', padding: '10px', justifyContent: 'center' }} disabled={loading}>
              {loading ? <span className="spinner" /> : 'Verify →'}
            </button>
          </form>
        )}

        {!success && step === 2 && (
          <form onSubmit={setPass}>
            <div className="form-group">
              <label className="form-label">New Password</label>
              <input className="form-input" type="password" value={password}
                onChange={e => setPassword(e.target.value)} placeholder="Min 8 characters" required minLength={8} />
            </div>
            <div className="form-group">
              <label className="form-label">Confirm Password</label>
              <input className="form-input" type="password" value={confirm}
                onChange={e => setConfirm(e.target.value)} placeholder="Repeat password" required />
            </div>
            <button className="btn btn-primary" type="submit"
              style={{ width: '100%', padding: '10px', justifyContent: 'center' }} disabled={loading}>
              {loading ? <span className="spinner" /> : 'Activate Account ✓'}
            </button>
          </form>
        )}

        <p style={{ marginTop: 16, textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-2)' }}>
          <Link to="/login" style={{ color: 'var(--accent-h)' }}>← Back to Login</Link>
        </p>
      </div>
    </div>
  );
}
