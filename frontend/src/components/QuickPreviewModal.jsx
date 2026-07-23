import { useEffect, useState } from 'react';
import api from '../api/axios';

function initials(name) {
  if (!name) return '?';
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase()).join('');
}

export default function QuickPreviewModal({ isOpen, onClose, personId, role }) {
  const [mounted, setMounted] = useState(false);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchPreview() {
      setLoading(true);
      setError('');
      try {
        const pluralRoles = {
          student: 'students',
          faculty: 'faculty',
          parent: 'parents'
        };
        const endpoint = pluralRoles[role];
        if (!endpoint) throw new Error('Invalid preview role.');

        const res = await api.get(`${endpoint}/${personId}/preview/`);
        setData(res.data);
      } catch (err) {
        setError(err.response?.data?.detail || 'Failed to load preview details.');
      } finally {
        setLoading(false);
      }
    }

    if (isOpen && personId) {
      fetchPreview();
      const t = setTimeout(() => setMounted(true), 20);
      return () => clearTimeout(t);
    } else {
      setMounted(false);
      setData(null);
    }
  }, [isOpen, personId, role]);

  if (!isOpen) return null;

  const backdropStyle = {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0, 0, 0, 0.4)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    opacity: mounted ? 1 : 0,
    transition: 'opacity 250ms ease-out'
  };

  const cardStyle = {
    background: 'rgba(255, 255, 255, 0.85)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.4)',
    borderRadius: '24px',
    boxShadow: '0 20px 50px rgba(0,0,0,0.15), 0 1px 1px rgba(255,255,255,0.2) inset',
    width: '100%',
    maxWidth: '460px',
    padding: '2rem',
    transform: mounted ? 'scale(1) translateY(0)' : 'scale(0.92) translateY(15px)',
    opacity: mounted ? 1 : 0,
    transition: 'transform 280ms cubic-bezier(0.16, 1, 0.3, 1), opacity 280ms ease-out',
    color: '#1d1d1f',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
  };

  const roleLabels = {
    student: 'Student',
    faculty: 'Faculty Member',
    parent: 'Parent / Guardian'
  };

  function displayVal(val) {
    if (val === null || val === undefined || String(val).trim() === '') {
      return <span style={{ color: 'var(--text-3)', fontStyle: 'italic' }}>Not Available</span>;
    }
    return val;
  }

  return (
    <div style={backdropStyle} onClick={onClose}>
      <div style={cardStyle} onClick={e => e.stopPropagation()}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
            <span className="spinner" style={{ width: '32px', height: '32px' }} />
          </div>
        ) : error ? (
          <div style={{ padding: '1rem 0' }}>
            <div className="alert alert-error" style={{ marginBottom: '1.5rem' }}>{error}</div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost btn-sm" onClick={onClose}>Close</button>
            </div>
          </div>
        ) : data ? (
          <>
            {/* Header */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '1.5rem', textAlign: 'center' }}>
              <div style={{ marginBottom: '1rem' }}>
                {data.profile_photo ? (
                  <img
                    src={data.profile_photo}
                    alt={data.name}
                    style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.5)' }}
                    onError={e => { e.target.onerror = null; e.target.src = ''; }}
                  />
                ) : (
                  <div style={{
                    width: '80px', height: '80px', borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--accent) 0%, #8b7cf0 100%)',
                    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.8rem', fontWeight: '800', boxShadow: '0 4px 10px rgba(108,92,231,0.2)'
                  }}>
                    {initials(data.name)}
                  </div>
                )}
              </div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '700', margin: '0 0 6px 0', letterSpacing: '-0.010em' }}>{data.name}</h2>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
                <span className="badge badge-blue" style={{ fontSize: '0.72rem', textTransform: 'uppercase', padding: '3px 8px' }}>
                  {roleLabels[role]}
                </span>
                {(role === 'student' || role === 'faculty') && data.department_name && (
                  <span className="badge badge-gray" style={{ fontSize: '0.72rem', padding: '3px 8px' }}>
                    {data.department_name}
                  </span>
                )}
              </div>
            </div>

            {/* Basic Info */}
            <div style={{ marginBottom: '1.25rem' }}>
              <h4 style={{ fontSize: '0.72rem', fontWeight: '600', textTransform: 'uppercase', color: 'var(--text-2)', letterSpacing: '0.05em', marginBottom: '0.5rem', borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: '3px' }}>
                Basic Information
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-2)' }}>Email:</span>
                  <span style={{ fontWeight: '500' }}>{data.email || '—'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-2)' }}>Phone Number:</span>
                  <span style={{ fontWeight: '500' }}>{displayVal(data.phone_number)}</span>
                </div>
              </div>
            </div>

            {/* Organization Info */}
            <div style={{ marginBottom: '1.25rem' }}>
              <h4 style={{ fontSize: '0.72rem', fontWeight: '600', textTransform: 'uppercase', color: 'var(--text-2)', letterSpacing: '0.05em', marginBottom: '0.5rem', borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: '3px' }}>
                Organization Information
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {role === 'student' && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                      <span style={{ color: 'var(--text-2)' }}>Batch:</span>
                      <span style={{ fontWeight: '500' }}>{displayVal(data.batch_name)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                      <span style={{ color: 'var(--text-2)' }}>Roll Number:</span>
                      <span style={{ fontWeight: '500' }}>{displayVal(data.roll_no)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                      <span style={{ color: 'var(--text-2)' }}>Enrollment Number:</span>
                      <span className="badge badge-gray" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>Not Assigned</span>
                    </div>
                  </>
                )}
                {role === 'faculty' && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                      <span style={{ color: 'var(--text-2)' }}>Employee ID:</span>
                      <span style={{ fontWeight: '500' }}>{displayVal(data.employee_id)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                      <span style={{ color: 'var(--text-2)' }}>Designation:</span>
                      <span style={{ fontWeight: '500' }}>{displayVal(data.designation)}</span>
                    </div>
                  </>
                )}
                {role === 'parent' && (
                  <div>
                    <span style={{ color: 'var(--text-2)', fontSize: '0.85rem', display: 'block', marginBottom: '0.4rem' }}>Linked Student(s):</span>
                    {data.children && data.children.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        {data.children.map(c => (
                          <div key={c.id} style={{ background: 'rgba(0,0,0,0.03)', padding: '6px 10px', borderRadius: '6px', fontSize: '0.78rem' }}>
                            <span style={{ fontWeight: '600', display: 'block' }}>{c.name}</span>
                            <span style={{ color: 'var(--text-2)', fontSize: '0.72rem' }}>
                              Roll No: {c.roll_no} | {c.department_name} ({c.batch_name})
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span style={{ fontStyle: 'italic', color: 'var(--text-3)', fontSize: '0.825rem' }}>No student profiles linked yet.</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Account Info */}
            <div style={{ marginBottom: '1.75rem' }}>
              <h4 style={{ fontSize: '0.72rem', fontWeight: '600', textTransform: 'uppercase', color: 'var(--text-2)', letterSpacing: '0.05em', marginBottom: '0.5rem', borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: '3px' }}>
                Account Status
              </h4>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-2)' }}>Verification Status:</span>
                <span className={`badge ${data.is_verified ? 'badge-green' : 'badge-yellow'}`} style={{ fontSize: '0.7rem', padding: '3px 8px' }}>
                  {data.is_verified ? 'Verified' : 'Pending'}
                </span>
              </div>
            </div>

            {/* Footer Close Button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                className="btn btn-ghost"
                style={{
                  borderRadius: '10px',
                  padding: '8px 16px',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  border: '1px solid rgba(0,0,0,0.1)',
                  background: 'rgba(0,0,0,0.04)',
                  color: '#3a3a3c',
                  cursor: 'pointer',
                  transition: 'background 0.15s'
                }}
                onClick={onClose}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.08)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.04)'}
              >
                Close
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
