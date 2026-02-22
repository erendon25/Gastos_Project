import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Wallet, Plus, Bell, LogOut, Settings } from 'lucide-react';
import { BarChart, Bar, ResponsiveContainer, Cell } from 'recharts';
import DebtSection from './DebtSection';
import RecentTransactions from './RecentTransactions';
import AddExpenseModal from './AddExpenseModal';
import { auth, db } from '../lib/firebase';
import { collection, onSnapshot, query } from 'firebase/firestore';

interface DashboardProps {
  onOpenSettings?: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onOpenSettings }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [totals, setTotals] = useState({ income: 0, expenses: 0, recurring: 0 });

  useEffect(() => {
    if (!auth.currentUser) return;

    const qExp = query(collection(db, 'users', auth.currentUser.uid, 'expenses'));
    const unsubExp = onSnapshot(qExp, (snap) => {
      const exp = snap.docs.reduce((acc, doc) => acc + (doc.data().amount || 0), 0);
      setTotals(prev => ({ ...prev, expenses: exp }));
    });

    const qInc = query(collection(db, 'users', auth.currentUser.uid, 'income'));
    const unsubInc = onSnapshot(qInc, (snap) => {
      const inc = snap.docs.reduce((acc, doc) => acc + (doc.data().amount || 0), 0);
      setTotals(prev => ({ ...prev, income: inc }));
    });

    const qRec = query(collection(db, 'users', auth.currentUser.uid, 'recurring_expenses'));
    const unsubRec = onSnapshot(qRec, (snap) => {
      const rec = snap.docs.reduce((acc, doc) => acc + (doc.data().amount || 0), 0);
      setTotals(prev => ({ ...prev, recurring: rec }));
    });

    return () => { unsubExp(); unsubInc(); unsubRec(); };
  }, []);

  const totalExpenses = totals.expenses + totals.recurring;
  const balance = totals.income - totalExpenses;

  return (
    <div className="dashboard-container" style={{ padding: '24px 20px 150px 20px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#262626', overflow: 'hidden' }}>
            {auth.currentUser?.photoURL ? <img src={auth.currentUser.photoURL} alt="profile" style={{ width: '100%' }} /> : <div style={{ width: '100%', height: '100%', background: '#333' }} />}
          </div>
          <div>
            <p style={{ fontSize: '11px', color: '#666' }}>Hola,</p>
            <p style={{ fontSize: '14px', fontWeight: 'bold' }}>{auth.currentUser?.displayName || 'Usuario'}</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <button onClick={onOpenSettings} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            <Settings size={20} color="#666" />
          </button>
          <button onClick={() => auth.signOut()} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            <LogOut size={20} color="#666" />
          </button>
        </div>
      </div>

      {/* Main Balance Card */}
      <div className="premium-card" style={{
        background: 'linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%)',
        border: '1px solid #222',
        textAlign: 'center',
        padding: '32px 24px'
      }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '8px' }}>Saldo total disponible</p>
        <h1 style={{ fontSize: '40px', fontWeight: '800', letterSpacing: '-1px' }}>S/ {balance.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</h1>
      </div>

      {/* Quick Summary Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div className="premium-card" style={{ background: '#101410', border: '1px solid rgba(74, 222, 128, 0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <TrendingUp size={16} color="var(--income-color)" />
            <p style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Ingresos</p>
          </div>
          <p style={{ fontSize: '20px', fontWeight: 'bold' }}>S/ {totals.income.toLocaleString()}</p>
        </div>
        <div className="premium-card" style={{ background: '#141010', border: '1px solid rgba(248, 113, 113, 0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <TrendingDown size={16} color="var(--expense-color)" />
            <p style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Egresos</p>
          </div>
          <p style={{ fontSize: '20px', fontWeight: 'bold' }}>S/ {totalExpenses.toLocaleString()}</p>
        </div>
      </div>

      {/* Recent Transactions */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold' }}>Actividad Reciente</h3>
          <button style={{ background: 'none', border: 'none', color: '#666', fontSize: '13px' }}>Ver más</button>
        </div>
        <RecentTransactions />
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowAddModal(true)}
        style={{
          position: 'fixed',
          bottom: '100px',
          right: '24px',
          width: '60px',
          height: '60px',
          borderRadius: '20px',
          background: '#ffffff',
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
          zIndex: 1000,
        }}
      >
        <Plus size={32} color="#000000" strokeWidth={3} />
      </button>

      {showAddModal && <AddExpenseModal onClose={() => setShowAddModal(false)} />}
    </div>
  );
};

export default Dashboard;
