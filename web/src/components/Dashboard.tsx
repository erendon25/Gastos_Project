import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, LogOut, Settings, ChevronLeft, ChevronRight, Landmark } from 'lucide-react';
import RecentTransactions from './RecentTransactions';
import { auth, db } from '../lib/firebase';
import { collection, onSnapshot, query } from 'firebase/firestore';

interface DashboardProps {
  onOpenSettings?: () => void;
  currentDate: Date;
  changeMonth: (offset: number) => void;
  onNavigate: (view: string) => void;
}

interface Totals {
  income: number;
  expenses: number;
  recurring: number;
  debts: number;
  cumulativeIncome: number;
  cumulativeExpenses: number;
  cumulativeIncomeRecPaid: number;
  cumulativeRecurringPaid: number;
  cumulativeDebtsPaid: number;
}

const Dashboard: React.FC<DashboardProps> = ({ onOpenSettings, currentDate, changeMonth, onNavigate }) => {
  const now = new Date();
  const [totals, setTotals] = useState<Totals>({
    income: 0,
    expenses: 0,
    recurring: 0,
    debts: 0,
    cumulativeIncome: 0,
    cumulativeExpenses: 0,
    cumulativeIncomeRecPaid: 0,
    cumulativeRecurringPaid: 0,
    cumulativeDebtsPaid: 0
  });
  const [recurringIncomeMonthly, setRecurringIncomeMonthly] = useState(0);
  const [recurringExpensesMonthly, setRecurringExpensesMonthly] = useState(0);
  const [debtsMonthly, setDebtsMonthly] = useState(0);
  const [debts, setDebts] = useState<any[]>([]);

  useEffect(() => {
    if (!auth.currentUser) return;

    // Fiscal Month: From 25th of previous month to 24th of current month
    const fiscalStart = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 25, 0, 0, 0);
    const fiscalEnd = new Date(currentDate.getFullYear(), currentDate.getMonth(), 24, 23, 59, 59);

    const isCurrentMonth = currentDate.getMonth() === now.getMonth() && currentDate.getFullYear() === now.getFullYear();
    const isPastMonth = currentDate.getTime() < new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const isFutureMonth = currentDate.getTime() > new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    // Unified Expenses (Regular)
    const qExp = query(collection(db, 'users', auth.currentUser.uid, 'gastos'));
    const unsubExp = onSnapshot(qExp, (snap) => {
      let monthly = 0;
      let total = 0;
      snap.docs.forEach(doc => {
        const data = doc.data();
        const amt = data.amount || 0;
        const d = data.date?.toDate();
        if (d && d <= now) {
          total += amt;
        }
        if (d && d >= fiscalStart && d <= fiscalEnd) {
          monthly += amt;
        }
      });
      setTotals(prev => ({ ...prev, expenses: monthly, cumulativeExpenses: total }));
    });

    // Unified Income (Regular)
    const qInc = query(collection(db, 'users', auth.currentUser.uid, 'ingresos'));
    const unsubInc = onSnapshot(qInc, (snap) => {
      let monthly = 0;
      let total = 0;
      snap.docs.forEach(doc => {
        const data = doc.data();
        const amt = data.amount || 0;
        const d = data.date?.toDate();
        if (d && d <= now) {
          total += amt;
        }
        if (d && d >= fiscalStart && d <= fiscalEnd) {
          monthly += amt;
        }
      });
      setTotals(prev => ({ ...prev, income: monthly, cumulativeIncome: total }));
    });

    // Expenses Recurring
    const qRec = query(collection(db, 'users', auth.currentUser.uid, 'gastos_recurrentes'));
    const unsubRec = onSnapshot(qRec, (snap) => {
      const monthKey = `${currentDate.getFullYear()}-${currentDate.getMonth()}`;
      let monthlyRecurringExpenses = 0;
      let cumulative = 0;

      snap.docs.forEach(doc => {
        const data = doc.data();
        const amt = data.amount || 0;
        const d = data.date?.toDate();
        if (!d) return;
        // Skip invalid historical dates (safeguard against typos like year 205)
        if (d.getFullYear() < 2000) return;

        // 1. Monthly (Budget/View for the SELECTED month)
        if (d <= fiscalEnd) {
          const isManualPaid = data.paidMonths && data.paidMonths.includes(monthKey);
          let isAutoPaid = false;
          if (data.autoDebit && !isFutureMonth) {
            if (isPastMonth) isAutoPaid = true;
            else if (isCurrentMonth) isAutoPaid = now.getDate() >= (data.recurringDay || 1);
          }
          if (isManualPaid || isAutoPaid) {
            monthlyRecurringExpenses += amt;
          }
        }

        // 2. Cumulative (Wallet Balance - Total spent up to TODAY)
        // A) Manual checks (always count)
        cumulative += (data.paidMonths?.length || 0) * amt;

        // B) Auto-debits (count months that passed and aren't manually checked)
        if (data.autoDebit) {
          let checkDate = new Date(d.getFullYear(), d.getMonth(), 1);
          const nowMonth = new Date(now.getFullYear(), now.getMonth(), 1);

          while (checkDate <= nowMonth) {
            const mKey = `${checkDate.getFullYear()}-${checkDate.getMonth()}`;
            const isManuallyCovered = data.paidMonths && data.paidMonths.includes(mKey);

            if (!isManuallyCovered) {
              if (checkDate < nowMonth) {
                cumulative += amt;
              } else if (now.getDate() >= (data.recurringDay || 1)) {
                // Today is the pay day or later
                cumulative += amt;
              }
            }
            checkDate.setMonth(checkDate.getMonth() + 1);
            // Safety break
            if (checkDate.getFullYear() > now.getFullYear() + 1) break;
          }
        }
      });
      setRecurringExpensesMonthly(monthlyRecurringExpenses);
      setTotals(prev => ({ ...prev, cumulativeRecurringPaid: cumulative }));
    });

    // Income Recurring
    const qIncRec = query(collection(db, 'users', auth.currentUser.uid, 'ingresos_recurrentes'));
    const unsubIncRec = onSnapshot(qIncRec, (snap) => {
      const monthKey = `${currentDate.getFullYear()}-${currentDate.getMonth()}`;
      let monthlyRecurringIncome = 0;
      let cumulative = 0;

      snap.docs.forEach(doc => {
        const data = doc.data();
        const amt = data.amount || 0;
        const d = data.date?.toDate();
        if (!d || d.getFullYear() < 2000) return;

        if (d <= fiscalEnd) {
          // Monthly calculation
          const isManualReceived = data.paidMonths && data.paidMonths.includes(monthKey);
          let isAutoReceived = false;
          if (data.autoDebit && !isFutureMonth) {
            if (isPastMonth) isAutoReceived = true;
            else if (isCurrentMonth) isAutoReceived = now.getDate() >= (data.recurringDay || 1);
          }
          if (isManualReceived || isAutoReceived) monthlyRecurringIncome += amt;
        }

        // Cumulative Income (Wallet)
        cumulative += (data.paidMonths?.length || 0) * amt;
        if (data.autoDebit) {
          let checkDate = new Date(d.getFullYear(), d.getMonth(), 1);
          const nowMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          while (checkDate <= nowMonth) {
            const mKey = `${checkDate.getFullYear()}-${checkDate.getMonth()}`;
            if ((!data.paidMonths || !data.paidMonths.includes(mKey))) {
              if (checkDate < nowMonth) cumulative += amt;
              else if (now.getDate() >= (data.recurringDay || 1)) cumulative += amt;
            }
            checkDate.setMonth(checkDate.getMonth() + 1);
            if (checkDate.getFullYear() > now.getFullYear() + 1) break;
          }
        }
      });
      setRecurringIncomeMonthly(monthlyRecurringIncome);
      setTotals(prev => ({ ...prev, cumulativeIncomeRecPaid: cumulative }));
    });

    // Detailed Debt Progress (Loans + Insurances)
    const unsubDebt = onSnapshot(collection(db, 'users', auth.currentUser.uid, 'prestamos'), (snap) => {
      const allDocs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const activeDocs = allDocs.filter((d: any) => {
        if (!d.startDate || !d.dueDate) return true;
        const s = d.startDate.toDate();
        const e = d.dueDate.toDate();
        return s <= fiscalEnd && e >= fiscalStart;
      });
      setDebts(activeDocs);

      const monthKey = `${currentDate.getFullYear()}-${currentDate.getMonth()}`;
      const debtExp = activeDocs
        .filter((d: any) => {
          // Count in balance only if paid or auto-debit (with date check)
          let isAutoPaid = false;
          if (d.autoDebit || d.debtSubtype === 'insurance') {
            if (isPastMonth) isAutoPaid = true;
            else if (isCurrentMonth) isAutoPaid = now.getDate() >= (d.recurringDay || 1);
          }
          const isManualPaid = d.paidMonths && d.paidMonths.includes(monthKey);
          return isAutoPaid || isManualPaid;
        })
        .reduce((acc, d: any) => acc + (d.amount || 0), 0);
      setDebtsMonthly(debtExp);

      // Total cumulative debt paid: manual checks + auto-debits across all time
      const cumulativePaid = allDocs.reduce((acc, d: any) => {
        const amt = d.amount || 0;
        const startDate = d.startDate?.toDate();
        if (!startDate || startDate.getFullYear() < 2000) return acc;

        const manualTotal = (d.paidMonths?.length || 0) * amt;

        let autoTotal = 0;
        if (d.autoDebit || d.debtSubtype === 'insurance') {
          let checkDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
          const nowMonth = new Date(now.getFullYear(), now.getMonth(), 1);

          while (checkDate <= nowMonth) {
            const mKey = `${checkDate.getFullYear()}-${checkDate.getMonth()}`;
            const isManuallyCovered = d.paidMonths && d.paidMonths.includes(mKey);

            if (!isManuallyCovered) {
              if (checkDate < nowMonth) {
                autoTotal += amt;
              } else if (now.getDate() >= (d.recurringDay || 1)) {
                autoTotal += amt;
              }
            }
            checkDate.setMonth(checkDate.getMonth() + 1);
            if (checkDate.getFullYear() > now.getFullYear() + 1) break;
          }
        }

        return acc + manualTotal + autoTotal;
      }, 0);
      setTotals(prev => ({ ...prev, cumulativeDebtsPaid: cumulativePaid }));
    });

    return () => { unsubExp(); unsubInc(); unsubRec(); unsubDebt(); unsubIncRec(); };
  }, [currentDate]);

  const totalIncome = totals.income + recurringIncomeMonthly;
  const totalExpenses = totals.expenses + recurringExpensesMonthly + debtsMonthly;

  // Real Wallet Balance: Everything Earned - Everything Spent
  const balance = (totals.cumulativeIncome + totals.cumulativeIncomeRecPaid)
    - (totals.cumulativeExpenses + totals.cumulativeRecurringPaid + totals.cumulativeDebtsPaid);

  const totalRemainingDebt = debts
    .filter(d => d.debtSubtype === 'loan')
    .reduce((acc, d) => acc + (parseFloat(d.remainingAmount) || 0), 0);

  const monthYearLabel = currentDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' });

  const fiscalStart = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 25);
  const fiscalEnd = new Date(currentDate.getFullYear(), currentDate.getMonth(), 24);
  const rangeLabel = `${fiscalStart.getDate()} ${fiscalStart.toLocaleString('es-ES', { month: 'short' })} - ${fiscalEnd.getDate()} ${fiscalEnd.toLocaleString('es-ES', { month: 'short' })}`;

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
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '8px', position: 'relative' }}>Saldo total disponible</p>
        <h1 style={{ fontSize: '40px', fontWeight: '800', letterSpacing: '-1px', position: 'relative' }}>S/ {balance.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</h1>
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
          <p style={{ fontSize: '20px', fontWeight: 'bold' }}>S/ {totalIncome.toLocaleString()}</p>
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
          <p style={{ fontSize: '20px', fontWeight: 'bold' }}>S/ {totalExpenses.toLocaleString()}</p>
          <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>Fijos: S/ {recurringExpensesMonthly.toLocaleString()}</p>
        </div>
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

