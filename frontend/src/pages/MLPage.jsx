import { useEffect, useState } from 'react';
import api from '../api/axios';

export default function MLPage() {
  const [atRisk, setAtRisk] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [modelAccuracy, setModelAccuracy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    setError('');
    try {
      const [risk, pred] = await Promise.all([
        api.get('ml/at-risk/'),        // baseURL already includes /api/
        api.get('ml/predict-score/'),
      ]);

      // Backend returns { at_risk_students: [...], total_students, at_risk_count, accuracy }
      setAtRisk(
        Array.isArray(risk.data)
          ? risk.data
          : (risk.data.at_risk_students || []),
      );
      setModelAccuracy(risk.data?.accuracy ?? null);

      // Backend returns { predictions: [...], r2_score, mae }
      setPredictions(
        Array.isArray(pred.data)
          ? pred.data
          : (pred.data.predictions || []),
      );
    } catch {
      setError('Failed to load ML data. Make sure the ML model is trained.');
    } finally {
      setLoading(false);
    }
  }

  function riskBadge(pct) {
    const n = parseFloat(pct);
    if (n >= 70) return 'badge badge-red';
    if (n >= 40) return 'badge badge-yellow';
    return 'badge badge-green';
  }

  function marksBadge(pct) {
    const n = parseFloat(pct);
    if (n >= 75) return 'badge badge-green';
    if (n >= 50) return 'badge badge-yellow';
    return 'badge badge-red';
  }

  return (
    <div>
      <h1 className="page-title">ML Insights</h1>
      <p className="page-sub" style={{ marginBottom: '1.5rem' }}>Machine learning predictions and at-risk student detection.</p>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem' }}><span className="spinner" /></div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="stat-grid" style={{ marginBottom: '2rem' }}>
            <div className="stat-card">
              <div className="stat-icon">⚠️</div>
              <div className="stat-value">
                <span className={atRisk.length > 0 ? 'badge badge-red' : 'badge badge-green'} style={{ fontSize: '1.5rem', padding: '0.4rem 0.8rem' }}>
                  {atRisk.length}
                </span>
              </div>
              <div className="stat-label">At-Risk Students</div>
            </div>
            {modelAccuracy !== null && (
              <div className="stat-card">
                <div className="stat-icon">🤖</div>
                <div className="stat-value">
                  <span className="badge badge-blue" style={{ fontSize: '1.5rem', padding: '0.4rem 0.8rem' }}>
                    {/* accuracy comes as a string like "87.5%" or "N/A (need ≥10 students)" */}
                    {modelAccuracy}
                  </span>
                </div>
                <div className="stat-label">Model Accuracy</div>
              </div>
            )}
          </div>

          {/* At-Risk Table */}
          <h2 className="page-sub" style={{ marginBottom: '0.75rem' }}>At-Risk Students</h2>
          <div className="table-wrap" style={{ marginBottom: '2rem' }}>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Roll No</th>
                  <th>Name</th>
                  <th>Avg Marks %</th>
                  <th>Attendance %</th>
                  <th>Risk %</th>
                </tr>
              </thead>
              <tbody>
                {atRisk.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <div className="empty">
                        <div className="empty-icon">✅</div>
                        <p>No at-risk students detected.</p>
                      </div>
                    </td>
                  </tr>
                ) : atRisk.map((s, i) => (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td>{s.roll_no}</td>
                    <td>{s.name}</td>
                    {/* Backend keys: avg_marks_%, attendance_%, risk_% */}
                    <td><span className={marksBadge(s['avg_marks_%'])}>{parseFloat(s['avg_marks_%'] || 0).toFixed(1)}%</span></td>
                    <td><span className={marksBadge(s['attendance_%'])}>{parseFloat(s['attendance_%'] || 0).toFixed(1)}%</span></td>
                    <td><span className={riskBadge(s['risk_%'])}>{parseFloat(s['risk_%'] || 0).toFixed(1)}%</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Predictions Table */}
          <h2 className="page-sub" style={{ marginBottom: '0.75rem' }}>Score Predictions</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Roll No</th>
                  <th>Name</th>
                  <th>Attendance %</th>
                  <th>Actual Avg %</th>
                  <th>Predicted %</th>
                </tr>
              </thead>
              <tbody>
                {predictions.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <div className="empty">
                        <div className="empty-icon">🔮</div>
                        <p>No predictions available.</p>
                      </div>
                    </td>
                  </tr>
                ) : predictions.map((p, i) => (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td>{p.roll_no}</td>
                    <td>{p.name}</td>
                    {/* Backend keys: attendance_%, avg_marks_%, predicted_% */}
                    <td><span className={marksBadge(p['attendance_%'])}>{parseFloat(p['attendance_%'] || 0).toFixed(1)}%</span></td>
                    <td><span className={marksBadge(p['avg_marks_%'])}>{parseFloat(p['avg_marks_%'] || 0).toFixed(1)}%</span></td>
                    <td>
                      <span className="badge badge-blue">
                        {parseFloat(p['predicted_%'] || 0).toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
