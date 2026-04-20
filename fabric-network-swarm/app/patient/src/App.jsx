import React, { useState, useEffect } from 'react';
import { Pill, Activity, ShieldCheck, Lock, Unlock, RefreshCw, FileText, User, Search, ExternalLink, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './styles.css';

const API_BASE_URL = 'http://100.124.176.94:3000';

const api = async (path, opts = {}) => {
  const res = await fetch(`${API_BASE_URL}${path}`, opts);
  if (!res.ok) throw new Error('Request failed');
  return res.json();
};

export default function App() {
  const [patientId, setPatientId] = useState('pat001');
  const [tab, setTab] = useState('records');
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [accessForm, setAccessForm] = useState({ requesterId: '', action: 'grant' });
  const [msg, setMsg] = useState('');

  const loadRecords = async () => {
    setLoading(true);
    try {
      const data = await api(`/api/patients/${patientId}?user=${patientId}`);
      setRecords(Array.isArray(data) ? data : []);
    } catch (err) {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadRecords(); }, [patientId]);

  const handleAccess = async (e) => {
    e.preventDefault();
    setMsg('');
    try {
      const endpoint = accessForm.action === 'grant' ? '/api/grant-access' : '/api/revoke-access';
      await api(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: patientId, patientId, requesterId: accessForm.requesterId })
      });
      setMsg(`Access ${accessForm.action}ed successfully!`);
      setAccessForm({ ...accessForm, requesterId: '' });
    } catch (err) {
      setMsg(`Error: ${err.message}`);
    }
  };

  return (
    <div className="app">
      <nav className="nav">
        <div className="logo" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
           <Pill size={28} color="#10b981" />
           <span>Pharmacy <span style={{ fontWeight: 300, color: '#94a3b8' }}>Patient Portal</span></span>
        </div>
        
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
           <div className="glass-card" style={{ padding: '0.4rem 1rem', borderRadius: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.05)' }}>
             <User size={16} color="#10b981" />
             <input 
                value={patientId} 
                onChange={e => setPatientId(e.target.value)}
                style={{ background: 'transparent', border: 'none', color: 'white', outline: 'none', width: '100px', fontSize: '0.8rem' }}
                placeholder="Patient ID"
             />
           </div>
           <button className="btn" onClick={loadRecords} style={{ padding: '0.5rem' }}><RefreshCw size={18} /></button>
        </div>
      </nav>

      <main className="app-container">
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
           <button className={`btn ${tab === 'records' ? 'btn-primary' : ''}`} onClick={() => setTab('records')} style={{ background: tab === 'records' ? '' : 'transparent' }}>
             <FileText size={18} /> My Medical Documents
           </button>
           <button className={`btn ${tab === 'privacy' ? 'btn-primary' : ''}`} onClick={() => setTab('privacy')} style={{ background: tab === 'privacy' ? '' : 'transparent' }}>
             <Lock size={18} /> Privacy & Governance
           </button>
        </div>

        <AnimatePresence mode="wait">
          {tab === 'records' && (
            <motion.div key="rec" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
               <div className="grid">
                 {records.map((r, i) => (
                   <div key={i} className="glass-card" style={{ borderLeft: '4px solid #10b981' }}>
                     <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                        <span className="badge" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>EHR SYNCED</span>
                        <ShieldCheck size={18} color="#10b981" />
                     </div>
                     <h3 style={{ marginBottom: '1rem' }}>{r.name || 'Medical Update'}</h3>
                     <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '0.5rem', fontSize: '0.85rem' }}>
                        <p style={{ color: '#94a3b8', marginBottom: '0.5rem' }}>Prescribed Medicines:</p>
                        <p style={{ fontWeight: 600 }}>{JSON.stringify(r.medicines || [])}</p>
                     </div>
                     <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: '#64748b' }}>
                        <div style={{ display: 'flex', gap: '0.5rem' }}><Calendar size={14} /> {new Date(r.timestamp).toLocaleDateString()}</div>
                        <a href={`http://${API_BASE_URL}/api/cat?arg=${r.ipfsHash}`} target="_blank" style={{ color: '#8b5cf6', textDecoration: 'none' }}>Verify on IPFS <ExternalLink size={12} /></a>
                     </div>
                   </div>
                 ))}
                 {records.length === 0 && <div className="glass-card" style={{ gridColumn: '1/-1', textAlign: 'center', padding: '4rem', color: '#64748b' }}>No medical history found for your account. Ensure you have granted access to your physician.</div>}
               </div>
            </motion.div>
          )}

          {tab === 'privacy' && (
            <motion.div key="priv" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
               <div className="glass-card" style={{ maxWidth: '500px', margin: '0 auto' }}>
                  <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{ width: '60px', height: '60px', background: 'rgba(16,185,129,0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                      <Lock size={30} color="#10b981" />
                    </div>
                    <h2>Self-Governance Console</h2>
                    <p style={{ color: '#64748b', fontSize: '0.9rem' }}>You control your cryptographic data on the blockchain.</p>
                  </div>

                  <form onSubmit={handleAccess}>
                    <div style={{ marginBottom: '1.5rem' }}>
                       <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem', color: '#94a3b8' }}>Physician / Organization ID</label>
                       <input required value={accessForm.requesterId} onChange={e => setAccessForm({...accessForm, requesterId: e.target.value})} placeholder="e.g. doc001" style={{ width: '100%', padding: '0.8rem' }} />
                    </div>
                    <div style={{ marginBottom: '1.5rem' }}>
                       <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem', color: '#94a3b8' }}>Action</label>
                       <select value={accessForm.action} onChange={e => setAccessForm({...accessForm, action: e.target.value})} style={{ width: '100%', padding: '0.8rem', background: 'rgba(15,23,42,0.8)', color: 'white', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                         <option value="grant">Grant Read/Write Access</option>
                         <option value="revoke">Revoke All Access</option>
                       </select>
                    </div>

                    <AnimatePresence>
                      {msg && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} style={{ padding: '1rem', borderRadius: '0.5rem', background: msg.includes('Error') ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)', color: msg.includes('Error') ? '#ef4444' : '#10b981', marginBottom: '1rem' }}>
                           {msg}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <button type="submit" className="btn btn-primary" style={{ width: '100%', height: '3.5rem' }}>
                      Execute Governance Transaction
                    </button>
                  </form>
               </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
