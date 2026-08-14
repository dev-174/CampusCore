import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { IconEye, IconEyeOff } from '../components/Icons';
import logoImg from '../assets/logo.jfif';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(username, password);
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid username or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPass = () => {
    navigate('/forgot-password');
  };

  const handleSSO = () => {
    alert('Single Sign-On (SSO) is currently disabled for this workspace. Please use your standard login credentials.');
  };

  return (
    <div className="auth-page">
      {/* Left panel - SaaS Product Presentation */}
      <div className="auth-left-panel">
        <div className="auth-left-logo" onClick={() => navigate('/')}>
          <div className="brand-logo-wrapper">
            <img src={logoImg} className="brand-logo-img" alt="CampusCore Logo" />
          </div>
          <span>CampusCore</span>
        </div>

        <div className="auth-marketing-content">
          <h2>The operating system for modern education.</h2>
          <div className="auth-marketing-list">
            <div className="auth-marketing-item">
              <div className="auth-marketing-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
                </svg>
              </div>
              <div className="auth-marketing-text">
                <h4>Analytics & Insights</h4>
                <p>Monitor student distributions, outliers, and grade fluctuations in real-time.</p>
              </div>
            </div>
            <div className="auth-marketing-item">
              <div className="auth-marketing-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="auth-marketing-text">
                <h4>Predictive Intelligence</h4>
                <p>Machine learning models identify performance drops before midterms close.</p>
              </div>
            </div>
            <div className="auth-marketing-item">
              <div className="auth-marketing-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="auth-marketing-text">
                <h4>Role-Based Portals</h4>
                <p>Custom dashboards tailored specifically for students, faculty, and parents.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="auth-left-footer">
          <div className="auth-glass-testimonial">
            <p>&ldquo;CampusCore has completely digitized our academic workflows. The efficiency gains are incredible.&rdquo;</p>
            <div className="auth-glass-testimonial-author">Dr. Sunita Rao &bull; Academic Affairs</div>
          </div>
        </div>
      </div>

      {/* Right panel - Form Area */}
      <div className="auth-right-panel">
        <div className="auth-box-wrapper">
          <div className="auth-top-bar">
            <button type="button" className="auth-back-link" onClick={() => navigate('/')}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to website
            </button>
            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
              New here? <Link to="/register" style={{ color: 'var(--accent)', fontWeight: 600 }}>Create account</Link>
            </span>
          </div>

          <div className="auth-box">
            <h1 className="auth-title">Welcome back</h1>
            <p className="auth-sub">Sign in to your CampusCore account</p>

            {error && (
              <div className="alert-error">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label" htmlFor="login-username">Username or Email</label>
                <div className="input-icon-wrapper">
                  <span className="input-icon-left">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.206" />
                    </svg>
                  </span>
                  <input
                    id="login-username"
                    className="form-input input-with-icon"
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="Enter your username or email"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                  <label className="form-label" htmlFor="login-password">Password</label>
                  <button
                    type="button"
                    onClick={handleForgotPass}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--accent)',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: 0
                    }}
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="password-input-wrapper">
                  <span className="input-icon-left">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </span>
                  <input
                    id="login-password"
                    className="form-input input-with-icon"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="•••••••••••••"
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <IconEyeOff width={18} height={18} />
                    ) : (
                      <IconEye width={18} height={18} />
                    )}
                  </button>
                </div>
              </div>

              <button id="login-btn" className="auth-btn-primary" type="submit" style={{ marginTop: 12 }} disabled={loading}>
                {loading ? <span className="spinner" /> : 'Sign in'}
              </button>
            </form>

            <div className="auth-divider">or continue with</div>

            <button type="button" className="sso-btn" onClick={handleSSO}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Single Sign-On (SSO)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
