import { useEffect, useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

function initials(name) {
  if (!name) return '?';
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase()).join('');
}

const IconEye = (props) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const IconEyeOff = (props) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

export default function ProfilePage() {
  const { updateUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Profile Edit states
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    phone_number: '',
    profile_photo: '',
    date_of_birth: '',
    gender: '',
    blood_group: '',
    address: ''
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');

  // Password Update states
  const [passForm, setPassForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [passLoading, setPassLoading] = useState(false);
  const [passError, setPassError] = useState('');
  const [passSuccess, setPassSuccess] = useState('');

  // Password visibility states
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('auth/profile/');
      setProfile(res.data);
      // Pre-fill the edit form
      setEditForm({
        name: res.data.name || '',
        phone_number: res.data.phone_number || '',
        profile_photo: res.data.profile_photo || '',
        date_of_birth: res.data.date_of_birth || '',
        gender: res.data.gender || '',
        blood_group: res.data.blood_group || '',
        address: res.data.address || ''
      });
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load profile details.');
    } finally {
      setLoading(false);
    }
  }

  // Handle personal profile details update
  async function handleSaveProfile(e) {
    e.preventDefault();
    if (!editForm.name.trim()) {
      setSaveError('Full Name is required.');
      return;
    }
    setSaving(true);
    setSaveError('');
    setSaveSuccess('');
    try {
      const res = await api.put('auth/profile/', editForm);
      setProfile(res.data);
      setIsEditing(false);
      setSaveSuccess('Profile updated successfully.');
      // Sync names/details back to global Auth context
      if (updateUser) {
        updateUser({
          name: res.data.name,
          department: res.data.organization?.department_name ?? null,
          batch: res.data.organization?.batch_name ?? null,
          roll_no: res.data.organization?.roll_no ?? null
        });
      }
    } catch (err) {
      setSaveError(err.response?.data?.detail || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  }

  function handleCancelEdit() {
    if (profile) {
      setEditForm({
        name: profile.name || '',
        phone_number: profile.phone_number || '',
        profile_photo: profile.profile_photo || '',
        date_of_birth: profile.date_of_birth || '',
        gender: profile.gender || '',
        blood_group: profile.blood_group || '',
        address: profile.address || ''
      });
    }
    setIsEditing(false);
    setSaveError('');
    setSaveSuccess('');
  }

  // Handle password update
  async function handlePasswordUpdate(e) {
    e.preventDefault();
    setPassError('');
    setPassSuccess('');

    if (!passForm.current_password || !passForm.new_password || !passForm.confirm_password) {
      setPassError('All password fields are required.');
      return;
    }
    if (passForm.new_password !== passForm.confirm_password) {
      setPassError('New passwords do not match.');
      return;
    }
    if (passForm.new_password.length < 8) {
      setPassError('New password must be at least 8 characters.');
      return;
    }

    setPassLoading(true);
    try {
      await api.post('auth/profile/change-password/', passForm);
      setPassSuccess('Password updated successfully.');
      setPassForm({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      setPassError(err.response?.data?.error || err.response?.data?.detail || 'Failed to change password.');
    } finally {
      setPassLoading(false);
    }
  }

  function displayVal(val) {
    if (val === null || val === undefined || String(val).trim() === '') {
      return <span style={{ color: 'var(--text-3)', fontStyle: 'italic' }}>Not Available</span>;
    }
    return val;
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
        <span className="spinner" style={{ width: '40px', height: '40px' }} />
      </div>
    );
  }

  if (error) {
    return <div className="alert alert-error">{error}</div>;
  }

  const roleLabels = {
    admin: 'Administrator',
    faculty: 'Faculty Member',
    student: 'Student',
    parent: 'Parent / Guardian'
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div className="flex-between" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 className="page-title">My Profile</h1>
          <p className="page-sub">View and manage your account settings, personal details, and security.</p>
        </div>
      </div>

      {saveSuccess && <div className="alert alert-ok" style={{ marginBottom: '1.5rem' }}>{saveSuccess}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
        
        {/* LEFT COLUMN: Basic & Account Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Card 1: Basic Information */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '2rem' }}>
            <div style={{ marginBottom: '1.5rem', position: 'relative' }}>
              {profile?.profile_photo ? (
                <img
                  src={profile.profile_photo}
                  alt="Profile"
                  style={{ width: '110px', height: '110px', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--border)' }}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = ''; // Force initials fallback if image fails to load
                  }}
                />
              ) : (
                <div style={{
                  width: '110px', height: '110px', borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--accent) 0%, #8b7cf0 100%)',
                  color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '2.2rem', fontWeight: '800', boxShadow: '0 4px 14px rgba(108, 92, 231, 0.25)'
                }}>
                  {initials(profile?.name)}
                </div>
              )}
            </div>

            {isEditing ? (
              <div style={{ width: '100%', marginBottom: '1rem' }}>
                <div className="form-group" style={{ textAlign: 'left' }}>
                  <label className="form-label">Full Name</label>
                  <input
                    className="form-input"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  />
                </div>
                <div className="form-group" style={{ textAlign: 'left' }}>
                  <label className="form-label">Profile Photo URL</label>
                  <input
                    className="form-input"
                    placeholder="https://example.com/avatar.jpg"
                    value={editForm.profile_photo}
                    onChange={(e) => setEditForm({ ...editForm, profile_photo: e.target.value })}
                  />
                </div>
              </div>
            ) : (
              <div style={{ marginBottom: '1.25rem' }}>
                <h2 style={{ fontSize: '1.4rem', fontWeight: '700', color: 'var(--text)', marginBottom: '4px' }}>{profile?.name}</h2>
                <span className="badge badge-blue" style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {roleLabels[profile?.role] || profile?.role}
                </span>
              </div>
            )}

            <div style={{ width: '100%', borderTop: '1px solid var(--border-light)', paddingTop: '1.25rem', marginTop: '0.5rem', textAlign: 'left' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <span style={{ color: 'var(--text-2)', fontSize: '0.85rem' }}>Username:</span>
                <span style={{ fontWeight: '500', fontSize: '0.85rem' }}>{profile?.username}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <span style={{ color: 'var(--text-2)', fontSize: '0.85rem' }}>Email:</span>
                <span style={{ fontWeight: '500', fontSize: '0.85rem' }}>{profile?.email}</span>
              </div>
            </div>

            {/* View/Edit Actions */}
            <div style={{ marginTop: '1.5rem', width: '100%' }}>
              {saveError && <div className="alert alert-error" style={{ marginBottom: '1rem', textAlign: 'left' }}>{saveError}</div>}
              
              {isEditing ? (
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                  <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={handleCancelEdit} disabled={saving}>
                    Cancel
                  </button>
                  <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={handleSaveProfile} disabled={saving}>
                    {saving ? <span className="spinner" /> : 'Save'}
                  </button>
                </div>
              ) : (
                <button className="btn btn-ghost btn-sm" style={{ width: '100%' }} onClick={() => setIsEditing(true)}>
                  Edit Profile
                </button>
              )}
            </div>
          </div>

          {/* Card 2: Account Information */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.5rem' }}>
              Account Information
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-2)', fontSize: '0.85rem' }}>Account Status:</span>
                <span className="badge badge-green" style={{ fontSize: '0.7rem' }}>
                  {profile?.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-2)', fontSize: '0.85rem' }}>Joined Date:</span>
                <span style={{ fontWeight: '500', fontSize: '0.85rem' }}>
                  {profile?.date_joined ? new Date(profile.date_joined).toLocaleDateString(undefined, { dateStyle: 'medium' }) : '—'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-2)', fontSize: '0.85rem' }}>Last Login:</span>
                <span style={{ fontWeight: '500', fontSize: '0.85rem' }}>
                  {profile?.last_login ? new Date(profile.last_login).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Organization, Personal & Security */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Card 3: Organization Details */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.5rem' }}>
              Organization Information
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              
              {/* Common university display */}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-2)', fontSize: '0.85rem' }}>University:</span>
                <span style={{ fontWeight: '500', fontSize: '0.85rem' }}>
                  {displayVal(profile?.university_name)} {profile?.university_code && `(${profile.university_code})`}
                </span>
              </div>

              {/* Student Role */}
              {profile?.role === 'student' && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-2)', fontSize: '0.85rem' }}>Department:</span>
                    <span style={{ fontWeight: '500', fontSize: '0.85rem' }}>{displayVal(profile?.organization?.department_name)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-2)', fontSize: '0.85rem' }}>Batch:</span>
                    <span style={{ fontWeight: '500', fontSize: '0.85rem' }}>{displayVal(profile?.organization?.batch_name)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-2)', fontSize: '0.85rem' }}>Roll Number:</span>
                    <span style={{ fontWeight: '500', fontSize: '0.85rem' }}>{displayVal(profile?.organization?.roll_no)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-2)', fontSize: '0.85rem' }}>Enrollment Number:</span>
                    <span className="badge badge-gray" style={{ fontSize: '0.7rem' }}>Coming Soon</span>
                  </div>
                </>
              )}

              {/* Faculty or Admin Role */}
              {(profile?.role === 'faculty' || profile?.role === 'admin') && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-2)', fontSize: '0.85rem' }}>Employee ID:</span>
                    <span style={{ fontWeight: '500', fontSize: '0.85rem' }}>
                      {/* Read-only: never editable by user */}
                      {displayVal(profile?.organization?.employee_id)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-2)', fontSize: '0.85rem' }}>Department:</span>
                    <span style={{ fontWeight: '500', fontSize: '0.85rem' }}>{displayVal(profile?.organization?.department_name)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-2)', fontSize: '0.85rem' }}>Designation:</span>
                    <span style={{ fontWeight: '500', fontSize: '0.85rem' }}>{displayVal(profile?.organization?.designation)}</span>
                  </div>
                </>
              )}

              {/* Parent Role */}
              {profile?.role === 'parent' && (
                <div style={{ marginTop: '0.5rem' }}>
                  <span style={{ color: 'var(--text-2)', fontSize: '0.85rem', display: 'block', marginBottom: '0.5rem' }}>Linked Student(s):</span>
                  {profile?.organization?.children && profile.organization.children.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {profile.organization.children.map((c) => (
                        <div key={c.id} style={{ background: 'var(--bg)', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                          <span style={{ fontWeight: '600', display: 'block', fontSize: '0.85rem' }}>{c.name}</span>
                          <span style={{ color: 'var(--text-2)', fontSize: '0.78rem' }}>
                            Roll No: {c.roll_no} | {c.department_name} ({c.batch_name})
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span style={{ fontStyle: 'italic', color: 'var(--text-3)', fontSize: '0.85rem' }}>No student profiles linked yet.</span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Card 4: Personal Information */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.5rem' }}>
              Personal Information
            </h3>
            {isEditing ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Phone Number</label>
                  <input
                    className="form-input"
                    value={editForm.phone_number}
                    onChange={(e) => setEditForm({ ...editForm, phone_number: e.target.value })}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Date of Birth</label>
                    <input
                      className="form-input"
                      type="date"
                      value={editForm.date_of_birth}
                      onChange={(e) => setEditForm({ ...editForm, date_of_birth: e.target.value })}
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Gender</label>
                    <select
                      className="form-select"
                      value={editForm.gender}
                      onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
                    >
                      <option value="">— Select —</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Blood Group</label>
                  <select
                    className="form-select"
                    value={editForm.blood_group}
                    onChange={(e) => setEditForm({ ...editForm, blood_group: e.target.value })}
                  >
                    <option value="">— Select —</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Address</label>
                  <textarea
                    className="form-textarea"
                    rows={3}
                    value={editForm.address}
                    onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  />
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-2)', fontSize: '0.85rem' }}>Phone Number:</span>
                  <span style={{ fontWeight: '500', fontSize: '0.85rem' }}>{displayVal(profile?.phone_number)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-2)', fontSize: '0.85rem' }}>Date of Birth:</span>
                  <span style={{ fontWeight: '500', fontSize: '0.85rem' }}>
                    {profile?.date_of_birth ? new Date(profile.date_of_birth).toLocaleDateString(undefined, { dateStyle: 'medium' }) : displayVal(null)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-2)', fontSize: '0.85rem' }}>Gender:</span>
                  <span style={{ fontWeight: '500', fontSize: '0.85rem' }}>{displayVal(profile?.gender)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-2)', fontSize: '0.85rem' }}>Blood Group:</span>
                  <span style={{ fontWeight: '500', fontSize: '0.85rem' }}>{displayVal(profile?.blood_group)}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ color: 'var(--text-2)', fontSize: '0.85rem' }}>Address:</span>
                  <span style={{ fontWeight: '500', fontSize: '0.85rem', lineHeight: '1.4' }}>{displayVal(profile?.address)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Card 5: Security / Update Password */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.5rem' }}>
              Security & Credentials
            </h3>
            <form onSubmit={handlePasswordUpdate}>
              {passError && <div className="alert alert-error" style={{ marginBottom: '1rem', fontSize: '0.8rem', padding: '8px 12px' }}>{passError}</div>}
              {passSuccess && <div className="alert alert-ok" style={{ marginBottom: '1rem', fontSize: '0.8rem', padding: '8px 12px' }}>{passSuccess}</div>}
              
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.72rem' }}>Current Password</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type={showCurrentPass ? 'text' : 'password'}
                    className="form-input"
                    style={{ paddingRight: '40px' }}
                    placeholder="Enter current password"
                    value={passForm.current_password}
                    onChange={(e) => setPassForm({ ...passForm, current_password: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPass(!showCurrentPass)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '4px',
                      transition: 'color 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-2)'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-3)'}
                  >
                    {showCurrentPass ? <IconEyeOff width={16} height={16} /> : <IconEye width={16} height={16} />}
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.72rem' }}>New Password</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    className="form-input"
                    style={{ paddingRight: '40px' }}
                    placeholder="At least 8 characters"
                    value={passForm.new_password}
                    onChange={(e) => setPassForm({ ...passForm, new_password: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '4px',
                      transition: 'color 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-2)'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-3)'}
                  >
                    {showNewPass ? <IconEyeOff width={16} height={16} /> : <IconEye width={16} height={16} />}
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.72rem' }}>Confirm New Password</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type={showConfirmPass ? 'text' : 'password'}
                    className="form-input"
                    style={{ paddingRight: '40px' }}
                    placeholder="Confirm new password"
                    value={passForm.confirm_password}
                    onChange={(e) => setPassForm({ ...passForm, confirm_password: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPass(!showConfirmPass)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '4px',
                      transition: 'color 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-2)'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-3)'}
                  >
                    {showConfirmPass ? <IconEyeOff width={16} height={16} /> : <IconEye width={16} height={16} />}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                className="btn btn-primary btn-sm"
                style={{ width: '100%', marginTop: '0.5rem' }}
                disabled={passLoading}
              >
                {passLoading ? <span className="spinner" /> : 'Update Password'}
              </button>
            </form>
          </div>

        </div>

      </div>
    </div>
  );
}
