import { useEffect, useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

function initials(name) {
  if (!name) return '?';
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase()).join('');
}

export default function QuickPreviewModal({ isOpen, onClose, personId, role, onUpdate, onDelete }) {
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Edit Student mode states
  const [isEditing, setIsEditing] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [batches, setBatches] = useState([]);
  const [editForm, setEditForm] = useState({
    name: '',
    phone_number: '',
    department: '',
    batch: ''
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

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
      setIsEditing(false);
      setSaveError('');
      const t = setTimeout(() => setMounted(true), 20);
      return () => clearTimeout(t);
    } else {
      setMounted(false);
      setData(null);
      setIsEditing(false);
      setSaveError('');
    }
  }, [isOpen, personId, role]);

  async function handleStartEdit() {
    setIsEditing(true);
    setSaveError('');
    setEditForm({
      name: data?.name || '',
      phone_number: data?.phone_number || '',
      department: data?.department || '',
      batch: data?.batch || ''
    });

    try {
      const [deptRes, batchRes] = await Promise.all([
        api.get('departments/'),
        api.get('batches/')
      ]);
      setDepartments(deptRes.data);
      setBatches(batchRes.data);
    } catch {
      // Fallback silently if options fail
    }
  }

  function handleDeptChange(e) {
    const selectedDept = e.target.value;
    setEditForm(prev => {
      const currentBatchObj = batches.find(b => String(b.id) === String(prev.batch));
      const batchMatchesNewDept = currentBatchObj && (
        String(currentBatchObj.department) === String(selectedDept) ||
        String(currentBatchObj.department_id) === String(selectedDept)
      );
      return {
        ...prev,
        department: selectedDept,
        batch: batchMatchesNewDept ? prev.batch : ''
      };
    });
  }

  async function handleSaveStudent(e) {
    e.preventDefault();
    if (!editForm.name.trim()) {
      setSaveError('Student name is required.');
      return;
    }
    setSaving(true);
    setSaveError('');
    try {
      const res = await api.patch(`students/${personId}/`, {
        name: editForm.name.trim(),
        phone_number: editForm.phone_number.trim(),
        department: editForm.department || null,
        batch: editForm.batch || null
      });
      setData(res.data);
      setIsEditing(false);
      onUpdate?.();
    } catch (err) {
      setSaveError(err.response?.data?.error || err.response?.data?.detail || 'Failed to update student details.');
    } finally {
      setSaving(false);
    }
  }

  if (!isOpen) return null;

  const backdropStyle = {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(15, 23, 42, 0.45)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1.5rem 1rem',
    overflowY: 'auto',
    zIndex: 1000,
    opacity: mounted ? 1 : 0,
    transition: 'opacity 200ms ease-out'
  };

  const cardStyle = {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '16px',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
    width: '100%',
    maxWidth: '520px',
    maxHeight: 'calc(100vh - 3rem)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    transform: mounted ? 'scale(1) translateY(0)' : 'scale(0.96) translateY(10px)',
    opacity: mounted ? 1 : 0,
    transition: 'transform 200ms cubic-bezier(0.16, 1, 0.3, 1), opacity 200ms ease-out',
    color: '#0f172a'
  };

  const roleLabels = {
    student: 'Student',
    faculty: 'Faculty Member',
    parent: 'Parent / Guardian'
  };

  function displayVal(val) {
    if (val === null || val === undefined || String(val).trim() === '') {
      return <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Not Available</span>;
    }
    return val;
  }

  const availableBatches = editForm.department
    ? batches.filter(b => String(b.department) === String(editForm.department) || String(b.department_id) === String(editForm.department))
    : batches;

  const canEditStudent = role === 'student' && user?.role === 'admin';

  return (
    <div style={backdropStyle} onClick={() => { if (!saving) onClose(); }}>
      <div style={cardStyle} onClick={e => e.stopPropagation()}>
        
        {/* Fixed Header */}
        <div style={{
          padding: '1.25rem 1.5rem 1rem',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          justify: 'space-between',
          alignItems: 'center',
          background: '#ffffff'
        }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
              {isEditing ? 'Edit Student Details' : `${roleLabels[role] || 'User'} Profile`}
            </h3>
            <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '2px 0 0 0' }}>
              {isEditing ? 'Update student account information and academic placement.' : 'View details and system attributes.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '1.2rem',
              color: '#64748b',
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: '6px',
              lineHeight: 1
            }}
          >
            ✕
          </button>
        </div>

        {/* Scrollable Body Container */}
        <div style={{ padding: '1.25rem 1.5rem', overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
              <span className="spinner" style={{ width: '32px', height: '32px' }} />
            </div>
          ) : error ? (
            <div style={{ padding: '1rem 0' }}>
              <div className="alert alert-error">{error}</div>
            </div>
          ) : data ? (
            <>
              {/* Top Summary Banner */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '1rem',
                background: '#f8fafc',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                marginBottom: '1.25rem'
              }}>
                <div>
                  {data.profile_photo ? (
                    <img
                      src={data.profile_photo}
                      alt={data.name}
                      style={{ width: '52px', height: '52px', borderRadius: '50%', objectFit: 'cover', border: '1px solid #cbd5e1' }}
                      onError={e => { e.target.onerror = null; e.target.src = ''; }}
                    />
                  ) : (
                    <div style={{
                      width: '52px', height: '52px', borderRadius: '50%',
                      background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                      color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '1.2rem', fontWeight: 700
                    }}>
                      {initials(data.name)}
                    </div>
                  )}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <h4 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {data.name}
                  </h4>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '4px', flexWrap: 'wrap' }}>
                    <span className="badge badge-blue" style={{ fontSize: '0.7rem', fontWeight: 600, padding: '2px 8px' }}>
                      {roleLabels[role]}
                    </span>
                    {(role === 'student' || role === 'faculty') && data.department_name && (
                      <span className="badge badge-gray" style={{ fontSize: '0.7rem', fontWeight: 600, padding: '2px 8px' }}>
                        {data.department_name}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {saveError && <div className="alert alert-error" style={{ marginBottom: '1rem', fontSize: '0.85rem' }}>{saveError}</div>}

              {isEditing ? (
                /* EDIT FORM MODE */
                <form id="student-edit-form" onSubmit={handleSaveStudent}>
                  
                  {/* Section 1: Editable Fields */}
                  <div style={{ marginBottom: '1.25rem' }}>
                    <h5 style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em', marginBottom: '0.75rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '4px' }}>
                      Editable Information
                    </h5>
                    
                    <div className="form-group" style={{ marginBottom: '0.85rem' }}>
                      <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155' }}>
                        Full Name <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        className="form-input"
                        value={editForm.name}
                        onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                        placeholder="e.g. Rohan Patel"
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: '0.85rem' }}>
                      <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155' }}>
                        Phone Number
                      </label>
                      <input
                        className="form-input"
                        value={editForm.phone_number}
                        onChange={e => setEditForm({ ...editForm, phone_number: e.target.value })}
                        placeholder="e.g. +1 555-0199"
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155' }}>
                          Department
                        </label>
                        <select className="form-select" value={editForm.department} onChange={handleDeptChange}>
                          <option value="">— Department —</option>
                          {departments.map(d => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155' }}>
                          Batch
                        </label>
                        <select
                          className="form-select"
                          value={editForm.batch}
                          onChange={e => setEditForm({ ...editForm, batch: e.target.value })}
                          disabled={!editForm.department}
                        >
                          <option value="">— Batch —</option>
                          {availableBatches.map(b => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Read-Only System Identifiers */}
                  <div style={{
                    background: '#f8fafc',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    padding: '1rem',
                    marginBottom: '0.5rem'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <h5 style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em', margin: 0 }}>
                        System Identifiers (Read-Only)
                      </h5>
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '1px 6px' }}>
                        Immutable
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.82rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#64748b' }}>Email Address</span>
                        <span style={{ fontWeight: 600, color: '#334155' }}>{data.email || '—'}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#64748b' }}>Roll Number</span>
                        <span style={{ fontWeight: 600, color: '#334155' }}>{data.roll_no || '—'}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#64748b' }}>Enrollment Number</span>
                        <span style={{ fontWeight: 600, color: '#334155' }}>{data.enrollment_number || 'Not Assigned'}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#64748b' }}>Verification Status</span>
                        <span className={`badge ${data.is_verified ? 'badge-green' : 'badge-yellow'}`} style={{ fontSize: '0.68rem', padding: '2px 6px' }}>
                          {data.is_verified ? 'Verified Account' : 'Pending Activation'}
                        </span>
                      </div>
                    </div>
                  </div>
                </form>
              ) : (
                /* VIEW MODE */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  
                  {/* Basic Information */}
                  <div>
                    <h5 style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em', marginBottom: '0.6rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '3px' }}>
                      Basic Information
                    </h5>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#64748b' }}>Email Address:</span>
                        <span style={{ fontWeight: 600, color: '#0f172a' }}>{data.email || '—'}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#64748b' }}>Phone Number:</span>
                        <span style={{ fontWeight: 600, color: '#0f172a' }}>{displayVal(data.phone_number)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Academic / Organization Information */}
                  <div>
                    <h5 style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em', marginBottom: '0.6rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '3px' }}>
                      Academic Attributes
                    </h5>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
                      {role === 'student' && (
                        <>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#64748b' }}>Batch:</span>
                            <span style={{ fontWeight: 600, color: '#0f172a' }}>{displayVal(data.batch_name)}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#64748b' }}>Roll Number:</span>
                            <span style={{ fontWeight: 600, color: '#0f172a' }}>{displayVal(data.roll_no)}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#64748b' }}>Enrollment Number:</span>
                            <span style={{ fontWeight: 600, color: data.enrollment_number ? '#0f172a' : '#94a3b8' }}>
                              {data.enrollment_number && String(data.enrollment_number).trim() ? data.enrollment_number : 'Not Assigned'}
                            </span>
                          </div>
                        </>
                      )}
                      {role === 'faculty' && (
                        <>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#64748b' }}>Employee ID:</span>
                            <span style={{ fontWeight: 600, color: '#0f172a' }}>{displayVal(data.employee_id)}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#64748b' }}>Designation:</span>
                            <span style={{ fontWeight: 600, color: '#0f172a' }}>{displayVal(data.designation)}</span>
                          </div>
                        </>
                      )}
                      {role === 'parent' && (
                        <div>
                          <span style={{ color: '#64748b', fontSize: '0.85rem', display: 'block', marginBottom: '0.4rem' }}>Linked Student(s):</span>
                          {data.children && data.children.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                              {data.children.map(c => (
                                <div key={c.id} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '6px 10px', borderRadius: '6px', fontSize: '0.78rem' }}>
                                  <span style={{ fontWeight: 600, display: 'block', color: '#0f172a' }}>{c.name}</span>
                                  <span style={{ color: '#64748b', fontSize: '0.72rem' }}>
                                    Enrollment: {c.enrollment_number && String(c.enrollment_number).trim() ? c.enrollment_number : 'Not Assigned'} | Roll No: {c.roll_no} | {c.department_name} ({c.batch_name})
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span style={{ fontStyle: 'italic', color: '#94a3b8', fontSize: '0.825rem' }}>No student profiles linked yet.</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Account Status */}
                  <div>
                    <h5 style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em', marginBottom: '0.6rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '3px' }}>
                      Account Status
                    </h5>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                      <span style={{ color: '#64748b' }}>Verification Status:</span>
                      <span className={`badge ${data.is_verified ? 'badge-green' : 'badge-yellow'}`} style={{ fontSize: '0.7rem', fontWeight: 600, padding: '3px 8px' }}>
                        {data.is_verified ? 'Verified Account' : 'Pending Activation'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Fixed Footer */}
        {data && !loading && !error && (
          <div style={{
            padding: '1rem 1.5rem',
            borderTop: '1px solid #f1f5f9',
            background: '#fafafa',
            display: 'flex',
            justify: 'space-between',
            alignItems: 'center'
          }}>
            {isEditing ? (
              <>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setIsEditing(false)}
                  disabled={saving}
                  style={{ fontSize: '0.85rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="student-edit-form"
                  className="btn btn-primary"
                  disabled={saving}
                  style={{ minWidth: '120px', fontSize: '0.85rem' }}
                >
                  {saving ? <span className="spinner" /> : 'Save Changes'}
                </button>
              </>
            ) : (
              <>
                {canEditStudent ? (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{
                        borderRadius: '8px',
                        padding: '7px 14px',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        color: '#4f46e5',
                        border: '1px solid #e0e7ff',
                        background: '#eff6ff'
                      }}
                      onClick={handleStartEdit}
                    >
                      Edit Student
                    </button>
                    {onDelete && (
                      <button
                        type="button"
                        className="btn btn-ghost"
                        style={{
                          borderRadius: '8px',
                          padding: '7px 14px',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          color: '#dc2626',
                          border: '1px solid #fee2e2',
                          background: '#fef2f2'
                        }}
                        onClick={() => onDelete(data)}
                      >
                        Delete Student
                      </button>
                    )}
                  </div>
                ) : <div />}

                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{
                    borderRadius: '8px',
                    padding: '7px 16px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    border: '1px solid #e2e8f0',
                    background: '#ffffff',
                    color: '#334155'
                  }}
                  onClick={onClose}
                >
                  Close
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
