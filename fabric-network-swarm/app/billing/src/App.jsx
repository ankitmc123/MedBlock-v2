import React, { useState, useEffect } from 'react';
import { Pill, CreditCard, Clipboard, UserCircle, Droplets, Calendar, FileText, Save, X, Plus, Search, LogOut, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './styles.css';

const API_BASE_URL = 'http://100.124.176.94:3000';

const api = async (path, opts = {}) => {
  const res = await fetch(`${API_BASE_URL}${path}`, opts);
  if (!res.ok) throw new Error('Request failed');
  return res.json();
};

export default function App() {
  const [activeUser, setActiveUser] = useState('billing01');
  const [patientId, setPatientId] = useState('');
  const [name, setName] = useState('');
  const [medicines, setMedicines] = useState([]);
  const [medName, setMedName] = useState('');
  const [medQty, setMedQty] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const addMed = () => {
    if (medName && medQty) {
      setMedicines([...medicines, { name: medName, quantity: medQty }]);
      setMedName(''); setMedQty('');
    }
  };

  const handleBill = async (e) => {
    e.preventDefault();
    setLoading(true); setMsg('');
    try {
      await api('/api/prescription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: activeUser, patientId, name: name || `Order ${Date.now()}`, medicines })
      });
      setMsg('Bill & Prescription Issued Successfully!');
      setPatientId(''); setName(''); setMedicines([]);
    } catch (err) {
      setMsg(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <nav className="nav">
        <div className="logo" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
           <CreditCard size={28} color="#3b82f6" />
           <span>Pharmacy <span style={{ fontWeight: 300, color: '#94a3b8' }}>Billing</span></span>
        </div>
        
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
           <div className="glass-card" style={{ padding: '0.4rem 1rem', borderRadius: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.05)' }}>
             <UserCircle size={16} color="#3b82f6" />
             <input 
                value={activeUser} 
                onChange={e => setActiveUser(e.target.value)}
                style={{ background: 'transparent', border: 'none', color: 'white', outline: 'none', width: '100px', fontSize: '0.8rem' }}
                placeholder="Employee ID"
             />
           </div>
        </div>
      </nav>

      <main className="app-container">
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="glass-card" style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
            <div>
              <h2><Plus size={20} color="#3b82f6" /> Issue New Bill</h2>
              <p style={{ color: '#64748b', fontSize: '0.8rem' }}>Acting Agent: <span style={{ color: '#3b82f6' }}>{activeUser}</span></p>
            </div>
          </div>

          <form onSubmit={handleBill}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontSize: '0.8rem', color: '#94a3b8' }}>
                   <Clipboard size={14} /> Patient ID
                </label>
                <input required value={patientId} onChange={e => setPatientId(e.target.value)} placeholder="e.g. pat001" />
              </div>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontSize: '0.8rem', color: '#94a3b8' }}>
                   <FileText size={14} /> Description
                </label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Cold Flu Pack" />
              </div>
            </div>

            <div className="glass-card" style={{ background: 'rgba(0,0,0,0.2)', padding: '1.5rem', marginBottom: '1.5rem' }}>
              <h4 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Pill size={16} color="#10b981" /> Medicine Inventory</h4>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input value={medName} onChange={e => setMedName(e.target.value)} placeholder="Search Ledger for Stock..." style={{ flex: 1 }} />
                <input value={medQty} onChange={e => setMedQty(e.target.value)} placeholder="Qty" style={{ width: '80px' }} />
                <button type="button" onClick={addMed} className="btn btn-primary" style={{ background: '#3b82f6' }}><Plus size={16} /></button>
              </div>
              
              <ul style={{ marginTop: '1rem', listStyle: 'none' }}>
                {medicines.map((m, i) => (
                  <motion.li initial={{ x: -10, opacity: 0 }} animate={{ x: 0, opacity: 1 }} key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <span>{m.name}</span>
                    <span style={{ fontWeight: 800, color: '#3b82f6' }}>x{m.quantity}</span>
                  </motion.li>
                ))}
              </ul>
            </div>

            {msg && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ padding: '1rem', borderRadius: '0.5rem', background: msg.includes('Error') ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)', color: msg.includes('Error') ? '#ef4444' : '#10b981', marginBottom: '1rem' }}>
                 {msg}
              </motion.div>
            )}

            <button type="submit" className="btn btn-primary" disabled={loading || medicines.length === 0} style={{ width: '100%', background: '#3b82f6', height: '3.5rem' }}>
              {loading ? <RefreshCw className="animate-spin" /> : <><Save size={18} /> Process High-Value Transaction</>}
            </button>
          </form>
        </motion.div>
      </main>
    </div>
  );
}
