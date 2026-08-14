import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { IconEye, IconEyeOff } from '../components/Icons';
import logoImg from '../assets/logo.jfif';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('join'); // 'join' = claim account, 'new' = new university
  const [form, setForm] = useState({
    role: '',
    username: '',
    email: '',
    password: '',
    invite_code: '',
    university_name: '',
    admin_name: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [selectOpen, setSelectOpen] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const f = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (tab === 'join') {
        if (!form.role) {
          setError('Please select your role (Student, Faculty, or Parent).');
          setLoading(false);
          return;
        }

        // Step 1: Verify the identity
        const verifyRes = await api.post('auth/claim/verify/', {
          role: form.role,
          university_code: form.invite_code.trim().toUpperCase(),
          email: form.email.trim().toLowerCase()
        });

        // Step 2: Set the password and activate account with chosen username
        await api.post('auth/claim/set-password/', {
          email: form.email.trim().toLowerCase(),
          username: form.username.trim(),
          password: form.password
        });

        setSuccess(`🎉 Welcome ${verifyRes.data.name || ''}! Your account has been claimed and activated successfully. Redirecting to login...`);
        setTimeout(() => navigate('/login'), 3500);

      } else {
        // Register brand-new university
        const res = await api.post('auth/register-university/', {
          university_name: form.university_name,
          name: form.admin_name,
          username: form.username.trim(),
          email: form.email.trim().toLowerCase(),
          password: form.password,
        });

        setSuccess(`✅ University created! Code: ${res.data.university_code} — Share this code with students and faculty so they can claim their accounts.`);
      }
    } catch (err) {
      const d = err.response?.data;
      if (d && typeof d === 'object') {
        const msg = d.error || Object.values(d).flat().join(' ');
        setError(msg || 'An error occurred.');
      } else {
        setError('Something went wrong. Please check your credentials and try again.');
      }
    } finally {
      setLoading(false);
    }
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
              Already registered? <Link to="/login" style={{ color: 'var(--accent)', fontWeight: 600 }}>Sign in</Link>
            </span>
          </div>

          <div className="auth-box">
            {/* Tab Selection */}
            <div className="auth-tabs">
              <button
                type="button"
                className={`auth-tab ${tab === 'join' ? 'active' : ''}`}
                onClick={() => { setTab('join'); setError(''); setSuccess(''); }}
              >
                Join University
              </button>
              <button
                type="button"
                className={`auth-tab ${tab === 'new' ? 'active' : ''}`}
                onClick={() => { setTab('new'); setError(''); setSuccess(''); }}
              >
                Register University
              </button>
            </div>

            <h1 className="auth-title">
              {tab === 'join' ? 'Create your account' : 'Register University'}
            </h1>
            <p className="auth-sub">
              {tab === 'join'
                ? 'You need an invite code to join CampusCore'
                : 'Register a new university and set up the primary admin account'
              }
            </p>

            {error && (
              <div className="alert-error">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="alert alert-ok">
                <span>{success}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {tab === 'join' && (
                <div className="form-group">
                  <label className="form-label">I am a…</label>
                  <div className="custom-select-container">
                    <button
                      type="button"
                      className={`custom-select-trigger ${selectOpen ? 'active' : ''}`}
                      onClick={() => setSelectOpen(!selectOpen)}
                    >
                      <span>
                        {form.role
                          ? form.role.charAt(0).toUpperCase() + form.role.slice(1)
                          : 'Select your role'}
                      </span>
                      <svg
                        style={{ transform: selectOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', color: '#9ca3af' }}
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {selectOpen && (
                      <div className="custom-select-options">
                        {['student', 'faculty', 'parent'].map((roleOpt) => {
                          const isSelected = form.role === roleOpt;
                          return (
                            <div
                              key={roleOpt}
                              className={`custom-select-option ${isSelected ? 'selected' : ''}`}
                              onClick={() => {
                                setForm({ ...form, role: roleOpt });
                                setSelectOpen(false);
                              }}
                            >
                              <span>{roleOpt.charAt(0).toUpperCase() + roleOpt.slice(1)}</span>
                              {isSelected && (
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {tab === 'join' && (
                <div className="form-group">
                  <label className="form-label" htmlFor="register-username">Username</label>
                  <div className="input-icon-wrapper">
                    <span className="input-icon-left">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </span>
                    <input
                      id="register-username"
                      className="form-input input-with-icon"
                      type="text"
                      value={form.username}
                      onChange={f('username')}
                      placeholder="Choose a username"
                      required
                    />
                  </div>
                </div>
              )}

              {tab === 'new' && (
                <div className="form-group">
                  <label className="form-label" htmlFor="register-uni-name">University Name</label>
                  <div className="input-icon-wrapper">
                    <span className="input-icon-left">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </span>
                    <input
                      id="register-uni-name"
                      className="form-input input-with-icon"
                      type="text"
                      value={form.university_name}
                      onChange={f('university_name')}
                      placeholder="e.g. MIT University"
                      required
                    />
                  </div>
                </div>
              )}

              {tab === 'new' && (
                <div className="form-group">
                  <label className="form-label" htmlFor="register-admin-name">Admin Name</label>
                  <div className="input-icon-wrapper">
                    <span className="input-icon-left">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </span>
                    <input
                      id="register-admin-name"
                      className="form-input input-with-icon"
                      type="text"
                      value={form.admin_name}
                      onChange={f('admin_name')}
                      placeholder="e.g. Dr. Siddharth Verma"
                      required
                    />
                  </div>
                </div>
              )}

              {tab === 'new' && (
                <div className="form-group">
                  <label className="form-label" htmlFor="register-username-new">Username</label>
                  <div className="input-icon-wrapper">
                    <span className="input-icon-left">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </span>
                    <input
                      id="register-username-new"
                      className="form-input input-with-icon"
                      type="text"
                      value={form.username}
                      onChange={f('username')}
                      placeholder="Choose an admin username"
                      required
                    />
                  </div>
                </div>
              )}

              <div className="form-group">
                <label className="form-label" htmlFor="register-email">Email address</label>
                <div className="input-icon-wrapper">
                  <span className="input-icon-left">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </span>
                  <input
                    id="register-email"
                    className="form-input input-with-icon"
                    type="email"
                    value={form.email}
                    onChange={f('email')}
                    placeholder="your@institution.edu"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="register-password">Password</label>
                <div className="password-input-wrapper">
                  <span className="input-icon-left">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </span>
                  <input
                    id="register-password"
                    className="form-input input-with-icon"
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={f('password')}
                    placeholder="Create a strong password"
                    required
                    minLength={8}
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

              {tab === 'join' && (
                <div className="form-group">
                  <label className="form-label" htmlFor="register-invite">
                    Invite code <span className="required-badge">Required</span>
                  </label>
                  <div className="input-icon-wrapper">
                    <span className="input-icon-left">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m-5-4a5 5 0 015 5c0 2.079-1.2 3.879-3 4.722V17a2 2 0 01-2 2H9a2 2 0 01-2-2v-2.278A5.001 5.001 0 0112 5z" />
                      </svg>
                    </span>
                    <input
                      id="register-invite"
                      className="form-input input-with-icon"
                      type="text"
                      value={form.invite_code}
                      onChange={f('invite_code')}
                      placeholder="Enter your invite code"
                      required
                    />
                  </div>
                </div>
              )}

              <button className="auth-btn-primary" type="submit" style={{ marginTop: 16 }} disabled={loading}>
                {loading ? <span className="spinner" /> : tab === 'join' ? 'Create account' : 'Create university'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
