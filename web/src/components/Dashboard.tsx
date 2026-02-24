import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, LogOut, Settings, ChevronLeft, ChevronRight, Landmark } from 'lucide-react';
import RecentTransactions from './RecentTransactions';
import CategoryBudget from './CategoryBudget';
import { auth, db } from '../lib/firebase';
import { collection, onSnapshot, query } from 'firebase/firestore';

interface DashboardProps {
  onOpenSettings?: () => void;
  currentDate: Date;
  changeMonth: (offset: number) => void;
  onNavigate: (view: string) => void;
  onAddFromCategory: (cat: string) => void;
}

interface TotalsState {
  income: number;
  expenses: number;
  recurringIncome: number;
  recurringExpenses: number;
  debtsPaid: number;
  cumulativeIncome: number;
  cumulativeExpenses: number;
  cumulativeIncomeRec: number;
  cumulativeExpensesRec: number;
  cumulativeDebts: number;
}

const Dashboard: React.FC<DashboardProps> = ({ onOpenSettings, currentDate, changeMonth, onNavigate, onAddFromCategory }) => {
  const now = new Date();
  const [data, setData] = useState<TotalsState>({
    income: 0, expenses: 0, recurringIncome: 0, recurringExpenses: 0, debtsPaid: 0,
    cumulativeIncome: 0, cumulativeExpenses: 0, cumulativeIncomeRec: 0, cumulativeExpensesRec: 0, cumulativeDebts: 0
  });
  const [debts, setDebts] = useState<any[]>([]);

  useEffect(() => {
    if (!auth.currentUser) return;

    const fiscalStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1, 0, 0, 0);
    const fiscalEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59);
    const isPastMonth = currentDate.getTime() < new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const isCurrentMonth = currentDate.getMonth() === now.getMonth() && currentDate.getFullYear() === now.getFullYear();
    const isFutureMonth = currentDate.getTime() > new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    const unsubExp = onSnapshot(query(collection(db, 'users', auth.currentUser.uid, 'gastos')), (snap) => {
      let monthly = 0, total = 0;
      snap.docs.forEach(doc => {
        const d = doc.data();
        const amt = Number(d.amount) || 0;
        const dt = d.date?.toDate();
        if (dt) {
          total += amt;
          if (dt >= fiscalStart && dt <= fiscalEnd) monthly += amt;
        }
      });
      setData(prev => ({ ...prev, expenses: monthly, cumulativeExpenses: total }));
    });

    const unsubInc = onSnapshot(query(collection(db, 'users', auth.currentUser.uid, 'ingresos')), (snap) => {
      let monthly = 0, total = 0;
      snap.docs.forEach(doc => {
        const d = doc.data();
        const amt = Number(d.amount) || 0;
        const dt = d.date?.toDate();
        if (dt) {
          total += amt;
          if (dt >= fiscalStart && dt <= fiscalEnd) monthly += amt;
        }
      });
      setData(prev => ({ ...prev, income: monthly, cumulativeIncome: total }));
    });

    const unsubRec = onSnapshot(query(collection(db, 'users', auth.currentUser.uid, 'gastos_recurrentes')), (snap) => {
      const mKey = `${currentDate.getFullYear()}-${currentDate.getMonth()}`;
      let monthly = 0, cumulative = 0;
      const curNow = new Date();
      snap.docs.forEach(doc => {
        const d = doc.data();
        const amt = Number(d.amount) || 0;
        const dt = d.date?.toDate();
        if (!dt || dt.getFullYear() < 2000) return;
        if (dt <= fiscalEnd) {
          const isPaid = (d.paidMonths?.includes(mKey)) || (d.autoDebit && !isFutureMonth && (isPastMonth || (isCurrentMonth && curNow.getDate() >= (d.recurringDay || 1))));
          if (isPaid) monthly += amt;
        }
        cumulative += (d.paidMonths?.length || 0) * amt;
        if (d.autoDebit) {
          let chk = new Date(dt.getFullYear(), dt.getMonth(), 1);
          const nowM = new Date(curNow.getFullYear(), curNow.getMonth(), 1);
          while (chk <= nowM) {
            if (!d.paidMonths?.includes(`${chk.getFullYear()}-${chk.getMonth()}`)) {
              if (chk < nowM || curNow.getDate() >= (d.recurringDay || 1)) cumulative += amt;
            }
            chk.setMonth(chk.getMonth() + 1); if (chk.getFullYear() > curNow.getFullYear() + 1) break;
          }
        }
      });
      setData(prev => ({ ...prev, recurringExpenses: monthly, cumulativeExpensesRec: cumulative }));
    });

    const unsubIncRec = onSnapshot(query(collection(db, 'users', auth.currentUser.uid, 'ingresos_recurrentes')), (snap) => {
      const mKey = `${currentDate.getFullYear()}-${currentDate.getMonth()}`;
      let monthly = 0, cumulative = 0;
      const curNow = new Date();
      snap.docs.forEach(doc => {
        const d = doc.data();
        const amt = Number(d.amount) || 0;
        const dt = d.date?.toDate();
        if (!dt || dt.getFullYear() < 2000) return;
        if (dt <= fiscalEnd) {
          const isRcv = (d.paidMonths?.includes(mKey)) || (d.autoDebit && !isFutureMonth && (isPastMonth || (isCurrentMonth && curNow.getDate() >= (d.recurringDay || 1))));
          if (isRcv) monthly += amt;
        }
        cumulative += (d.paidMonths?.length || 0) * amt;
        if (d.autoDebit) {
          let chk = new Date(dt.getFullYear(), dt.getMonth(), 1);
          const nowM = new Date(curNow.getFullYear(), curNow.getMonth(), 1);
          while (chk <= nowM) {
            if (!d.paidMonths?.includes(`${chk.getFullYear()}-${chk.getMonth()}`)) {
              if (chk < nowM || curNow.getDate() >= (d.recurringDay || 1)) cumulative += amt;
            }
            chk.setMonth(chk.getMonth() + 1); if (chk.getFullYear() > curNow.getFullYear() + 1) break;
          }
        }
      });
      setData(prev => ({ ...prev, recurringIncome: monthly, cumulativeIncomeRec: cumulative }));
    });

    const unsubDebt = onSnapshot(collection(db, 'users', auth.currentUser.uid, 'prestamos'), (snap) => {
      const all = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const curNow = new Date();
      const mKey = `${currentDate.getFullYear()}-${currentDate.getMonth()}`;
      setDebts(all.filter((d: any) => d.startDate && d.dueDate && d.startDate.toDate() <= fiscalEnd && d.dueDate.toDate() >= fiscalStart));

      const mon = all.filter((d: any) => (d.paidMonths?.includes(mKey)) || ((d.autoDebit || d.debtSubtype === 'insurance') && (isPastMonth || (isCurrentMonth && curNow.getDate() >= (d.recurringDay || 1))))).reduce((a, d: any) => a + (Number(d.amount) || 0), 0);
      const cum = all.reduce((acc, d: any) => {
        const amt = Number(d.amount) || 0;
        const sd = d.startDate?.toDate();
        if (!sd || sd.getFullYear() < 2000) return acc;
        let tot = (d.paidMonths?.length || 0) * amt;
        if (d.autoDebit || d.debtSubtype === 'insurance') {
          let chk = new Date(sd.getFullYear(), sd.getMonth(), 1), nowM = new Date(curNow.getFullYear(), curNow.getMonth(), 1);
          while (chk <= nowM) {
            if (!d.paidMonths?.includes(`${chk.getFullYear()}-${chk.getMonth()}`)) {
              if (chk < nowM || curNow.getDate() >= (d.recurringDay || 1)) tot += amt;
            }
            chk.setMonth(chk.getMonth() + 1); if (chk.getFullYear() > curNow.getFullYear() + 1) break;
          }
        }
        return acc + tot;
      }, 0);
      setData(prev => ({ ...prev, debtsPaid: mon, cumulativeDebts: cum }));
    });

    return () => { unsubExp(); unsubInc(); unsubRec(); unsubIncRec(); unsubDebt(); };
  }, [currentDate]);

  const totalIncome = data.income + data.recurringIncome;
  const totalExpenses = data.expenses + data.recurringExpenses + data.debtsPaid;
  const monthlyBalance = totalIncome - totalExpenses;

  const totalRemainingDebt = debts
    .filter(d => d.debtSubtype === 'loan')
    .reduce((acc, d) => acc + (parseFloat(d.remainingAmount) || 0), 0);

  const monthYearLabel = currentDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' });

  const fiscalStartLabel = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const fiscalEndLabel = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  const rangeLabel = `${fiscalStartLabel.getDate()} ${fiscalStartLabel.toLocaleString('es-ES', { month: 'short' })} - ${fiscalEndLabel.getDate()} ${fiscalEndLabel.toLocaleString('es-ES', { month: 'short' })}`;

  return (
    <div className="dashboard-container" style={{ padding: '24px 20px 150px 20px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Branding & Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '900', letterSpacing: '-1px' }}>FLUX</h1>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <button onClick={onOpenSettings} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            <Settings size={20} color="#666" />
          </button>
          <button onClick={() => auth.signOut()} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            <LogOut size={20} color="#666" />
          </button>
        </div>
      </div>

      {/* Profile Info */}
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
      </div>

      {/* Month Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.03)', padding: '12px 16px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
        <button onClick={() => changeMonth(-1)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ChevronLeft size={20} />
        </button>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '14px', fontWeight: '800', textTransform: 'capitalize', color: '#fff' }}>{monthYearLabel}</p>
          <p style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>{rangeLabel}</p>
        </div>
        <button onClick={() => changeMonth(1)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Main Balance Card */}
      <div className="premium-card" style={{
        background: 'linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%)',
        border: '1px solid #222',
        textAlign: 'center',
        padding: '32px 24px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', background: 'rgba(129, 138, 248, 0.05)', borderRadius: '50%', filter: 'blur(40px)' }}></div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '8px', position: 'relative' }}>Saldo del mes</p>
        <h1 style={{ fontSize: '40px', fontWeight: '800', letterSpacing: '-1px', position: 'relative' }}>S/ {monthlyBalance.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</h1>
      </div>

      {/* Quick Summary Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div
          className="premium-card"
          onClick={() => onNavigate('income')}
          style={{ background: '#101410', border: '1px solid rgba(74, 222, 128, 0.05)', cursor: 'pointer' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <TrendingUp size={16} color="var(--income-color)" />
            <p style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Ingresos</p>
          </div>
          <p style={{ fontSize: '20px', fontWeight: 'bold' }}>S/ {totalIncome.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</p>
        </div>
        <div
          className="premium-card"
          onClick={() => onNavigate('recurring')}
          style={{ background: '#141010', border: '1px solid rgba(248, 113, 113, 0.05)', cursor: 'pointer' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <TrendingDown size={16} color="var(--expense-color)" />
            <p style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Egresos</p>
          </div>
          <p style={{ fontSize: '20px', fontWeight: 'bold' }}>S/ {totalExpenses.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '6px' }}>
            <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>Diarios: S/ {data.expenses.toLocaleString()}</p>
            <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>Fijos: S/ {data.recurringExpenses.toLocaleString()}</p>
            <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>Deudas: S/ {data.debtsPaid.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Category Budgets & Swipes */}
      <div style={{ margin: '8px 0' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px', padding: '0 4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          Categorías & Presupuestos
          <span style={{ fontSize: '10px', fontWeight: 'normal', color: '#666' }}>(Desliza ↑ editar, ↓ gastar)</span>
        </h3>
        <CategoryBudget currentDate={currentDate} onAddExpense={onAddFromCategory} />
      </div>

      {/* Debt Progress Card */}
      {debts.length > 0 && (
        <div className="premium-card" style={{ background: 'rgba(239, 68, 68, 0.03)', border: '1px solid rgba(239, 68, 68, 0.1)', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Landmark size={20} color="#ef4444" />
              <h3 style={{ fontSize: '15px', fontWeight: 'bold' }}>Deuda Total Restante</h3>
            </div>
            <p style={{ fontSize: '18px', fontWeight: '800', color: '#ef4444' }}>S/ {totalRemainingDebt.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {debts.map(debt => {
              const isInsurance = debt.debtSubtype === 'insurance';
              let percent = 0;
              let statusText = '';

              if (isInsurance) {
                const start = debt.startDate?.toDate();
                const end = debt.dueDate?.toDate();
                if (start && end) {
                  // Adjust end to the very end of that day
                  const adjustedEnd = new Date(end);
                  adjustedEnd.setHours(23, 59, 59, 999);

                  const totalTime = adjustedEnd.getTime() - start.getTime();
                  const elapsed = now.getTime() - start.getTime();
                  percent = Math.max(0, Math.min(100, (elapsed / totalTime) * 100));

                  // Use floor so it only hits 100% when truly finished
                  const displayPercent = Math.floor(percent);
                  statusText = `Vigencia: ${displayPercent}%`;
                }
              } else {
                const total = debt.totalLoanAmount || 0;
                const remaining = debt.remainingAmount || 0;
                const paid = Math.max(0, total - remaining);
                percent = total > 0 ? Math.min(100, (paid / total) * 100) : 0;
                statusText = `${debt.paidQuotas} cuotas pagadas`;
              }

              return (
                <div key={debt.id} style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '500' }}>{debt.description || debt.category}</span>
                    <span style={{ fontSize: '12px', color: '#666' }}>{statusText}</span>
                  </div>
                  <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${percent}%`, height: '100%', background: isInsurance ? '#4ade80' : '#ef4444', borderRadius: '3px', transition: 'width 1s ease-in-out' }} />
                  </div>
                  {!isInsurance && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                      <span style={{ fontSize: '10px', color: '#666' }}>S/ {debt.remainingAmount?.toLocaleString()} restante</span>
                      <span style={{ fontSize: '10px', color: '#666' }}>Total: S/ {debt.totalLoanAmount?.toLocaleString()}</span>
                    </div>
                  )}
                  {isInsurance && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                      <span style={{ fontSize: '10px', color: '#666' }}>Inició: {debt.startDate?.toDate().toLocaleDateString()}</span>
                      <span style={{ fontSize: '10px', color: '#666' }}>Fin: {debt.dueDate?.toDate().toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Transactions */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold' }}>Actividad Reciente</h3>
          <button
            onClick={() => onNavigate('recurring')}
            style={{ background: 'none', border: 'none', color: '#818cf8', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            Ver más
          </button>
        </div>
        <RecentTransactions onNavigate={onNavigate} />
      </div>

    </div>
  );
};

export default Dashboard;

