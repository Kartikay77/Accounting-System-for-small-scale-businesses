import { useEffect, useMemo, useState } from 'react';

const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2
});

async function api(path = '', options = {}) {
  const response = await fetch(`/salary/api${path}`, {
    credentials: 'same-origin',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  });

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    if (response.redirected) {
      window.location.href = response.url;
      throw new Error('Redirecting to login');
    }
    const text = await response.text();
    throw new Error(text || `HTTP ${response.status}`);
  }

  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
  return payload;
}

export default function App() {
  const [rows, setRows] = useState([]);
  const [companyName, setCompanyName] = useState('');
  const [employeeName, setEmployeeName] = useState('');
  const [monthlySalary, setMonthlySalary] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const totals = useMemo(() => {
    const monthly = rows.reduce((sum, row) => sum + Number(row.monthlySalary || 0), 0);
    return { daily: monthly / 30, monthly, yearly: monthly * 12 };
  }, [rows]);

  async function refresh() {
    setLoading(true);
    setError('');
    try {
      const payload = await api();
      setRows(payload.data || []);
      setCompanyName(payload.companyName || '');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  function resetForm() {
    setEmployeeName('');
    setMonthlySalary('');
    setEditingId(null);
  }

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const body = JSON.stringify({ employeeName, monthlySalary: Number(monthlySalary) });
      if (editingId) {
        await api(`/${editingId}`, { method: 'PUT', body });
      } else {
        await api('', { method: 'POST', body });
      }
      resetForm();
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function edit(row) {
    setEmployeeName(row.employeeName);
    setMonthlySalary(String(row.monthlySalary));
    setEditingId(row._id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function remove(row) {
    if (!window.confirm(`Archive salary record for ${row.employeeName}?`)) return;
    setError('');
    try {
      await api(`/${row._id}`, { method: 'DELETE' });
      if (editingId === row._id) resetForm();
      await refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">React module · Easy Accounting</p>
          <h1>Salary Management</h1>
          <p className="subtle">Live React UI backed by the same Express session and MongoDB database.</p>
        </div>
        <div className="topbar-actions">
          <a className="button secondary" href="/home">Back to accounting app</a>
          <button className="button secondary" onClick={refresh} disabled={loading}>Refresh</button>
        </div>
      </header>

      <main>
        <section className="context-card">
          <span>Selected company</span>
          <strong>{companyName || 'Loading…'}</strong>
        </section>

        {error && <div className="alert">{error}</div>}

        <section className="stats-grid">
          <article><span>Daily estimate</span><strong>{currency.format(totals.daily)}</strong></article>
          <article><span>Monthly payroll</span><strong>{currency.format(totals.monthly)}</strong></article>
          <article><span>Yearly payroll</span><strong>{currency.format(totals.yearly)}</strong></article>
          <article><span>Employees</span><strong>{rows.length}</strong></article>
        </section>

        <section className="panel two-column">
          <div>
            <p className="eyebrow">{editingId ? 'Edit record' : 'New record'}</p>
            <h2>{editingId ? 'Update employee salary' : 'Add employee salary'}</h2>
            <form onSubmit={submit} className="salary-form">
              <label>
                Employee name
                <input value={employeeName} onChange={(event) => setEmployeeName(event.target.value)} required maxLength="120" placeholder="e.g. Priya Sharma" />
              </label>
              <label>
                Monthly salary (₹)
                <input type="number" min="0" step="0.01" value={monthlySalary} onChange={(event) => setMonthlySalary(event.target.value)} required placeholder="60000" />
              </label>
              <div className="form-actions">
                <button className="button" type="submit" disabled={saving}>{saving ? 'Saving…' : editingId ? 'Save changes' : 'Add salary'}</button>
                {editingId && <button className="button secondary" type="button" onClick={resetForm}>Cancel</button>}
              </div>
            </form>
          </div>

          <div className="explain-card">
            <p className="eyebrow">What this demonstrates</p>
            <h2>Actual React + API + MongoDB</h2>
            <p>This module uses React state and effects in the browser, calls JSON endpoints in Express, and persists changes in MongoDB.</p>
            <p>It recreates the daily, monthly, yearly, edit and delete salary functionality documented in the original project report.</p>
          </div>
        </section>

        <section className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Payroll records</p>
              <h2>Employees</h2>
            </div>
            <span className="subtle">{loading ? 'Loading from MongoDB…' : `${rows.length} active record(s)`}</span>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Daily</th>
                  <th>Monthly</th>
                  <th>Yearly</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {!loading && rows.length === 0 && (
                  <tr><td colSpan="5" className="empty">No salary records yet.</td></tr>
                )}
                {rows.map((row) => (
                  <tr key={row._id}>
                    <td><strong>{row.employeeName}</strong></td>
                    <td>{currency.format(Number(row.monthlySalary || 0) / 30)}</td>
                    <td>{currency.format(Number(row.monthlySalary || 0))}</td>
                    <td>{currency.format(Number(row.monthlySalary || 0) * 12)}</td>
                    <td className="row-actions">
                      <button className="link-button" onClick={() => edit(row)}>Edit</button>
                      <button className="link-button danger" onClick={() => remove(row)}>Archive</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
