import React, { useState, useEffect } from 'react';
import { Search, Plus, User, Activity, Calendar, ExternalLink, ShieldCheck, Pill, RefreshCw, Users, Package, ClipboardList } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './styles.css';

const API_BASE_URL = 'http://100.124.176.94:3000';

const api = async (path, opts = {}) => {
  const res = await fetch(`${API_BASE_URL}${path}`, opts);
  if (!res.ok) throw new Error('Request failed');
  return res.json();
};

function NetworkTab({ status, onRefresh }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3><Activity size={18} color="#10b981" /> Swarm Pulse Monitor</h3>
        <button className="btn" onClick={onRefresh} style={{ background: 'rgba(255,255,255,0.05)', padding: '0.5rem' }}>
          <RefreshCw size={14} />
        </button>
      </div>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        {['peer0', 'peer1', 'peer2'].map((id, i) => (
          <div key={id} className="glass-card" style={{ padding: '1.5rem', textAlign: 'center' }}>
            <div style={{ position: 'relative', width: '40px', height: '40px', margin: '0 auto 1rem' }}>
               <div className="pulse-circle" style={{ width: '100%', height: '100%', animationDelay: `${i * 0.5}s` }} />
            </div>
            <div style={{ fontWeight: 600, color: '#f8fafc' }}>{id.toUpperCase()}</div>
            <div style={{ color: '#10b981', fontSize: '1.2rem', fontWeight: 800, marginTop: '0.5rem' }}>
              Height: {status[id] || '...'}
            </div>
            <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.5rem' }}>
              {id === 'peer0' ? 'PC1 (Manager)' : `PC${i+1} (Worker)`}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

export default function App() {
  const [tab, setTab] = useState('overview');
  const [activeUser, setActiveUser] = useState('manager');
  const [records, setRecords] = useState([]);
  const [users, setUsers] = useState([]);
  const [networkStatus, setNetworkStatus] = useState({});
  const [loading, setLoading] = useState(false);

  const loadData = () => {
    setLoading(true);
    const u = activeUser || 'manager';
    Promise.all([
      api(`/all?user=${u}`).catch(() => []),
      api(`/api/users?user=${u}`).catch(() => []),
      api(`/api/network-status`).catch(() => ({}))
    ]).then(([r, us, ns]) => {
      setRecords(Array.isArray(r) ? r : []);
      setUsers(Array.isArray(us) ? us : []);
      setNetworkStatus(ns || {});
    }).finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  return (
    <div className="app">
      <nav className="nav">
        <div className="logo" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
           <Pill size={28} color="#10b981" />
           <span>Pharmacy <span style={{ fontWeight: 300, color: '#94a3b8' }}>Manager</span></span>
        </div>
        
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
           <div className="glass-card" style={{ padding: '0.4rem 1rem', borderRadius: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.05)' }}>
             <User size={16} color="#10b981" />
             <input 
                value={activeUser} 
                onChange={e => setActiveUser(e.target.value)}
                style={{ background: 'transparent', border: 'none', color: 'white', outline: 'none', width: '100px', fontSize: '0.8rem' }}
                placeholder="Manager ID"
             />
           </div>
           <button className="btn" onClick={loadData} style={{ padding: '0.5rem' }}><RefreshCw size={18} /></button>
        </div>
      </nav>

      <main className="app-container">
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
           <button className={`btn ${tab === 'overview' ? 'btn-primary' : ''}`} onClick={() => setTab('overview')} style={{ background: tab === 'overview' ? '' : 'transparent' }}>
             <Activity size={18} /> Central Ledger
           </button>
           <button className={`btn ${tab === 'employees' ? 'btn-primary' : ''}`} onClick={() => setTab('employees')} style={{ background: tab === 'employees' ? '' : 'transparent' }}>
             <Users size={18} /> Workforce
           </button>
           <button className={`btn ${tab === 'network' ? 'btn-primary' : ''}`} onClick={() => setTab('network')} style={{ background: tab === 'network' ? '' : 'transparent' }}>
             <RefreshCw size={18} /> Swarm Pulse
           </button>
        </div>

        <AnimatePresence mode="wait">
          {tab === 'overview' && (
            <motion.div key="ov" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
               <div className="grid">
                 {records.map((r, i) => (
                   <div key={i} className="glass-card" style={{ position: 'relative', overflow: 'hidden' }}>
                     <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px', background: '#10b981' }} />
                     <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                        <span className="badge" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>{r.patientId}</span>
                        <ShieldCheck size={16} color="#10b981" />
                     </div>
                     <h3 style={{ marginBottom: '0.5rem' }}>{r.name || 'Unnamed Patient'}</h3>
                     <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        TX: <code style={{ color: '#10b981' }}>{r.ipfsHash.slice(0, 24)}...</code>
                     </div>
                     <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{new Date(r.timestamp).toLocaleString()}</span>
                        <ExternalLink size={14} color="#8b5cf6" style={{ cursor: 'pointer' }} />
                     </div>
                   </div>
                 ))}
                 {records.length === 0 && <div className="glass-card" style={{ gridColumn: '1/-1', textAlign: 'center', padding: '4rem', color: '#64748b' }}>No blockchain records found.</div>}
               </div>
            </motion.div>
          )}

          {tab === 'employees' && (
            <motion.div key="emp" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
               <div className="glass-card">
                 <h3>Active Consortium Users</h3>
                 <div className="grid" style={{ marginTop: '1.5rem' }}>
                   {users.map(u => (
                     <div key={u.userId} className="glass-card" style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, #8b5cf6, #10b981)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>{u.userId[0].toUpperCase()}</div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{u.userId}</div>
                          <div style={{ fontSize: '0.7rem', color: '#10b981', textTransform: 'uppercase' }}>{u.role}</div>
                        </div>
                     </div>
                   ))}
                 </div>
               </div>
            </motion.div>
          )}

          {tab === 'network' && <NetworkTab status={networkStatus} onRefresh={loadData} />}
        </AnimatePresence>
      </main>

      <footer style={{ textAlign: 'center', padding: '4rem', color: '#64748b', fontSize: '0.8rem' }}>
        <p>© 2026 Decentralized Pharmacy Ledger Systems | Node Topology: Swarm v1.2</p>
      </footer>
    </div>
  );
}
