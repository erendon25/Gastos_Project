import React, { useState, useEffect, useRef } from 'react';
import { TrendingUp, TrendingDown, LogOut, Settings, ChevronLeft, ChevronRight, Landmark, X, PiggyBank, Pencil, Check } from 'lucide-react';
import RecentTransactions from './RecentTransactions';
import CategoryBudget from './CategoryBudget';
import { auth, db } from '../lib/firebase';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { isSubscriptionItem } from '../lib/subscriptionUtils';

interface DashboardProps {
  onOpenSettings?: () => void;
  currentDate: Date;
  changeMonth: (offset: number) => void;
  onNavigate: (view: string) => void;
  onAddFromCategory: (cat: string) => void;
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

const Dashboard: React.FC<DashboardProps> = ({ onOpenSettings, currentDate, changeMonth, onNavigate, onAddFromCategory }) => {
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
  const [subscriptionsMonthly, setSubscriptionsMonthly] = useState(0);
  const [debtsMonthly, setDebtsMonthly] = useState(0);
  const [debts, setDebts] = useState<any[]>([]);

  const [expensesByCategory, setExpensesByCategory] = useState<Record<string, number>>({});
  const [incomeByCategory, setIncomeByCategory] = useState<Record<string, number>>({});

  const [recurringExpensesList, setRecurringExpensesList] = useState<{ name: string, amt: number }[]>([]);
  const [subscriptionsList, setSubscriptionsList] = useState<{ name: string, amt: number }[]>([]);
  const [recurringIncomeList, setRecurringIncomeList] = useState<{ name: string, amt: number }[]>([]);
  const [debtsList, setDebtsList] = useState<{ name: string, amt: number }[]>([]);

  const [breakdownType, setBreakdownType] = useState<'income' | 'expense' | 'balance' | null>(null);

  // Savings state
  const savingsKey = `savings_goal_${auth.currentUser?.uid}`;
  const [savingsGoal, setSavingsGoal] = useState<number>(() => {
    const stored = localStorage.getItem(savingsKey);
    return stored ? parseFloat(stored) : 0;
  });
  const [editingSavings, setEditingSavings] = useState(false);
  const [savingsInput, setSavingsInput] = useState('');

  const handleSaveSavings = () => {
    const val = parseFloat(savingsInput);
    if (!isNaN(val) && val >= 0) {
      setSavingsGoal(val);
      localStorage.setItem(savingsKey, String(val));
    }
    setEditingSavings(false);
    setSavingsInput('');
  };

  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPress = useRef(false);

  const handlePressStart = (type: 'income' | 'expense') => {
    isLongPress.current = false;
    pressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      setBreakdownType(type);
    }, 400); // 400ms for long press
  };

  const handlePressEnd = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
  };

  const handleClickNav = (view: string, e: React.MouseEvent) => {
    if (isLongPress.current) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    onNavigate(view);
  };

  useEffect(() => {
    if (!auth.currentUser) return;

    // Fiscal Month: From 25th of previous month to 24th of current month
    const fiscalStart = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 25, 0, 0, 0);
    const fiscalEnd = new Date(currentDate.getFullYear(), currentDate.getMonth(), 24, 23, 59, 59);

    // Unified Expenses (Regular)
    const qExp = query(collection(db, 'users', auth.currentUser.uid, 'gastos'));
    const unsubExp = onSnapshot(qExp, (snap) => {
      let monthly = 0;
      const catData: Record<string, number> = {};
      snap.docs.forEach(doc => {
        const data = doc.data();
        const amt = data.amount || 0;
        const d = data.date?.toDate();
        if (d && d >= fiscalStart && d <= fiscalEnd) {
          monthly += amt;
          const cat = data.category || 'Otros';
          catData[cat] = (catData[cat] || 0) + amt;
        }
      });
      setTotals(prev => ({ ...prev, expenses: monthly, cumulativeExpenses: monthly }));
      setExpensesByCategory(catData);
    });

    // Unified Income (Regular)
    const qInc = query(collection(db, 'users', auth.currentUser.uid, 'ingresos'));
    const unsubInc = onSnapshot(qInc, (snap) => {
      let monthly = 0;
      const catData: Record<string, number> = {};
      snap.docs.forEach(doc => {
        const data = doc.data();
        const amt = data.amount || 0;
        const d = data.date?.toDate();
        if (d && d >= fiscalStart && d <= fiscalEnd) {
          monthly += amt;
          const cat = data.category || 'Otros';
          catData[cat] = (catData[cat] || 0) + amt;
        }
      });
      setTotals(prev => ({ ...prev, income: monthly, cumulativeIncome: monthly }));
      setIncomeByCategory(catData);
    });

    const qRec = query(collection(db, 'users', auth.currentUser.uid, 'gastos_recurrentes'));
    const unsubRec = onSnapshot(qRec, (snap) => {
      const monthKey = `${currentDate.getFullYear()}-${currentDate.getMonth()}`;
      let monthlyRecurringExpenses = 0;
      let monthlySubscriptions = 0;
      const recList: { name: string, amt: number }[] = [];
      const subList: { name: string, amt: number }[] = [];

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
          if (data.autoDebit) {
            const rd = data.recurringDay || 1;
            const chargeYear = rd >= 25 ? (currentDate.getMonth() === 0 ? currentDate.getFullYear() - 1 : currentDate.getFullYear()) : currentDate.getFullYear();
            const chargeMonth = rd >= 25 ? (currentDate.getMonth() === 0 ? 11 : currentDate.getMonth() - 1) : currentDate.getMonth();
            const chargeDate = new Date(chargeYear, chargeMonth, rd);
            if (now.getTime() >= chargeDate.getTime()) isAutoPaid = true;
          }
          if (isManualPaid || isAutoPaid) {
            if (isSubscriptionItem(data)) {
              monthlySubscriptions += amt;
              subList.push({ name: data.description || data.category || 'Suscripción', amt });
            } else {
              monthlyRecurringExpenses += amt;
              recList.push({ name: data.description || data.category || 'Fijo', amt });
            }
          }
        }
      });
      setRecurringExpensesMonthly(monthlyRecurringExpenses);
      setSubscriptionsMonthly(monthlySubscriptions);
      setTotals(prev => ({ ...prev, cumulativeRecurringPaid: monthlyRecurringExpenses + monthlySubscriptions }));
      setRecurringExpensesList(recList);
      setSubscriptionsList(subList);
    });

    const qIncRec = query(collection(db, 'users', auth.currentUser.uid, 'ingresos_recurrentes'));
    const unsubIncRec = onSnapshot(qIncRec, (snap) => {
      const monthKey = `${currentDate.getFullYear()}-${currentDate.getMonth()}`;
      let monthlyRecurringIncome = 0;
      const incList: { name: string, amt: number }[] = [];

      snap.docs.forEach(doc => {
        const data = doc.data();
        const amt = data.amount || 0;
        const d = data.date?.toDate();
        if (!d || d.getFullYear() < 2000) return;

        if (d <= fiscalEnd) {
          // Monthly calculation
          const isManualReceived = data.paidMonths && data.paidMonths.includes(monthKey);
          let isAutoReceived = false;
          if (data.autoDebit) {
            const rd = data.recurringDay || 1;
            const chargeYear = rd >= 25 ? (currentDate.getMonth() === 0 ? currentDate.getFullYear() - 1 : currentDate.getFullYear()) : currentDate.getFullYear();
            const chargeMonth = rd >= 25 ? (currentDate.getMonth() === 0 ? 11 : currentDate.getMonth() - 1) : currentDate.getMonth();
            const chargeDate = new Date(chargeYear, chargeMonth, rd);
            if (now.getTime() >= chargeDate.getTime()) isAutoReceived = true;
          }
          if (isManualReceived || isAutoReceived) {
            monthlyRecurringIncome += amt;
            incList.push({ name: data.description || data.category || 'Fijo', amt });
          }
        }
      });
      setRecurringIncomeMonthly(monthlyRecurringIncome);
      setTotals(prev => ({ ...prev, cumulativeIncomeRecPaid: monthlyRecurringIncome }));
      setRecurringIncomeList(incList);
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
      const activeDebtsList: { name: string, amt: number }[] = [];

      const debtExp = activeDocs
        .filter((d: any) => {
          // Count in balance only if paid or auto-debit (with date check)
          let isAutoPaid = false;
          if (d.autoDebit || d.debtSubtype === 'insurance') {
            const rd = d.recurringDay || 1;
            const chargeYear = rd >= 25 ? (currentDate.getMonth() === 0 ? currentDate.getFullYear() - 1 : currentDate.getFullYear()) : currentDate.getFullYear();
            const chargeMonth = rd >= 25 ? (currentDate.getMonth() === 0 ? 11 : currentDate.getMonth() - 1) : currentDate.getMonth();
            const chargeDate = new Date(chargeYear, chargeMonth, rd);
            if (now.getTime() >= chargeDate.getTime()) isAutoPaid = true;
          }
          const isManualPaid = d.paidMonths && d.paidMonths.includes(monthKey);

          const willCount = isAutoPaid || isManualPaid;
          if (willCount) {
            activeDebtsList.push({ name: d.description || d.category || 'Deuda', amt: d.amount || 0 });
          }
          return willCount;
        })
        .reduce((acc, d: any) => acc + (d.amount || 0), 0);
      setDebtsMonthly(debtExp);
      setDebtsList(activeDebtsList);

      setTotals(prev => ({ ...prev, cumulativeDebtsPaid: debtExp }));
    });

    return () => { unsubExp(); unsubInc(); unsubRec(); unsubDebt(); unsubIncRec(); };
  }, [currentDate]);

  const totalIncome = totals.income + recurringIncomeMonthly;
  const totalExpenses = totals.expenses + recurringExpensesMonthly + subscriptionsMonthly + debtsMonthly;

  // Real Wallet Balance: Everything Earned - Everything Spent
  const balance = (totals.cumulativeIncome + totals.cumulativeIncomeRecPaid)
    - (totals.cumulativeExpenses + totals.cumulativeRecurringPaid + totals.cumulativeDebtsPaid);

  const totalRemainingDebt = debts
    .filter(d => d.debtSubtype === 'loan')
    .reduce((acc, d) => acc + (parseFloat(d.remainingAmount) || 0), 0);

  const monthYearLabel = currentDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' });

  const renderFiscalStart = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 25);
  const renderFiscalEnd = new Date(currentDate.getFullYear(), currentDate.getMonth(), 24);
  const rangeLabel = `${renderFiscalStart.getDate()} ${renderFiscalStart.toLocaleString('es-ES', { month: 'short' })} - ${renderFiscalEnd.getDate()} ${renderFiscalEnd.toLocaleString('es-ES', { month: 'short' })}`;

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
      <div className="premium-card"
        onClick={() => setBreakdownType('balance')}
        style={{
          background: 'linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%)',
          border: '1px solid #222',
          textAlign: 'center',
          padding: '32px 24px',
          position: 'relative',
          overflow: 'hidden',
          cursor: 'pointer'
        }}>
        <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', background: 'rgba(129, 138, 248, 0.05)', borderRadius: '50%', filter: 'blur(40px)' }}></div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '8px', position: 'relative' }}>Saldo total disponible <span style={{ fontSize: 10, opacity: 0.5 }}>(Ver detalle)</span></p>
        <h1 style={{ fontSize: '40px', fontWeight: '800', letterSpacing: '-1px', position: 'relative' }}>S/ {balance.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</h1>
      </div>

      {/* Quick Summary Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div
          className="premium-card"
          onClick={(e) => handleClickNav('income', e)}
          onPointerDown={() => handlePressStart('income')}
          onPointerUp={handlePressEnd}
          onPointerLeave={handlePressEnd}
          style={{ background: '#101410', border: '1px solid rgba(74, 222, 128, 0.05)', cursor: 'pointer', userSelect: 'none', WebkitUserSelect: 'none' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <TrendingUp size={16} color="var(--income-color)" />
            <p style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Ingresos</p>
          </div>
          <p style={{ fontSize: '20px', fontWeight: 'bold' }}>S/ {totalIncome.toLocaleString()}</p>
          <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>Mantener para ver</p>
        </div>
        <div
          className="premium-card"
          onClick={(e) => handleClickNav('recurring', e)}
          onPointerDown={() => handlePressStart('expense')}
          onPointerUp={handlePressEnd}
          onPointerLeave={handlePressEnd}
          style={{ background: '#141010', border: '1px solid rgba(248, 113, 113, 0.05)', cursor: 'pointer', userSelect: 'none', WebkitUserSelect: 'none' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <TrendingDown size={16} color="var(--expense-color)" />
            <p style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Egresos</p>
          </div>
          <p style={{ fontSize: '20px', fontWeight: 'bold' }}>S/ {totalExpenses.toLocaleString()}</p>
          <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>Fijos: S/ {recurringExpensesMonthly.toLocaleString()}</p>
        </div>
      </div>

      {/* Savings Card */}
      {(() => {
        const savingsProgress = savingsGoal > 0 ? Math.min(100, (balance / savingsGoal) * 100) : 0;
        const savingsColor = savingsProgress >= 100 ? '#4ade80' : savingsProgress >= 60 ? '#facc15' : '#f87171';
        return (
          <div className="premium-card" style={{ background: 'linear-gradient(135deg, #0d1a10 0%, #0a0a0a 100%)', border: '1px solid rgba(74, 222, 128, 0.12)', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <PiggyBank size={18} color="#4ade80" />
                <span style={{ fontSize: '14px', fontWeight: '700', color: '#fff' }}>Meta de Ahorro</span>
              </div>
              {!editingSavings ? (
                <button
                  onClick={() => { setSavingsInput(savingsGoal > 0 ? String(savingsGoal) : ''); setEditingSavings(true); }}
                  style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '8px', padding: '6px 10px', color: '#888', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}
                >
                  <Pencil size={12} /> Editar
                </button>
              ) : (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.07)', borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <span style={{ paddingLeft: '10px', color: '#888', fontSize: '13px' }}>S/</span>
                    <input
                      autoFocus
                      type="number"
                      inputMode="decimal"
                      value={savingsInput}
                      onChange={e => setSavingsInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSaveSavings()}
                      style={{ background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: '16px', padding: '8px 10px', width: '110px' }}
                      placeholder="0.00"
                    />
                  </div>
                  <button
                    onClick={handleSaveSavings}
                    style={{ background: '#4ade80', border: 'none', borderRadius: '8px', padding: '8px 12px', color: '#000', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: '700' }}
                  >
                    <Check size={14} /> OK
                  </button>
                </div>
              )}
            </div>

            {savingsGoal > 0 ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', color: '#666' }}>Balance actual</span>
                  <span style={{ fontSize: '12px', color: savingsColor, fontWeight: '700' }}>S/ {balance.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</span>
                </div>
                <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden', marginBottom: '8px' }}>
                  <div style={{ width: `${savingsProgress}%`, height: '100%', background: `linear-gradient(90deg, ${savingsColor}cc, ${savingsColor})`, borderRadius: '4px', transition: 'width 0.8s ease' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '11px', color: '#555' }}>Meta: S/ {savingsGoal.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</span>
                  <span style={{ fontSize: '11px', color: savingsColor, fontWeight: '600' }}>{savingsProgress.toFixed(0)}% logrado</span>
                </div>
              </>
            ) : (
              <p style={{ fontSize: '13px', color: '#555', textAlign: 'center', padding: '8px 0' }}>Toca "Editar" para definir tu meta de ahorro mensual</p>
            )}
          </div>
        );
      })()}

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

      {/* Breakdown Modal */}
      <AnimatePresence>
        {breakdownType && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 3000, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', pointerEvents: 'auto' }}>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)' }}
              onClick={() => setBreakdownType(null)}
            />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              style={{ padding: '24px', background: '#111', borderTopLeftRadius: '24px', borderTopRightRadius: '24px', position: 'relative', zIndex: 1 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 'bold' }}>
                  {breakdownType === 'balance' ? 'Detalle del Saldo Total' : `Desglose de ${breakdownType === 'income' ? 'Ingresos' : 'Egresos'}`}
                </h2>
                <button onClick={() => setBreakdownType(null)} style={{ background: '#222', border: 'none', color: '#fff', padding: '8px', borderRadius: '50%', cursor: 'pointer' }}>
                  <X size={20} />
                </button>
              </div>

              {breakdownType === 'balance' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '60vh', overflowY: 'auto' }}>
                  <p style={{ fontSize: '12px', color: '#888', marginBottom: '8px', lineHeight: '1.4' }}>
                    El saldo es el resultado de la formula: **Total Ingresos en este mes - Total Egresos en este mes**. Este balance es sólo de tu mes actual, no considera meses anteriores.
                  </p>
                  <h3 style={{ fontSize: '14px', color: '#666', marginBottom: '4px' }}>Ingresos del Mes (+)</h3>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'rgba(74, 222, 128, 0.1)', borderRadius: '12px', color: '#4ade80' }}>
                    <span>Ingresos Variables</span>
                    <span style={{ fontWeight: 'bold' }}>S/ {totals.cumulativeIncome.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'rgba(74, 222, 128, 0.1)', borderRadius: '12px', color: '#4ade80' }}>
                    <span>Ingresos Fijos Efectuados</span>
                    <span style={{ fontWeight: 'bold' }}>S/ {totals.cumulativeIncomeRecPaid.toLocaleString()}</span>
                  </div>

                  <h3 style={{ fontSize: '14px', color: '#666', marginTop: '8px', marginBottom: '4px' }}>Egresos del Mes (-)</h3>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'rgba(248, 113, 113, 0.1)', borderRadius: '12px', color: '#f87171' }}>
                    <span>Gastos Diarios Individuales</span>
                    <span style={{ fontWeight: 'bold' }}>S/ {totals.cumulativeExpenses.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'rgba(248, 113, 113, 0.1)', borderRadius: '12px', color: '#f87171' }}>
                    <span>Gastos Fijos Efectuados</span>
                    <span style={{ fontWeight: 'bold' }}>S/ {recurringExpensesMonthly.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'rgba(248, 113, 113, 0.1)', borderRadius: '12px', color: '#f87171' }}>
                    <span>Suscripciones Pagadas</span>
                    <span style={{ fontWeight: 'bold' }}>S/ {subscriptionsMonthly.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '12px', color: '#ef4444' }}>
                    <span>Deudas/Seguros Pagados</span>
                    <span style={{ fontWeight: 'bold' }}>S/ {totals.cumulativeDebtsPaid.toLocaleString()}</span>
                  </div>
                </div>
              ) : breakdownType === 'income' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '60vh', overflowY: 'auto' }}>
                  {recurringIncomeList.length > 0 && <h3 style={{ fontSize: '14px', color: '#666', marginBottom: '4px' }}>Ingresos Fijos</h3>}
                  {recurringIncomeList.map((inc, i) => (
                    <div key={`inc-rec-${i}`} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'rgba(74, 222, 128, 0.1)', borderRadius: '12px', color: '#4ade80' }}>
                      <span>{inc.name}</span>
                      <span style={{ fontWeight: 'bold' }}>S/ {inc.amt.toLocaleString()}</span>
                    </div>
                  ))}

                  {Object.keys(incomeByCategory).length > 0 && <h3 style={{ fontSize: '14px', color: '#666', marginTop: '8px', marginBottom: '4px' }}>Por Categoría (Variables)</h3>}
                  {Object.entries(incomeByCategory).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => (
                    <div key={`inc-cat-${cat}`} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
                      <span>{cat}</span>
                      <span style={{ fontWeight: 'bold' }}>S/ {amt.toLocaleString()}</span>
                    </div>
                  ))}
                  {Object.keys(incomeByCategory).length === 0 && recurringIncomeList.length === 0 && (
                    <p style={{ color: '#666', fontSize: '14px', textAlign: 'center', padding: '20px 0' }}>No hay ingresos registrados en este periodo.</p>
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '60vh', overflowY: 'auto' }}>
                  {recurringExpensesList.length > 0 && <h3 style={{ fontSize: '14px', color: '#666', marginBottom: '4px' }}>Gastos Fijos (Alquiler, Servicios, etc)</h3>}
                  {recurringExpensesList.map((rec, i) => (
                    <div key={`exp-rec-${i}`} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'rgba(248, 113, 113, 0.1)', borderRadius: '12px', color: '#f87171' }}>
                      <span>{rec.name}</span>
                      <span style={{ fontWeight: 'bold' }}>S/ {rec.amt.toLocaleString()}</span>
                    </div>
                  ))}

                  {subscriptionsList.length > 0 && <h3 style={{ fontSize: '14px', color: '#666', marginBottom: '4px' }}>Suscripciones</h3>}
                  {subscriptionsList.map((sub, i) => (
                    <div key={`exp-sub-${i}`} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'rgba(248, 113, 113, 0.1)', borderRadius: '12px', color: '#f87171' }}>
                      <span>{sub.name}</span>
                      <span style={{ fontWeight: 'bold' }}>S/ {sub.amt.toLocaleString()}</span>
                    </div>
                  ))}

                  {debtsList.length > 0 && <h3 style={{ fontSize: '14px', color: '#666', marginTop: '8px', marginBottom: '4px' }}>Deudas y Seguros</h3>}
                  {debtsList.map((debt, i) => (
                    <div key={`debt-${i}`} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '12px', color: '#ef4444' }}>
                      <span>{debt.name}</span>
                      <span style={{ fontWeight: 'bold' }}>S/ {debt.amt.toLocaleString()}</span>
                    </div>
                  ))}

                  {Object.keys(expensesByCategory).length > 0 && <h3 style={{ fontSize: '14px', color: '#666', marginTop: '8px', marginBottom: '4px' }}>Gastos Diarios por Categoría</h3>}
                  {Object.entries(expensesByCategory).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => (
                    <div key={`exp-cat-${cat}`} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
                      <span>{cat}</span>
                      <span style={{ fontWeight: 'bold' }}>S/ {amt.toLocaleString()}</span>
                    </div>
                  ))}

                  {Object.keys(expensesByCategory).length === 0 && recurringExpensesList.length === 0 && debtsList.length === 0 && (
                    <p style={{ color: '#666', fontSize: '14px', textAlign: 'center', padding: '20px 0' }}>No hay gastos registrados en este periodo.</p>
                  )}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default Dashboard;

