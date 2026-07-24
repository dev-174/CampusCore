import { useEffect, useState } from 'react';
import api from '../api/axios';
import Modal from '../components/Modal';
import { IconGraduate, IconCheckSq, IconWarning, IconBuilding } from '../components/Icons';
import QuickPreviewModal from '../components/QuickPreviewModal';

export default function StudentsPage() {
  const [students, setStudents] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [batches, setBatches] = useState([]);
  const [riskMap, setRiskMap] = useState({}); // roll_no -> { risk_%, level }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  // Filters state
  const [filterDept, setFilterDept] = useState('');
  const [filterBatch, setFilterBatch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Profile preview targets
  const [previewTarget, setPreviewTarget] = useState(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Bulk upload collapse state
  const [showBulk, setShowBulk] = useState(false);

  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', roll_no: '', department: '', batch: '' });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [bulkFile, setBulkFile] = useState(null);
  const [bulkMsg, setBulkMsg] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);

  useEffect(() => { fetchAll(); }, []);

  // Reset pagination to page 1 on filter or search query change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterDept, filterBatch, filterStatus]);

  async function fetchAll() {
    setLoading(true);
    setError('');
    try {
      const [s, d, b] = await Promise.all([
        api.get('students/'),
        api.get('departments/'),
        api.get('batches/'),
      ]);
      setStudents(s.data);
      setDepartments(d.data);
      setBatches(b.data);
    } catch {
      setError('Failed to load students.');
    } finally {
      setLoading(false);
    }

    // Risk badges are a bonus, not core data
    try {
      const r = await api.get('ml/risk-summary/');
      setRiskMap(r.data?.summary || {});
    } catch {
      setRiskMap({});
    }
  }

  const filteredBatches = form.department
    ? batches.filter(b => String(b.department) === String(form.department) || String(b.department_id) === String(form.department))
    : batches;

  const filteredFilterBatches = filterDept
    ? batches.filter(b => String(b.department) === String(filterDept) || String(b.department_id) === String(filterDept))
    : batches;

  const filtered = students.filter(s => {
    const q = search.toLowerCase();
    const matchesSearch = (
      (s.name || '').toLowerCase().includes(q) ||
      (s.email || '').toLowerCase().includes(q) ||
      (s.roll_no || '').toLowerCase().includes(q) ||
      (s.enrollment_number || '').toLowerCase().includes(q)
    );
    if (!matchesSearch) return false;

    if (filterDept && String(s.department) !== String(filterDept)) return false;
    if (filterBatch && String(s.batch) !== String(filterBatch)) return false;
    
    if (filterStatus) {
      const isVerified = !!s.is_verified;
      if (filterStatus === 'verified' && !isVerified) return false;
      if (filterStatus === 'pending' && isVerified) return false;
    }

    return true;
  });

  async function handleAdd(e) {
    e.preventDefault();
    if (!form.name || !form.email || !form.roll_no) {
      setFormError('Name, email, and roll no are required.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      await api.post('students/', form);
      setShowAdd(false);
      setForm({ name: '', email: '', roll_no: '', department: '', batch: '' });
      fetchAll();
    } catch (e) {
      setFormError(e.response?.data?.detail || 'Failed to add student.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`students/${deleteTarget.id}/`);
      setDeleteTarget(null);
      fetchAll();
    } catch {
      setError('Failed to delete student.');
    } finally {
      setDeleting(false);
    }
  }

  async function handleBulkUpload(e) {
    e.preventDefault();
    if (!bulkFile) return;
    setBulkLoading(true);
    setBulkMsg('');
    const formData = new FormData();
    formData.append('file', bulkFile);
    try {
      const res = await api.post('students/bulk-upload/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setBulkMsg(res.data?.message || 'Bulk upload successful.');
      fetchAll();
    } catch (e) {
      setBulkMsg(e.response?.data?.error || e.response?.data?.detail || 'Bulk upload failed.');
    } finally {
      setBulkLoading(false);
      setBulkFile(null);
    }
  }

  function getDeptName(id) {
    return departments.find(d => String(d.id) === String(id))?.name || id || '—';
  }
  function getBatchName(id) {
    return batches.find(b => String(b.id) === String(id))?.name || id || '—';
  }

  // Summary statistics
  const totalStudents = students.length;
  const verifiedCount = students.filter(s => s.is_verified).length;
  const pendingCount = totalStudents - verifiedCount;
  const totalDepts = departments.length;

  // Pagination calculations
  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedStudents = filtered.slice(startIndex, endIndex);

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title">Students</h1>
          <p className="page-sub">Manage all enrolled students, track status, and view departments.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-ghost" onClick={() => setShowBulk(!showBulk)}>
            {showBulk ? 'Hide Import' : 'Import CSV'}
          </button>
          <button className="btn btn-primary" onClick={() => { setShowAdd(true); setFormError(''); }}>
            + Add Student
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Bulk upload collapsible */}
      {showBulk && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <p className="form-label" style={{ marginBottom: '0.5rem' }}>Bulk Upload (CSV)</p>
          <form onSubmit={handleBulkUpload} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="file"
              accept=".csv"
              className="form-input"
              style={{ flex: 1, minWidth: '200px' }}
              onChange={e => setBulkFile(e.target.files[0])}
            />
            <button className="btn btn-primary btn-sm" type="submit" disabled={bulkLoading || !bulkFile}>
              {bulkLoading ? <span className="spinner" /> : 'Upload CSV'}
            </button>
          </form>
          {bulkMsg && <p style={{ marginTop: '0.5rem', color: bulkMsg.toLowerCase().includes('fail') ? 'var(--error)' : 'var(--success)' }}>{bulkMsg}</p>}
        </div>
      )}

      {/* Summary Cards */}
      <div className="stat-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--accent-soft)', color: 'var(--accent-h)' }}>
            <IconGraduate width={20} height={20} />
          </div>
          <div className="stat-label">Total Students</div>
          <div className="stat-value">{loading ? '...' : totalStudents}</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--success-soft)', color: 'var(--success)' }}>
            <IconCheckSq width={20} height={20} />
          </div>
          <div className="stat-label">Verified Students</div>
          <div className="stat-value">{loading ? '...' : verifiedCount}</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--warning-soft)', color: 'var(--warning)' }}>
            <IconWarning width={20} height={20} />
          </div>
          <div className="stat-label">Pending Verification</div>
          <div className="stat-value">{loading ? '...' : pendingCount}</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#eaf1ff', color: 'var(--accent-2)' }}>
            <IconBuilding width={20} height={20} />
          </div>
          <div className="stat-label">Total Departments</div>
          <div className="stat-value">{loading ? '...' : totalDepts}</div>
        </div>
      </div>

      {/* Filters and Search Section */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'flex-end' }}>
          {/* Search Input */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ marginBottom: '0.35rem' }}>Search</label>
            <div className="search-wrap" style={{ margin: 0, width: '100%' }}>
              <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                className="search-input"
                style={{ width: '100%' }}
                placeholder="Name, roll number, email..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Department Filter */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ marginBottom: '0.35rem' }}>Department</label>
            <select className="form-select" value={filterDept} onChange={e => { setFilterDept(e.target.value); setFilterBatch(''); }}>
              <option value="">All Departments</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>

          {/* Batch Filter */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ marginBottom: '0.35rem' }}>Batch</label>
            <select className="form-select" value={filterBatch} onChange={e => setFilterBatch(e.target.value)}>
              <option value="">All Batches</option>
              {filteredFilterBatches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>

          {/* Verification Status Filter */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ marginBottom: '0.35rem' }}>Verification Status</label>
            <select className="form-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="verified">Verified</option>
              <option value="pending">Pending</option>
            </select>
          </div>
        </div>

        {/* Clear Filters Button */}
        {(search || filterDept || filterBatch || filterStatus) && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setSearch('');
                setFilterDept('');
                setFilterBatch('');
                setFilterStatus('');
              }}
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>

      {/* Result count */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '8px' }}>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-2)', fontWeight: 500 }}>
          {loading ? (
            'Loading students...'
          ) : (
            `Showing ${filtered.length} of ${students.length} students`
          )}
        </p>
      </div>

      <div className="table-wrap">
        <table className="students-table">
          <thead>
            <tr>
              <th className="col-num">#</th>
              <th className="col-name">Name</th>
              <th className="col-enroll">Enrollment No</th>
              <th className="col-roll">Roll No</th>
              <th className="col-email">Email</th>
              <th className="col-dept">Department</th>
              <th className="col-batch">Batch</th>
              <th className="col-status">Status</th>
              <th className="col-risk">Risk</th>
              <th className="col-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10} style={{ textAlign: 'center', padding: '2rem' }}><span className="spinner" /></td></tr>
            ) : paginatedStudents.length === 0 ? (
              <tr>
                <td colSpan={10}>
                  <div className="empty">
                    <div className="empty-icon">🎓</div>
                    <p>No students found.</p>
                  </div>
                </td>
              </tr>
            ) : paginatedStudents.map((s, i) => (
              <tr key={s.id}>
                <td className="col-num" style={{ color: 'var(--text-3)' }}>{startIndex + i + 1}</td>
                <td className="col-name" title={s.name}>
                  <button
                    onClick={() => setPreviewTarget(s)}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      font: 'inherit',
                      color: 'var(--accent)',
                      fontWeight: '600',
                      cursor: 'pointer',
                      textAlign: 'left',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      maxWidth: '100%',
                      display: 'block'
                    }}
                    onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                    onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
                  >
                    {s.name}
                  </button>
                </td>
                <td className="col-enroll" title={s.enrollment_number || 'Not Assigned'} style={{ color: s.enrollment_number ? 'var(--text-1)' : 'var(--text-3)', fontStyle: s.enrollment_number ? 'normal' : 'italic', fontWeight: s.enrollment_number ? 500 : 400 }}>
                  {s.enrollment_number && String(s.enrollment_number).trim() ? s.enrollment_number : 'Not Assigned'}
                </td>
                <td className="col-roll" style={{ color: 'var(--text-2)' }}>{s.roll_no}</td>
                <td className="col-email" title={s.email} style={{ color: 'var(--text-2)' }}>
                  {s.email}
                </td>
                <td className="col-dept" title={getDeptName(s.department)} style={{ fontWeight: 500 }}>
                  {getDeptName(s.department)}
                </td>
                <td className="col-batch">
                  <span className="badge badge-gray">{getBatchName(s.batch)}</span>
                </td>
                <td className="col-status">
                  <span className={`badge ${s.is_verified ? 'badge-green' : 'badge-yellow'}`}>
                    {s.is_verified ? 'Verified' : 'Pending'}
                  </span>
                </td>
                <td className="col-risk">
                  {riskMap[s.roll_no] ? (
                    <span className={`badge ${
                      riskMap[s.roll_no].level === 'high' ? 'badge-red' :
                      riskMap[s.roll_no].level === 'medium' ? 'badge-yellow' : 'badge-green'
                    }`}>
                      {riskMap[s.roll_no].level === 'high' ? 'High Risk' :
                       riskMap[s.roll_no].level === 'medium' ? 'Medium Risk' : 'Low Risk'}
                    </span>
                  ) : (
                    <span className="badge badge-gray">—</span>
                  )}
                </td>
                <td className="col-actions">
                  <button className="btn btn-danger btn-sm" onClick={() => setDeleteTarget(s)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {!loading && totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-2)' }}>
            Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
          </p>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              className="btn btn-ghost btn-sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            >
              &larr; Previous
            </button>
            
            {Array.from({ length: totalPages }, (_, idx) => idx + 1)
              .filter(p => {
                return p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1;
              })
              .map((p, idx, arr) => {
                const prev = arr[idx - 1];
                const showEllipsis = prev && p - prev > 1;

                return (
                  <div key={p} style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                    {showEllipsis && <span style={{ color: 'var(--text-3)', fontSize: '0.85rem', padding: '0 4px' }}>...</span>}
                    <button
                      className={`btn btn-sm ${currentPage === p ? 'btn-primary' : 'btn-ghost'}`}
                      style={{ minWidth: '32px', padding: '6px 8px' }}
                      onClick={() => setCurrentPage(p)}
                    >
                      {p}
                    </button>
                  </div>
                );
              })}

            <button
              className="btn btn-ghost btn-sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            >
              Next &rarr;
            </button>
          </div>
        </div>
      )}

      {/* Add Student Modal */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add Student">
        <form onSubmit={handleAdd}>
          {formError && <div className="alert alert-error">{formError}</div>}
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="John Doe" />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="john@example.com" />
          </div>
          <div className="form-group">
            <label className="form-label">Roll Number</label>
            <input className="form-input" value={form.roll_no} onChange={e => setForm({ ...form, roll_no: e.target.value })} placeholder="CS2021001" />
          </div>
          <div className="form-group">
            <label className="form-label">Department</label>
            <select className="form-select" value={form.department} onChange={e => setForm({ ...form, department: e.target.value, batch: '' })}>
              <option value="">— Select Department —</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Batch</label>
            <select className="form-select" value={form.batch} onChange={e => setForm({ ...form, batch: e.target.value })}>
              <option value="">— Select Batch —</option>
              {filteredBatches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
            <button type="button" className="btn btn-ghost" onClick={() => setShowAdd(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <span className="spinner" /> : 'Add Student'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Confirm Delete">
        <p>Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This action cannot be undone.</p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
          <button className="btn btn-ghost" onClick={() => setDeleteTarget(null)}>Cancel</button>
          <button className="btn btn-danger" onClick={handleDelete} disabled={deleting}>
            {deleting ? <span className="spinner" /> : 'Delete'}
          </button>
        </div>
      </Modal>

      {/* Quick profile preview */}
      <QuickPreviewModal
        isOpen={!!previewTarget}
        onClose={() => setPreviewTarget(null)}
        personId={previewTarget?.id}
        role="student"
      />
    </div>
  );
}
