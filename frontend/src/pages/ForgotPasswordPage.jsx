import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { IconEye, IconEyeOff } from '../components/Icons';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();

  // Step state: 1 = Email, 2 = OTP, 3 = New Password, 4 = Success
  const [step, setStep] = useState(1);

  // Form values
  const [email, setEmail] = useState('');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');

  // Timers
  const [expirySeconds, setExpirySeconds] = useState(600); // 10 minutes OTP validity
  const [resendCooldown, setResendCooldown] = useState(60);  // 60s resend rate-limit

  const otpInputRefs = [
    useRef(null),
    useRef(null),
    useRef(null),
    useRef(null),
    useRef(null),
    useRef(null),
  ];

  // Expiry countdown timer (10 mins)
  useEffect(() => {
    let timer = null;
    if (step === 2 && expirySeconds > 0) {
      timer = setInterval(() => {
        setExpirySeconds((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [step, expirySeconds]);

  // Resend cooldown timer (60s)
  useEffect(() => {
    let timer = null;
    if (step === 2 && resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [step, resendCooldown]);

  // Format seconds to MM:SS
  const formatTime = (totalSec) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Step 1: Request OTP
  const handleRequestOTP = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setError('');
    setInfoMessage('');

    try {
      const res = await api.post('auth/forgot-password/request-otp/', {
        email: email.trim().toLowerCase(),
      });
      setInfoMessage(res.data.message || 'OTP sent successfully to your email.');
      setExpirySeconds(600);
      setResendCooldown(60);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to request OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Handle OTP input digit changes
  const handleOtpDigitChange = (index, value) => {
    // Only accept numeric digit
    if (value && !/^\d+$/.test(value)) return;

    const updated = [...otpDigits];
    updated[index] = value.slice(-1); // keep last character if typed
    setOtpDigits(updated);
    setError('');

    // Auto-focus next input
    if (value && index < 5) {
      otpInputRefs[index + 1].current?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs[index - 1].current?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    if (/^\d{6}$/.test(pastedData)) {
      const digits = pastedData.split('');
      setOtpDigits(digits);
      otpInputRefs[5].current?.focus();
      setError('');
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    const otp = otpDigits.join('');
    if (otp.length < 6) {
      setError('Please enter all 6 digits of the OTP.');
      return;
    }

    setLoading(true);
    setError('');
    setInfoMessage('');

    try {
      await api.post('auth/forgot-password/verify-otp/', {
        email: email.trim().toLowerCase(),
        otp,
      });
      setStep(3);
    } catch (err) {
      const errMsg = err.response?.data?.error || 'Invalid OTP. Please check and try again.';
      setError(errMsg);
      if (errMsg.includes('Maximum wrong OTP attempts exceeded')) {
        setOtpDigits(['', '', '', '', '', '']);
        setExpirySeconds(0);
        setResendCooldown(0);
      }
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP action
  const handleResendOTP = async () => {
    if (resendCooldown > 0 || resendLoading) return;

    setResendLoading(true);
    setError('');
    setInfoMessage('');

    try {
      const res = await api.post('auth/forgot-password/request-otp/', {
        email: email.trim().toLowerCase(),
      });
      setInfoMessage(res.data.message || 'A new OTP has been sent to your email.');
      setOtpDigits(['', '', '', '', '', '']);
      setExpirySeconds(600);
      setResendCooldown(60);
      otpInputRefs[0].current?.focus();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to resend OTP.');
    } finally {
      setResendLoading(false);
    }
  };

  // Step 3: Reset Password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await api.post('auth/forgot-password/reset-password/', {
        email: email.trim().toLowerCase(),
        otp: otpDigits.join(''),
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      setStep(4);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* Left panel - SaaS Product Presentation */}
      <div className="auth-left-panel">
        <div className="auth-left-logo" onClick={() => navigate('/')}>
          <div className="landing-logo-badge">CC</div>
          <span>CampusCore</span>
        </div>

        <div className="auth-marketing-content">
          <h2>Account Security & Recovery</h2>
          <div className="auth-marketing-list">
            <div className="auth-marketing-item">
              <div className="auth-marketing-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div className="auth-marketing-text">
                <h4>End-to-End Encryption</h4>
                <p>Your password reset session is protected with single-use hashed verification codes.</p>
              </div>
            </div>

            <div className="auth-marketing-item">
              <div className="auth-marketing-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="auth-marketing-text">
                <h4>Instant Dispatch</h4>
                <p>One-Time Passwords are sent immediately to your verified institution email.</p>
              </div>
            </div>

            <div className="auth-marketing-item">
              <div className="auth-marketing-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div className="auth-marketing-text">
                <h4>Strict Anti-Spam</h4>
                <p>Rate-limiting and attempt caps safeguard your account against unauthorized reset requests.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="auth-left-footer">
          <div className="auth-glass-testimonial">
            <p>&ldquo;CampusCore's self-service security options keep institutional accounts safe and accessible 24/7.&rdquo;</p>
            <div className="auth-glass-testimonial-author">Campus Security Infrastructure</div>
          </div>
        </div>
      </div>

      {/* Right panel - Form Area */}
      <div className="auth-right-panel">
        <div className="auth-box-wrapper">
          <div className="auth-top-bar">
            <button type="button" className="auth-back-link" onClick={() => navigate('/login')}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to login
            </button>
            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
              Remember password? <Link to="/login" style={{ color: '#6366f1', fontWeight: 600 }}>Sign in</Link>
            </span>
          </div>

          <div className="auth-box">
            {/* Step Indicators */}
            {step < 4 && (
              <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
                {[1, 2, 3].map((s) => (
                  <div
                    key={s}
                    style={{
                      flex: 1,
                      height: '4px',
                      borderRadius: '2px',
                      background: s <= step ? 'linear-gradient(90deg, #6366f1, #8b5cf6)' : '#e2e8f0',
                      transition: 'background 0.3s ease',
                    }}
                  />
                ))}
              </div>
            )}

            {/* Error Banner */}
            {error && (
              <div className="alert-error" style={{ marginBottom: '20px' }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Success Info Banner */}
            {infoMessage && (
              <div className="alert-ok" style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{infoMessage}</span>
              </div>
            )}

            {/* STEP 1: Enter Registered Email */}
            {step === 1 && (
              <>
                <h1 className="auth-title">Forgot Password?</h1>
                <p className="auth-sub">Enter your registered institution email to receive a 6-digit verification OTP.</p>

                <form onSubmit={handleRequestOTP}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="reset-email">Email Address</label>
                    <div className="input-icon-wrapper">
                      <span className="input-icon-left">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </span>
                      <input
                        id="reset-email"
                        className="form-input input-with-icon"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@university.edu"
                        required
                        autoFocus
                      />
                    </div>
                  </div>

                  <button
                    id="request-otp-btn"
                    className="auth-btn-primary"
                    type="submit"
                    style={{ marginTop: '16px' }}
                    disabled={loading}
                  >
                    {loading ? <span className="spinner" /> : 'Send Reset OTP →'}
                  </button>
                </form>
              </>
            )}

            {/* STEP 2: Enter OTP & Countdown Timer */}
            {step === 2 && (
              <>
                <h1 className="auth-title">Enter Verification OTP</h1>
                <p className="auth-sub">
                  We sent a 6-digit code to <strong>{email}</strong>.
                </p>

                {/* Live Expiry Timer Badge */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justify: 'space-between',
                    background: expirySeconds > 60 ? 'var(--accent-soft, #f0eefd)' : 'var(--danger-soft, #fef2f2)',
                    color: expirySeconds > 60 ? 'var(--accent-h, #5b4bd6)' : 'var(--danger, #ef4444)',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    marginBottom: '20px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{expirySeconds > 0 ? 'OTP Expires in' : 'OTP Expired'}</span>
                  </div>
                  <span style={{ fontFamily: 'monospace', fontSize: '1rem', fontWeight: 700 }}>
                    {formatTime(expirySeconds)}
                  </span>
                </div>

                <form onSubmit={handleVerifyOTP}>
                  <div className="form-group">
                    <label className="form-label" style={{ textAlign: 'center', display: 'block', marginBottom: '12px' }}>
                      6-Digit Security Code
                    </label>
                    <div
                      style={{
                        display: 'flex',
                        gap: '8px',
                        justify: 'center',
                        marginBottom: '16px',
                      }}
                      onPaste={handleOtpPaste}
                    >
                      {otpDigits.map((digit, idx) => (
                        <input
                          key={idx}
                          ref={otpInputRefs[idx]}
                          type="text"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleOtpDigitChange(idx, e.target.value)}
                          onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                          style={{
                            width: '46px',
                            height: '52px',
                            textAlign: 'center',
                            fontSize: '1.4rem',
                            fontWeight: 700,
                            borderRadius: '10px',
                            border: digit ? '2px solid #6366f1' : '1px solid #cbd5e1',
                            background: '#f8fafc',
                            color: '#0f172a',
                            outline: 'none',
                            transition: 'border 0.2s ease',
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  <button
                    id="verify-otp-btn"
                    className="auth-btn-primary"
                    type="submit"
                    style={{ marginTop: '8px' }}
                    disabled={loading || expirySeconds === 0}
                  >
                    {loading ? <span className="spinner" /> : 'Verify Code →'}
                  </button>

                  <div
                    style={{
                      display: 'flex',
                      justify: 'space-between',
                      alignItems: 'center',
                      marginTop: '20px',
                      fontSize: '0.85rem',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setStep(1);
                        setError('');
                        setInfoMessage('');
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#64748b',
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    >
                      Change Email
                    </button>

                    <button
                      type="button"
                      onClick={handleResendOTP}
                      disabled={resendCooldown > 0 || resendLoading}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: resendCooldown > 0 ? '#94a3b8' : '#6366f1',
                        fontWeight: 600,
                        cursor: resendCooldown > 0 ? 'not-allowed' : 'pointer',
                        padding: 0,
                      }}
                    >
                      {resendLoading
                        ? 'Resending...'
                        : resendCooldown > 0
                        ? `Resend OTP (${resendCooldown}s)`
                        : 'Resend OTP'}
                    </button>
                  </div>
                </form>
              </>
            )}

            {/* STEP 3: Set New Password */}
            {step === 3 && (
              <>
                <h1 className="auth-title">Set New Password</h1>
                <p className="auth-sub">Choose a strong password with at least 8 characters.</p>

                <form onSubmit={handleResetPassword}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="new-password">New Password</label>
                    <div className="password-input-wrapper">
                      <span className="input-icon-left">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </span>
                      <input
                        id="new-password"
                        className="form-input input-with-icon"
                        type={showPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="At least 8 characters"
                        required
                        minLength={8}
                        autoFocus
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

                  <div className="form-group">
                    <label className="form-label" htmlFor="confirm-password">Confirm Password</label>
                    <div className="password-input-wrapper">
                      <span className="input-icon-left">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                      </span>
                      <input
                        id="confirm-password"
                        className="form-input input-with-icon"
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter your new password"
                        required
                        minLength={8}
                      />
                      <button
                        type="button"
                        className="password-toggle-btn"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                      >
                        {showConfirmPassword ? (
                          <IconEyeOff width={18} height={18} />
                        ) : (
                          <IconEye width={18} height={18} />
                        )}
                      </button>
                    </div>
                  </div>

                  <button
                    id="reset-password-btn"
                    className="auth-btn-primary"
                    type="submit"
                    style={{ marginTop: '16px' }}
                    disabled={loading}
                  >
                    {loading ? <span className="spinner" /> : 'Reset Password ✓'}
                  </button>
                </form>
              </>
            )}

            {/* STEP 4: Success Screen */}
            {step === 4 && (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: '#ecfdf5',
                    color: '#10b981',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 20px',
                    boxShadow: '0 4px 14px rgba(16, 185, 129, 0.2)',
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>

                <h1 className="auth-title">Password Reset Complete!</h1>
                <p className="auth-sub" style={{ marginBottom: '28px' }}>
                  Your password has been updated successfully. You can now sign in with your new credentials.
                </p>

                <button
                  className="auth-btn-primary"
                  type="button"
                  onClick={() => navigate('/login')}
                >
                  Proceed to Login →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
