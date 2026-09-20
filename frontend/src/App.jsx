import { useEffect, useMemo, useState } from 'react';
import api from './api';

const emptyStudent = { studentId: '', name: '', email: '', department: '', semester: '', contact: '' };
const labels = { studentId: 'Student ID', name: 'Full Name', email: 'Email Address', department: 'Department', semester: 'Semester', contact: 'Contact Number' };

export default function App() {
  const [students, setStudents] = useState([]);
  const [form, setForm] = useState(emptyStudent);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState('');
  const [notice, setNotice] = useState({ text: '', error: false });
  const [loading, setLoading] = useState(true);
  const notify = (text, error = false) => setNotice({ text, error });
  const loadStudents = async () => { try { setLoading(true); const { data } = await api.get('/students'); setStudents(data.students); } catch (e) { notify(e.response?.data?.message || 'Could not reach the backend.', true); } finally { setLoading(false); } };
  useEffect(() => { loadStudents(); }, []);
  const filteredStudents = useMemo(() => students.filter((s) => `${s.studentId} ${s.name}`.toLowerCase().includes(search.toLowerCase())), [students, search]);
  const submit = async (event) => {
    event.preventDefault();
    try { const { data } = editingId ? await api.put(`/students/${editingId}`, form) : await api.post('/students', form); notify(data.message); setForm(emptyStudent); setEditingId(null); loadStudents(); }
    catch (e) { notify(e.response?.data?.message || 'Unable to save student.', true); }
  };
  const edit = (student) => { setEditingId(student._id); setForm({ studentId: student.studentId, name: student.name, email: student.email, department: student.department, semester: student.semester, contact: student.contact }); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const remove = async (id, name) => { if (!window.confirm(`Delete ${name}? This cannot be undone.`)) return; try { const { data } = await api.delete(`/students/${id}`); notify(data.message); loadStudents(); } catch (e) { notify(e.response?.data?.message || 'Unable to delete student.', true); } };
  return <><nav><div className="brand"><span>🎓</span>BIT Student Information Management System</div><span className="tier">Three-Tier Cloud Application</span></nav><main><section className="hero"><p className="eyebrow">STUDENT DIRECTORY</p><h1>Manage student records with confidence.</h1><p>Add, find, update, and remove student information from one secure dashboard.</p></section>{notice.text && <div className={`notice ${notice.error ? 'error' : ''}`}>{notice.text}<button onClick={() => setNotice({ text: '', error: false })}>×</button></div>}<section className="card form-card"><div className="section-title"><div><p className="eyebrow">{editingId ? 'UPDATE RECORD' : 'NEW RECORD'}</p><h2>{editingId ? 'Edit student' : 'Add a student'}</h2></div>{editingId && <button className="text-button" onClick={() => { setForm(emptyStudent); setEditingId(null); }}>Cancel edit</button>}</div><form onSubmit={submit}>{Object.keys(labels).map((key) => <label key={key}>{labels[key]}<input required type={key === 'email' ? 'email' : key === 'semester' ? 'number' : 'text'} min={key === 'semester' ? 1 : undefined} max={key === 'semester' ? 12 : undefined} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} placeholder={`Enter ${labels[key].toLowerCase()}`} /></label>)}<button className="primary" type="submit">{editingId ? 'Save Changes' : 'Add Student'}</button></form></section><section className="card table-card"><div className="section-title"><div><p className="eyebrow">STUDENT LIST</p><h2>All students <span>{students.length}</span></h2></div><input className="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by ID or name..." /></div><div className="table-wrap"><table><thead><tr>{['Student ID','Name','Email','Department','Semester','Contact','Actions'].map((head) => <th key={head}>{head}</th>)}</tr></thead><tbody>{loading ? <tr><td colSpan="7" className="empty">Loading students…</td></tr> : filteredStudents.length ? filteredStudents.map((s) => <tr key={s._id}><td><strong>{s.studentId}</strong></td><td>{s.name}</td><td>{s.email}</td><td>{s.department}</td><td><span className="semester">{s.semester}</span></td><td>{s.contact}</td><td className="actions"><button onClick={() => edit(s)}>Edit</button><button className="delete" onClick={() => remove(s._id, s.name)}>Delete</button></td></tr>) : <tr><td colSpan="7" className="empty">No students found.</td></tr>}</tbody></table></div></section></main></>;
}
