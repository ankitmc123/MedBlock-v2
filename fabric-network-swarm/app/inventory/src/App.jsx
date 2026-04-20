import React, { useState, useEffect } from 'react';
import { Package, Activity, Search, RefreshCw, AlertTriangle, ShieldCheck, User, Pill, ArrowRight, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './styles.css';

const API_BASE_URL = 'http://100.124.176.94:3000';

const api = async (path, opts = {}) => {
  const res = await fetch(`${API_BASE_URL}${path}`, opts);
  if (!res.ok) throw new Error('Request failed');
  return res.json();
};

export default function App() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState('inventory_mgr');

  const loadInventory = async () => {
    setLoading(true);
    try {
      const data = await api(`/all?user=${currentUser}`);
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadInventory(); }, []);

  return (
    <div className="app">
      <nav className="nav">
        <div className="logo" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
           <Package size={28} color="#eab308" />
           <span>Pharmacy <span style={{ fontWeight: 300, color: '#94a3b8' }}>Stock Ledger</span></span>
        </div>
        
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
           <div className="glass-card" style={{ padding: '0.4rem 1rem', borderRadius: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.05)' }}>
             <User size={16} color="#eab308" />
             <input 
                value={currentUser} 
                onChange={e => setCurrentUser(e.target.value)}
                style={{ background: 'transparent', border: 'none', color: 'white', outline: 'none', width: '100px', fontSize: '0.8rem' }}
                placeholder="Stock Officer ID"
             />
           </div>
           <button className="btn" onClick={loadInventory} style={{ padding: '0.5rem' }}><RefreshCw size={18} /></button>
        </div>
      </nav>

      <main className="app-container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h2><Activity size={20} color="#eab308" /> Real-Time Inventory Audit</h2>
          <div className="badge" style={{ background: 'rgba(234, 179, 8, 0.1)', color: '#eab308', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldCheck size={14} /> Synced with Ledger
          </div>
        </div>

        <div className="grid">
          {items.map((item, i) => (
             <motion.div 
               whileHover={{ y: -5 }}
               key={i} 
               className="glass-card" 
               style={{ borderTop: '2px solid rgba(234, 179, 8, 0.3)' }}
             >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                  <div style={{ width: '40px', height: '40px', background: 'rgba(234, 179, 8, 0.1)', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Pill size={20} color="#eab308" />
                  </div>
                  {item.medicines?.length === 0 && <AlertTriangle size={18} color="#ef4444" />}
                </div>

                <h3 style={{ marginBottom: '0.5rem' }}>{item.name || 'Batch #'+(i+1)}</h3>
                <p style={{ color: '#64748b', fontSize: '0.8rem', marginBottom: '1.5rem' }}>P-ID: {item.patientId}</p>

                <div className="glass-card" style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', border: 'none' }}>
                  {item.medicines?.map((m, j) => (
                    <div key={j} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                      <span style={{ color: '#94a3b8' }}>{m.name}</span>
                      <span style={{ fontWeight: 800 }}>{m.quantity} Units</span>
                    </div>
                  ))}
                  {(!item.medicines || item.medicines.length === 0) && <div style={{ fontSize: '0.8rem', color: '#64748b' }}>No medications in this batch</div>}
                </div>

                <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                   <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                     {new Date(item.timestamp).toLocaleDateString()}
                   </div>
                   <ExternalLink size={14} color="#8b5cf6" style={{ cursor: 'pointer' }} />
                </div>
             </motion.div>
          ))}
          {items.length === 0 && (
            <div className="glass-card" style={{ gridColumn: '1/-1', textAlign: 'center', padding: '6rem', color: '#64748b' }}>
              <Package size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
              <p>Scanning blockchain for stock updates...</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
