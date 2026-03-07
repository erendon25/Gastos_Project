import React, { useState, useEffect, useRef } from 'react';
import { TrendingUp, TrendingDown, LogOut, Settings, ChevronLeft, ChevronRight, X, PiggyBank, Zap, Download } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis } from 'recharts';
import RecentTransactions from './RecentTransactions';
import CategoryBudget from './CategoryBudget';
import MonthProjection from './MonthProjection';
import { auth, db } from '../lib/firebase';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { isSubscriptionItem } from '../lib/subscriptionUtils';
import { usePremium } from '../lib/usePremium';
import { getFiscalRange } from '../lib/dateUtils';
import ProBanner from './ProBanner';

interface DashboardProps {
  onOpenSettings?: () => void;
  currentDate: Date;
  changeMonth: (offset: number) => void;
  onNavigate: (view: string) => void;
  onAddFromCategory: (cat: string) => void;
  user?: any;
  onUpgrade?: () => void;
  currency?: { code: string, symbol: string };
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

const Dashboard: React.FC<DashboardProps> = ({ onOpenSettings, currentDate, changeMonth, onNavigate, onAddFromCategory, user, onUpgrade, currency = { code: 'PEN', symbol: 'S/' } }) => {
  const now = new Date();
  usePremium();
  const [data, setData] = useState<TotalsState>({
    income: 0, expenses: 0, recurringIncome: 0, recurringExpenses: 0, debtsPaid: 0,
    cumulativeIncome: 0, cumulativeExpenses: 0, cumulativeIncomeRec: 0, cumulativeExpensesRec: 0, cumulativeDebts: 0
  });
  const [subscriptionsMonthly, setSubscriptionsMonthly] = useState(0);
  const [debts, setDebts] = useState<any[]>([]);

  const [expensesByCategory, setExpensesByCategory] = useState<Record<string, number>>({});
  const [expensesByHour, setExpensesByHour] = useState<Record<number, number>>({});
  const [incomeByCategory, setIncomeByCategory] = useState<Record<string, number>>({});
  const [analysisPage, setAnalysisPage] = useState(0);

  const [recurringExpensesList, setRecurringExpensesList] = useState<{ name: string, amt: number }[]>([]);
  const [subscriptionsList, setSubscriptionsList] = useState<{ name: string, amt: number }[]>([]);
  const [recurringIncomeList, setRecurringIncomeList] = useState<{ name: string, amt: number }[]>([]);
  const [debtsList, setDebtsList] = useState<{ name: string, amt: number }[]>([]);

  const [breakdownType, setBreakdownType] = useState<'income' | 'expense' | 'balance' | null>(null);

  // Savings goals - shared with Metas tab via savingsGoals collection
  const [savingsGoals, setSavingsGoals] = useState<{ id: string; name: string; icon: string; color: string; currentAmount: number; targetAmount: number }[]>([]);
  const [savingsGoalIndex, setSavingsGoalIndex] = useState(0);
  const [wallets, setWallets] = useState<any[]>([]);

  // Load savings goals from Firestore (same collection as Metas tab)
  // Load data from Firestore
  useEffect(() => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;
    const unsubSavings = onSnapshot(collection(db, 'users', uid, 'savingsGoals'), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      setSavingsGoals(data.sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
    });
    const unsubWallets = onSnapshot(collection(db, 'users', uid, 'wallets'), (snap) => {
      setWallets(snap.docs.map(d => ({ id: d.id, ...d.data() } as any)));
    });
    return () => {
      unsubSavings();
      unsubWallets();
    };
  }, []);

  // keep savingsGoalIndex in bounds
  useEffect(() => {
    if (savingsGoalIndex >= savingsGoals.length && savingsGoals.length > 0) {
      setSavingsGoalIndex(savingsGoals.length - 1);
    }
  }, [savingsGoals.length]);

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
    const { start: fiscalStart, end: fiscalEnd } = getFiscalRange(currentDate);

    const isPastMonth = currentDate.getFullYear() < now.getFullYear() || (currentDate.getFullYear() === now.getFullYear() && currentDate.getMonth() < now.getMonth());
    const isCurrentMonth = currentDate.getFullYear() === now.getFullYear() && currentDate.getMonth() === now.getMonth();
    const isFutureMonth = currentDate.getFullYear() > now.getFullYear() || (currentDate.getFullYear() === now.getFullYear() && currentDate.getMonth() > now.getMonth());

    const unsubExp = onSnapshot(query(collection(db, 'users', auth.currentUser.uid, 'gastos')), (snap) => {
      let monthly = 0, total = 0;
      const catData: Record<string, number> = {};
      const hourData: Record<number, number> = {};

      snap.docs.forEach(doc => {
        const d = doc.data();
        const amt = Number(d.amount) || 0;

        // Use either date field or createdAt as fallback to ensure time exists
        const dt = d.date?.toDate() || d.createdAt?.toDate();

        if (dt) {
          total += amt;

          // History of hours across all records
          const hour = dt.getHours();
          hourData[hour] = (hourData[hour] || 0) + amt;

          if (dt >= fiscalStart && dt <= fiscalEnd) {
            monthly += amt;
            const cat = d.category || 'Otros';
            catData[cat] = (catData[cat] || 0) + amt;
          }
        }
      });

      setData(prev => ({ ...prev, expenses: monthly, cumulativeExpenses: total }));
      setExpensesByCategory(catData);
      setExpensesByHour(hourData);
    });

    const unsubInc = onSnapshot(query(collection(db, 'users', auth.currentUser.uid, 'ingresos')), (snap) => {
      let monthly = 0, total = 0;
      const catData: Record<string, number> = {};
      snap.docs.forEach(doc => {
        const d = doc.data();
        const amt = Number(d.amount) || 0;
        const dt = d.date?.toDate();
        if (dt) {
          total += amt;
          if (dt >= fiscalStart && dt <= fiscalEnd) {
            monthly += amt;
            const cat = d.category || 'Otros';
            catData[cat] = (catData[cat] || 0) + amt;
          }
        }
      });
      setData(prev => ({ ...prev, income: monthly, cumulativeIncome: total }));
      setIncomeByCategory(catData);
    });

    const unsubRec = onSnapshot(query(collection(db, 'users', auth.currentUser.uid, 'gastos_recurrentes')), (snap) => {
      const mKey = `${currentDate.getFullYear()}-${currentDate.getMonth()}`;
      let monthly = 0, cumulative = 0;
      let monthlySubs = 0;
      const recList: { name: string, amt: number }[] = [];
      const subList: { name: string, amt: number }[] = [];
      const curNow = new Date();
      snap.docs.forEach(doc => {
        const d = doc.data();
        const amt = Number(d.amount) || 0;
        const dt = d.date?.toDate();
        const effectiveDate = dt || new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);

        if (!dt || effectiveDate <= fiscalEnd) {
          const isPaid = (d.paidMonths?.includes(mKey)) || (d.autoDebit && !isFutureMonth && (isPastMonth || (isCurrentMonth && curNow.getDate() >= (d.recurringDay || 1))));
          if (isPaid) {
            if (isSubscriptionItem(d)) {
              monthlySubs += amt;
              subList.push({ name: d.description || d.category || 'Suscripción', amt });
            } else {
              monthly += amt;
              recList.push({ name: d.description || d.category || 'Fijo', amt });
            }
          }
        }

        cumulative += (d.paidMonths?.length || 0) * amt;
        if (d.autoDebit) {
          let chk = new Date(effectiveDate.getFullYear(), effectiveDate.getMonth(), 1);
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
      setSubscriptionsMonthly(monthlySubs);
      setRecurringExpensesList(recList);
      setSubscriptionsList(subList);
    });

    const unsubIncRec = onSnapshot(query(collection(db, 'users', auth.currentUser.uid, 'ingresos_recurrentes')), (snap) => {
      const mKey = `${currentDate.getFullYear()}-${currentDate.getMonth()}`;
      let monthly = 0, cumulative = 0;
      const incList: { name: string, amt: number }[] = [];
      const curNow = new Date();
      snap.docs.forEach(doc => {
        const d = doc.data();
        const amt = Number(d.amount) || 0;
        const dt = d.date?.toDate();
        const effectiveDate = dt || new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);

        if (!dt || effectiveDate <= fiscalEnd) {
          const isRcv = (d.paidMonths?.includes(mKey)) || (d.autoDebit && !isFutureMonth && (isPastMonth || (isCurrentMonth && curNow.getDate() >= (d.recurringDay || 1))));
          if (isRcv) {
            monthly += amt;
            incList.push({ name: d.description || d.category || 'Fijo', amt });
          }
        }

        cumulative += (d.paidMonths?.length || 0) * amt;
        if (d.autoDebit) {
          let chk = new Date(effectiveDate.getFullYear(), effectiveDate.getMonth(), 1);
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
      setRecurringIncomeList(incList);
    });

    const unsubDebt = onSnapshot(collection(db, 'users', auth.currentUser.uid, 'prestamos'), (snap) => {
      const all = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const curNow = new Date();
      const mKey = `${currentDate.getFullYear()}-${currentDate.getMonth()}`;
      const activeDebtsList: { name: string, amt: number }[] = [];

      setDebts(all.filter((d: any) => d.startDate && d.dueDate && d.startDate.toDate() <= fiscalEnd && d.dueDate.toDate() >= fiscalStart));

      const mon = all.filter((d: any) => {
        const isPaid = (d.paidMonths?.includes(mKey)) || ((d.autoDebit || d.debtSubtype === 'insurance') && (isPastMonth || (isCurrentMonth && curNow.getDate() >= (d.recurringDay || 1))));
        if (isPaid) {
          activeDebtsList.push({ name: d.description || d.category || 'Deuda', amt: Number(d.amount) || 0 });
        }
        return isPaid;
      }).reduce((a, d: any) => a + (Number(d.amount) || 0), 0);

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
      setDebtsList(activeDebtsList);
    });

    return () => { unsubExp(); unsubInc(); unsubRec(); unsubIncRec(); unsubDebt(); };
  }, [currentDate]);

  const totalIncome = data.income + data.recurringIncome;
  const totalExpenses = data.expenses + data.recurringExpenses + subscriptionsMonthly + data.debtsPaid;
  const balance = totalIncome - totalExpenses; // Used to be cumulative, but user expects monthly net balance based on income/expenses.

  const totalRemainingDebt = debts
    .filter(d => d.debtSubtype === 'loan')
    .reduce((acc, d) => acc + (parseFloat(d.remainingAmount) || 0), 0);

  const monthYearLabel = currentDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' });

  const { start: fiscalStartLabel, end: fiscalEndLabel } = getFiscalRange(currentDate);
  const rangeLabel = `${fiscalStartLabel.getDate()} ${fiscalStartLabel.toLocaleString('es-ES', { month: 'short' })} - ${fiscalEndLabel.getDate()} ${fiscalEndLabel.toLocaleString('es-ES', { month: 'short' })}`;

  const exportToCSV = () => {
    const headers = ['Tipo', 'Categoria/Descripcion', 'Monto'];
    const rows: any[][] = [];

    Object.entries(incomeByCategory).forEach(([cat, amt]) => rows.push(['Ingreso Variable', cat, amt]));
    recurringIncomeList.forEach(inc => rows.push(['Ingreso Fijo', inc.name, inc.amt]));
    Object.entries(expensesByCategory).forEach(([cat, amt]) => rows.push(['Gasto Diario', cat, amt]));
    recurringExpensesList.forEach(rec => rows.push(['Gasto Fijo', rec.name, rec.amt]));
    subscriptionsList.forEach(sub => rows.push(['Suscripcion', sub.name, sub.amt]));
    debtsList.forEach(debt => rows.push(['Deuda/Seguro', debt.name, debt.amt]));

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF"
      + headers.join(",") + "\n"
      + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    // Remove spaces from rangeLabel for cleaner filename
    link.setAttribute("download", `Flux_Reporte_${currentDate.getMonth() + 1}_${currentDate.getFullYear()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const chartColors = ['#fca311', '#818cf8', '#4ade80', '#f87171', '#a78bfa', '#f472b6', '#34d399'];
  const expensesChartData = Object.entries(expensesByCategory).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  const hourlyChartData = Array.from({ length: 24 }, (_, i) => ({
    name: `${i.toString().padStart(2, '0')}:00`,
    value: expensesByHour[i] || 0
  }));

  return (
    <div className="dashboard-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ width: '100%', maxWidth: '1400px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Branding & Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: '24px', fontWeight: '900', letterSpacing: '-1px' }}>FLUX</h1>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <button onClick={exportToCSV} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }} title="Exportar a CSV">
              <Download size={20} color="#666" />
            </button>
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
              {auth.currentUser?.photoURL ? <img src={auth.currentUser.photoURL} alt="profile" style={{ width: '100%' }} /> : <div style={{ width: '100%', height: '100%', background: 'var(--glass-border)' }} />}
            </div>
            <div>
              <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Hola,</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <p style={{ fontSize: '14px', fontWeight: 'bold' }}>{auth.currentUser?.displayName || 'Usuario'}</p>
                {user?.isPro ? (
                  <span style={{
                    fontSize: '9px',
                    fontWeight: '900',
                    background: 'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)',
                    color: 'var(--accent-color)',
                    padding: '2px 6px',
                    borderRadius: '6px',
                    textTransform: 'uppercase'
                  }}>PRO</span>
                ) : (
                  <span style={{
                    fontSize: '9px',
                    fontWeight: 'bold',
                    background: '#262626',
                    color: 'var(--text-secondary)',
                    padding: '2px 6px',
                    borderRadius: '6px',
                    textTransform: 'uppercase',
                    border: '1px solid var(--glass-border)'
                  }}>FREE</span>
                )}
              </div>
            </div>
          </div>
          {!user?.isPro && (
            <button style={{
              background: 'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)',
              color: 'var(--accent-color)',
              border: 'none',
              borderRadius: '12px',
              padding: '8px 14px',
              fontSize: '11px',
              fontWeight: '900',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(251, 191, 36, 0.2)'
            }}
              onClick={onUpgrade}
            >
              <Zap size={14} fill="currentColor" />
              MEJORAR
            </button>
          )}
        </div>

        {/* Month Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--glass-bg)', padding: '12px 16px', borderRadius: '16px', border: '1px solid var(--glass-border)' }}>
          <button onClick={() => changeMonth(-1)} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ChevronLeft size={20} />
          </button>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '14px', fontWeight: '800', textTransform: 'capitalize', color: 'var(--text-primary)' }}>{monthYearLabel}</p>
            <p style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2px' }}>{rangeLabel}</p>
          </div>
          <button onClick={() => changeMonth(1)} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ChevronRight size={20} />
          </button>
        </div>

        {/* PRO Banner — only for non-premium users, now full width strip on PC if needed */}
        {!user?.isPro && <div style={{ marginBottom: '-8px' }}><ProBanner /></div>}

        <div className="dashboard-layout">
          <div className="dashboard-layout-left">
            {/* Main Balance Card */}
            <div className="premium-card"
              onClick={() => setBreakdownType('balance')}
              style={{
                background: 'var(--card-bg)',
                border: '1px solid var(--border-color)',
                textAlign: 'center',
                padding: '32px 24px',
                position: 'relative',
                overflow: 'hidden',
                cursor: 'pointer'
              }}>
              <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', background: 'rgba(129, 138, 248, 0.05)', borderRadius: '50%', filter: 'blur(40px)' }}></div>
              <h1 style={{ fontSize: '40px', fontWeight: '800', letterSpacing: '-1px', position: 'relative' }}>{currency.symbol} {balance.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</h1>
            </div>


            {/* Wallets Horizontal List */}
            {wallets.length > 0 && (
              <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', padding: '4px 0 16px 0', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                {wallets.map((w: any) => (
                  <div key={w.id} className="premium-card" style={{
                    minWidth: '140px',
                    flex: '0 0 auto',
                    background: 'var(--glass-bg)',
                    border: '1px solid var(--glass-border)',
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '16px' }}>{w.icon || '🏦'}</span>
                      <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{w.name}</span>
                    </div>
                    <p style={{ fontSize: '14px', fontWeight: '800', margin: 0 }}>{currency.symbol} {(parseFloat(w.balance) || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Month Projection Widget — mobile only, desktop version is below 'Actividad Reciente' */}
            <div className="mobile-only">
              <MonthProjection currentDate={currentDate} currency={currency} />
            </div>

            {/* Quick Summary Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div
                className="premium-card"
                onClick={(e) => handleClickNav('income', e)}
                onPointerDown={() => handlePressStart('income')}
                onPointerUp={handlePressEnd}
                onPointerLeave={handlePressEnd}
                style={{ background: 'var(--card-bg)', border: '1px solid rgba(74, 222, 128, 0.05)', cursor: 'pointer', userSelect: 'none', WebkitUserSelect: 'none' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <TrendingUp size={16} color="var(--income-color)" />
                  <p style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Ingresos</p>
                </div>
                <p style={{ fontSize: '20px', fontWeight: 'bold' }}>{currency.symbol} {totalIncome.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</p>
                <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>Mantener para ver</p>
              </div>
              <div
                className="premium-card"
                onClick={(e) => handleClickNav('recurring', e)}
                onPointerDown={() => handlePressStart('expense')}
                onPointerUp={handlePressEnd}
                onPointerLeave={handlePressEnd}
                style={{ background: 'var(--card-bg)', border: '1px solid rgba(248, 113, 113, 0.05)', cursor: 'pointer', userSelect: 'none', WebkitUserSelect: 'none' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <TrendingDown size={16} color="var(--expense-color)" />
                  <p style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Egresos</p>
                </div>
                <p style={{ fontSize: '20px', fontWeight: 'bold' }}>{currency.symbol} {totalExpenses.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '6px' }}>
                  <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>Diarios: {currency.symbol} {data.expenses.toLocaleString()}</p>
                  <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>Fijos: {currency.symbol} {data.recurringExpenses.toLocaleString()}</p>
                  <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>Suscrip.: {currency.symbol} {subscriptionsMonthly.toLocaleString()}</p>
                  <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>Deudas: {currency.symbol} {data.debtsPaid.toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Recent Transactions */}
            <div style={{ marginTop: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 'bold' }}>Actividad Reciente</h3>
                <button
                  onClick={() => onNavigate('gastos')}
                  style={{ background: 'none', border: 'none', color: '#818cf8', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  Ver más
                </button>
              </div>
              <RecentTransactions onNavigate={onNavigate} currency={currency} />
            </div>

            {/* Month Projection — desktop: below Recent Transactions */}
            <div className="desktop-only">
              <MonthProjection currentDate={currentDate} currency={currency} />
            </div>
          </div>

          <div className="dashboard-layout-right">
            {/* Category Budgets & Swipes */}
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '12px', padding: '0 4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                Categorías & Presupuestos
                <span style={{ fontSize: '10px', fontWeight: 'normal', color: 'var(--text-secondary)' }}>(Desliza ↑ editar, ↓ gastar)</span>
              </h3>
              <CategoryBudget currentDate={currentDate} onAddExpense={onAddFromCategory} />
            </div>

            {/* Savings Goals Carousel */}
            {savingsGoals.length > 0 ? (
              <div className="premium-card" style={{ background: 'var(--card-bg)', border: '1px solid rgba(129,140,248,0.15)', padding: '20px', position: 'relative', overflow: 'hidden' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <PiggyBank size={18} color="#818cf8" />
                    <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-secondary)' }}>Metas de Ahorro</span>
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {savingsGoals.map((_, i) => (
                      <button key={i} onClick={() => setSavingsGoalIndex(i)}
                        style={{ width: i === savingsGoalIndex ? '16px' : '6px', height: '6px', borderRadius: '3px', background: i === savingsGoalIndex ? '#818cf8' : 'var(--glass-border)', border: 'none', cursor: 'pointer', padding: 0, transition: 'all 0.3s' }} />
                    ))}
                  </div>
                </div>

                {/* Swipeable goal card */}
                {(() => {
                  const goal = savingsGoals[savingsGoalIndex];
                  if (!goal) return null;
                  const pct = goal.targetAmount > 0 ? Math.min(100, (goal.currentAmount / goal.targetAmount) * 100) : 0;
                  return (
                    <motion.div
                      key={goal.id}
                      drag="x"
                      dragConstraints={{ left: 0, right: 0 }}
                      onDragEnd={(_e, { offset }) => {
                        if (offset.x < -40 && savingsGoalIndex < savingsGoals.length - 1) setSavingsGoalIndex(i => i + 1);
                        if (offset.x > 40 && savingsGoalIndex > 0) setSavingsGoalIndex(i => i - 1);
                      }}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      style={{ cursor: savingsGoals.length > 1 ? 'grab' : 'default' }}
                      whileTap={{ cursor: 'grabbing' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                        <span style={{ fontSize: '28px' }}>{goal.icon}</span>
                        <div>
                          <p style={{ fontSize: '15px', fontWeight: '800', margin: 0 }}>{goal.name}</p>
                          <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0 }}>
                            {currency.symbol} {goal.currentAmount.toLocaleString('es-PE', { minimumFractionDigits: 2 })} de {currency.symbol} {goal.targetAmount.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>
                      <div style={{ height: '8px', background: 'var(--glass-bg)', borderRadius: '4px', overflow: 'hidden', marginBottom: '8px' }}>
                        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, ease: 'easeOut' }}
                          style={{ height: '100%', background: `linear-gradient(90deg, ${goal.color}90, ${goal.color})`, borderRadius: '4px' }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                          {pct >= 100 ? '🎉 ¡Meta alcanzada!' : `Falta: ${currency.symbol} ${(goal.targetAmount - goal.currentAmount).toLocaleString('es-PE', { minimumFractionDigits: 2 })}`}
                        </span>
                        <span style={{ fontSize: '11px', fontWeight: '700', color: goal.color }}>{Math.round(pct)}%</span>
                      </div>
                    </motion.div>
                  );
                })()}

                <button onClick={() => onNavigate('savings')}
                  style={{ marginTop: '14px', width: '100%', padding: '10px', borderRadius: '12px', background: 'rgba(129,140,248,0.1)', border: '1px solid rgba(129,140,248,0.2)', color: '#818cf8', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
                  Ver todas las metas →
                </button>
              </div>
            ) : (
              <div className="premium-card" style={{ background: 'var(--card-bg)', border: '1px solid rgba(129,140,248,0.1)', padding: '20px', textAlign: 'center' }}>
                <PiggyBank size={28} color="#818cf8" style={{ marginBottom: '10px', opacity: 0.5 }} />
                <p style={{ fontSize: '14px', fontWeight: '700', margin: '0 0 6px 0' }}>Sin metas de ahorro</p>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 14px 0' }}>Crea una meta en la sección Metas</p>
                <button onClick={() => onNavigate('savings')}
                  style={{ width: '100%', padding: '10px', borderRadius: '12px', background: 'rgba(129,140,248,0.12)', border: '1px solid rgba(129,140,248,0.25)', color: '#818cf8', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
                  Ir a Metas →
                </button>
              </div>
            )}

            {/* Debt Progress Card */}
            {
              debts.length > 0 && (
                <div className="premium-card" style={{ background: 'rgba(239, 68, 68, 0.03)', border: '1px solid rgba(239, 68, 68, 0.1)', padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {user?.photoURL ? (
                        <img
                          src={user.photoURL}
                          alt="Profile"
                          style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const nextSibling = e.currentTarget.nextElementSibling as HTMLElement;
                            if (nextSibling) nextSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div
                        style={{
                          display: user?.photoURL ? 'none' : 'flex',
                          width: '40px', height: '40px', borderRadius: '50%', background: 'var(--brand-color)', color: 'white', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold'
                        }}
                      >
                        {user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <h3 style={{ fontSize: '15px', fontWeight: 'bold' }}>Deuda Total Restante</h3>
                    </div>
                    <p style={{ fontSize: '18px', fontWeight: '800', color: '#ef4444' }}>{currency.symbol} {totalRemainingDebt.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</p>
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
                          const adjustedEnd = new Date(end);
                          adjustedEnd.setHours(23, 59, 59, 999);
                          const totalTime = adjustedEnd.getTime() - start.getTime();
                          const elapsed = new Date().getTime() - start.getTime();
                          percent = Math.max(0, Math.min(100, (elapsed / totalTime) * 100));
                          statusText = `Vigencia: ${Math.floor(percent)}%`;
                        }
                      } else {
                        const total = debt.totalLoanAmount || 0;
                        const remaining = debt.remainingAmount || 0;
                        const paid = Math.max(0, total - remaining);
                        percent = total > 0 ? Math.min(100, (paid / total) * 100) : 0;
                        statusText = `${debt.paidQuotas} cuotas pagadas`;
                      }

                      return (
                        <div key={debt.id} style={{ background: 'var(--glass-bg)', padding: '12px', borderRadius: '12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span style={{ fontSize: '13px', fontWeight: '500' }}>{debt.description || debt.category}</span>
                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{statusText}</span>
                          </div>
                          <div style={{ height: '6px', background: 'var(--glass-bg)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ width: `${percent}%`, height: '100%', background: isInsurance ? '#4ade80' : '#ef4444', borderRadius: '3px', transition: 'width 1s ease-in-out' }} />
                          </div>
                          {!isInsurance && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                              <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{currency.symbol} {debt.remainingAmount?.toLocaleString()} restante</span>
                              <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Total: {currency.symbol} {debt.totalLoanAmount?.toLocaleString()}</span>
                            </div>
                          )}
                          {isInsurance && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                              <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Inició: {debt.startDate?.toDate().toLocaleDateString()}</span>
                              <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Fin: {debt.dueDate?.toDate().toLocaleDateString()}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )
            }

            {/* Visual Analysis Chart */}
            {
              (expensesChartData.length > 0 || Object.keys(expensesByHour).length > 0) && (
                <div className="premium-card" style={{ padding: '20px', background: 'var(--card-bg-light)', border: '1px solid var(--glass-border)', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 'bold' }}>Análisis de Gastos</h3>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: analysisPage === 0 ? 'var(--text-primary)' : 'var(--glass-border)', transition: 'background 0.3s' }} />
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: analysisPage === 1 ? 'var(--text-primary)' : 'var(--glass-border)', transition: 'background 0.3s' }} />
                    </div>
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                    {analysisPage === 0 ? 'En qué se te va el dinero este mes' : 'Horario de compras (Histórico)'}
                  </p>

                  <AnimatePresence mode="wait">
                    {analysisPage === 0 ? (
                      <motion.div
                        key="page0"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                        drag="x"
                        dragConstraints={{ left: 0, right: 0 }}
                        onDragEnd={(_e, { offset }) => {
                          if (offset.x < -50) setAnalysisPage(1);
                        }}
                        style={{ cursor: 'grab' }}
                        whileTap={{ cursor: 'grabbing' }}
                      >
                        <div style={{ height: '220px', position: 'relative' }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={expensesChartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={90}
                                paddingAngle={5}
                                dataKey="value"
                                stroke="none"
                              >
                                {expensesChartData.map((_entry, index) => (
                                  <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                                ))}
                              </Pie>
                              <Tooltip
                                formatter={(value: any, name: string) => [`${currency.symbol} ${Number(value).toLocaleString()}`, name]}
                                contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', color: 'var(--text-primary)' }}
                                itemStyle={{ color: 'var(--text-primary)' }}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                          {/* Center Label */}
                          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', pointerEvents: 'none' }}>
                            <p style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Total Var.</p>
                            <p style={{ fontSize: '14px', fontWeight: 'bold' }}>{currency.symbol} {data.expenses.toLocaleString()}</p>
                          </div>
                        </div>
                        {/* Legend */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center', marginTop: '12px' }}>
                          {expensesChartData.slice(0, 5).map((entry, index) => (
                            <div key={entry.name} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: chartColors[index % chartColors.length] }} />
                              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{entry.name}</span>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="page1"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.2 }}
                        drag="x"
                        dragConstraints={{ left: 0, right: 0 }}
                        onDragEnd={(_e, { offset }) => {
                          if (offset.x > 50) setAnalysisPage(0);
                        }}
                        style={{ cursor: 'grab' }}
                        whileTap={{ cursor: 'grabbing' }}
                      >
                        <div style={{ height: '220px', width: '100%' }}>
                          <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={hourlyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                              <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} interval={3} />
                              <YAxis tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} tickFormatter={(val) => `${val > 1000 ? (val / 1000).toFixed(1) + 'k' : val}`} />
                              <Tooltip
                                formatter={(value: any, name: string) => [`${currency.symbol} ${Number(value).toLocaleString()}`, name]}
                                labelStyle={{ color: 'var(--text-secondary)' }}
                                contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', color: 'var(--text-primary)' }}
                                itemStyle={{ color: 'var(--text-primary)' }}
                                cursor={{ fill: 'var(--glass-bg)' }}
                              />
                              <Bar dataKey="value" fill="#818cf8" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                        <div style={{ textAlign: 'center', marginTop: '12px' }}>
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Mide el total gastado por hora a lo largo de tu historial.</span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )
            }
          </div>
        </div>
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
              style={{ padding: '24px', background: 'var(--card-bg-light)', borderTopLeftRadius: '24px', borderTopRightRadius: '24px', position: 'relative', zIndex: 1 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 'bold' }}>
                  {breakdownType === 'balance' ? 'Detalle del Saldo Total' : `Desglose de ${breakdownType === 'income' ? 'Ingresos' : 'Egresos'}`}
                </h2>
                <button onClick={() => setBreakdownType(null)} style={{ background: 'var(--border-color)', border: 'none', color: 'var(--text-primary)', padding: '8px', borderRadius: '50%', cursor: 'pointer' }}>
                  <X size={20} />
                </button>
              </div>

              {breakdownType === 'balance' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '60vh', overflowY: 'auto' }}>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px', lineHeight: '1.4' }}>
                    El saldo es el resultado de la formula: **Total Ingresos en este mes - Total Egresos en este mes**. Este balance es sólo de tu mes actual, no considera meses anteriores.
                  </p>
                  <h3 style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Ingresos del Mes (+)</h3>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'rgba(74, 222, 128, 0.1)', borderRadius: '12px', color: '#4ade80' }}>
                    <span>Ingresos Variables</span>
                    <span style={{ fontWeight: 'bold' }}>{currency.symbol} {data.income.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'rgba(74, 222, 128, 0.1)', borderRadius: '12px', color: '#4ade80' }}>
                    <span>Ingresos Fijos Efectuados</span>
                    <span style={{ fontWeight: 'bold' }}>{currency.symbol} {data.recurringIncome.toLocaleString()}</span>
                  </div>

                  <h3 style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '8px', marginBottom: '4px' }}>Egresos del Mes (-)</h3>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'rgba(248, 113, 113, 0.1)', borderRadius: '12px', color: '#f87171' }}>
                    <span>Gastos Diarios Individuales</span>
                    <span style={{ fontWeight: 'bold' }}>{currency.symbol} {data.expenses.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'rgba(248, 113, 113, 0.1)', borderRadius: '12px', color: '#f87171' }}>
                    <span>Gastos Fijos Efectuados</span>
                    <span style={{ fontWeight: 'bold' }}>{currency.symbol} {data.recurringExpenses.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'rgba(248, 113, 113, 0.1)', borderRadius: '12px', color: '#f87171' }}>
                    <span>Suscripciones Pagadas</span>
                    <span style={{ fontWeight: 'bold' }}>{currency.symbol} {subscriptionsMonthly.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '12px', color: '#ef4444' }}>
                    <span>Deudas/Seguros Pagados</span>
                    <span style={{ fontWeight: 'bold' }}>{currency.symbol} {data.debtsPaid.toLocaleString()}</span>
                  </div>
                </div>
              ) : breakdownType === 'income' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '60vh', overflowY: 'auto' }}>
                  {recurringIncomeList.length > 0 && <h3 style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Ingresos Fijos</h3>}
                  {recurringIncomeList.map((inc, i) => (
                    <div key={`inc-rec-${i}`} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'rgba(74, 222, 128, 0.1)', borderRadius: '12px', color: '#4ade80' }}>
                      <span>{inc.name}</span>
                      <span style={{ fontWeight: 'bold' }}>{currency.symbol} {inc.amt.toLocaleString()}</span>
                    </div>
                  ))}

                  {Object.keys(incomeByCategory).length > 0 && <h3 style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '8px', marginBottom: '4px' }}>Por Categoría (Variables)</h3>}
                  {Object.entries(incomeByCategory).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => (
                    <div key={`inc-cat-${cat}`} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'var(--glass-bg)', borderRadius: '12px' }}>
                      <span>{cat}</span>
                      <span style={{ fontWeight: 'bold' }}>{currency.symbol} {amt.toLocaleString()}</span>
                    </div>
                  ))}
                  {Object.keys(incomeByCategory).length === 0 && recurringIncomeList.length === 0 && (
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px', textAlign: 'center', padding: '20px 0' }}>No hay ingresos registrados en este periodo.</p>
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '60vh', overflowY: 'auto' }}>
                  {recurringExpensesList.length > 0 && <h3 style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Gastos Fijos (Alquiler, Servicios, etc)</h3>}
                  {recurringExpensesList.map((rec, i) => (
                    <div key={`exp-rec-${i}`} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'rgba(248, 113, 113, 0.1)', borderRadius: '12px', color: '#f87171' }}>
                      <span>{rec.name}</span>
                      <span style={{ fontWeight: 'bold' }}>{currency.symbol} {rec.amt.toLocaleString()}</span>
                    </div>
                  ))}

                  {subscriptionsList.length > 0 && <h3 style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Suscripciones</h3>}
                  {subscriptionsList.map((sub, i) => (
                    <div key={`exp-sub-${i}`} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'rgba(248, 113, 113, 0.1)', borderRadius: '12px', color: '#f87171' }}>
                      <span>{sub.name}</span>
                      <span style={{ fontWeight: 'bold' }}>{currency.symbol} {sub.amt.toLocaleString()}</span>
                    </div>
                  ))}

                  {debtsList.length > 0 && <h3 style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '8px', marginBottom: '4px' }}>Deudas y Seguros</h3>}
                  {debtsList.map((debt, i) => (
                    <div key={`debt-${i}`} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '12px', color: '#ef4444' }}>
                      <span>{debt.name}</span>
                      <span style={{ fontWeight: 'bold' }}>{currency.symbol} {debt.amt.toLocaleString()}</span>
                    </div>
                  ))}

                  {Object.keys(expensesByCategory).length > 0 && <h3 style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '8px', marginBottom: '4px' }}>Gastos Diarios por Categoría</h3>}
                  {Object.entries(expensesByCategory).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => (
                    <div key={`exp-cat-${cat}`} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'var(--glass-bg)', borderRadius: '12px' }}>
                      <span>{cat}</span>
                      <span style={{ fontWeight: 'bold' }}>{currency.symbol} {amt.toLocaleString()}</span>
                    </div>
                  ))}

                  {Object.keys(expensesByCategory).length === 0 && recurringExpensesList.length === 0 && debtsList.length === 0 && (
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px', textAlign: 'center', padding: '20px 0' }}>No hay gastos registrados en este periodo.</p>
                  )}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div >
  );
};

export default Dashboard;

