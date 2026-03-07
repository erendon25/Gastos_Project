import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { TrendingDown, TrendingUp, AlertTriangle, CheckCircle, Info, X } from 'lucide-react';
import { getFiscalRange } from '../lib/dateUtils';

interface MonthProjectionProps {
    currentDate: Date;
    currency?: { code: string; symbol: string };
}

const MonthProjection: React.FC<MonthProjectionProps> = ({ currentDate, currency = { code: 'PEN', symbol: 'S/' } }) => {
    const [projectedExpense, setProjectedExpense] = useState(0);
    const [actualExpense, setActualExpense] = useState(0);
    const [variableExpense, setVariableExpense] = useState(0);
    const [fixedTotalExpense, setFixedTotalExpense] = useState(0);
    const [income, setIncome] = useState(0);
    const [daysElapsed, setDaysElapsed] = useState(0);
    const [daysInPeriod, setDaysInPeriod] = useState(30);
    const [loading, setLoading] = useState(true);
    const [showDetail, setShowDetail] = useState(false);
    const [topCategories, setTopCategories] = useState<{ name: string; amount: number; emoji?: string }[]>([]);

    useEffect(() => {
        if (!auth.currentUser) return;
        const uid = auth.currentUser.uid;
        const { start, end, startTimestamp, endTimestamp } = getFiscalRange(currentDate);

        const now = new Date();
        const isCurrentPeriod = now >= start && now <= end;

        const periodMs = end.getTime() - start.getTime();
        const daysTotal = Math.round(periodMs / (1000 * 60 * 60 * 24));
        setDaysInPeriod(daysTotal);

        if (isCurrentPeriod) {
            const elapsedMs = now.getTime() - start.getTime();
            setDaysElapsed(Math.max(1, Math.round(elapsedMs / (1000 * 60 * 60 * 24))));
        } else {
            setDaysElapsed(daysTotal);
        }

        setLoading(true);

        // 1. Variable expenses (daily)
        const qExpenses = query(
            collection(db, 'users', uid, 'gastos'),
            where('date', '>=', startTimestamp),
            where('date', '<=', endTimestamp),
            orderBy('date', 'desc')
        );

        // 2. Fixed recurring expenses — check by recurringDay in period
        const qFixed = query(collection(db, 'users', uid, 'gastos_recurrentes'), where('recurringDay', '>=', 1));

        // 3. Subscriptions — check by subscriptionDay in period
        const qSubs = query(collection(db, 'users', uid, 'suscripciones'), where('subscriptionDay', '>=', 1));

        // 4. Debts/loans installments paid this period
        const qDebts = query(
            collection(db, 'users', uid, 'prestamos'),
            where('chargeDate', '>=', startTimestamp),
            where('chargeDate', '<=', endTimestamp),
        );

        // Fetch regular (variable) income
        const qIncome = query(
            collection(db, 'users', uid, 'ingresos'),
            where('date', '>=', startTimestamp),
            where('date', '<=', endTimestamp),
        );

        // Fetch recurring (fixed) income — salary, etc.
        const qRecurringIncome = query(
            collection(db, 'users', uid, 'ingresos_recurrentes'),
            where('recurringDay', '>=', 1)
        );

        let variableExpenses = 0;
        let fixedExpenses = 0;
        let subsExpenses = 0;
        let debtExpenses = 0;
        let expenseDocs: any[] = [];
        let variableIncome = 0;
        let recurringIncome = 0;

        const updateExpense = () => {
            const total = variableExpenses + fixedExpenses + subsExpenses + debtExpenses;
            const fixedOnly = fixedExpenses + subsExpenses + debtExpenses;
            setActualExpense(total);
            setVariableExpense(variableExpenses);
            setFixedTotalExpense(fixedOnly);
        };
        const updateIncome = () => setIncome(variableIncome + recurringIncome);

        // Helper: check if a recurring item (by day number) falls within the fiscal period
        const isInPeriod = (day: number) => {
            if (!day) return false;
            const d = new Date(start.getFullYear(), start.getMonth(), day);
            if (d < start) d.setMonth(d.getMonth() + 1);
            return d >= start && d <= end;
        };

        const unsubExpenses = onSnapshot(qExpenses, (snap) => {
            expenseDocs = snap.docs.map(d => ({ ...d.data() }));
            variableExpenses = expenseDocs.reduce((s, d) => s + (parseFloat(d.amount) || 0), 0);

            // Top categories (variable only — most relevant)
            const catMap: Record<string, { amount: number; emoji?: string }> = {};
            expenseDocs.forEach(d => {
                const cat = d.category || 'Otros';
                if (!catMap[cat]) catMap[cat] = { amount: 0, emoji: d.categoryEmoji };
                catMap[cat].amount += parseFloat(d.amount) || 0;
            });
            const sorted = Object.entries(catMap)
                .map(([name, v]) => ({ name, amount: v.amount, emoji: v.emoji }))
                .sort((a, b) => b.amount - a.amount)
                .slice(0, 4);
            setTopCategories(sorted);
            setLoading(false);
            updateExpense();
        });

        const unsubFixed = onSnapshot(qFixed, (snap) => {
            fixedExpenses = snap.docs.reduce((s, d) => {
                const data = d.data() as any;
                return isInPeriod(data.recurringDay) ? s + (parseFloat(data.amount) || 0) : s;
            }, 0);
            updateExpense();
        });

        const unsubSubs = onSnapshot(qSubs, (snap) => {
            subsExpenses = snap.docs.reduce((s, d) => {
                const data = d.data() as any;
                return isInPeriod(data.subscriptionDay || data.recurringDay) ? s + (parseFloat(data.amount) || 0) : s;
            }, 0);
            updateExpense();
        });

        const unsubDebts = onSnapshot(qDebts, (snap) => {
            debtExpenses = snap.docs.reduce((s, d) => s + (parseFloat((d.data() as any).installmentAmount || (d.data() as any).amount) || 0), 0);
            updateExpense();
        });

        const unsubIncome = onSnapshot(qIncome, (snap) => {
            variableIncome = snap.docs.reduce((s, d) => s + (parseFloat((d.data() as any).amount) || 0), 0);
            updateIncome();
        });

        // Recurring income: check which ones have a recurringDay within the fiscal period
        const unsubRecurring = onSnapshot(qRecurringIncome, (snap) => {
            let total = 0;
            snap.docs.forEach(d => {
                const data = d.data() as any;
                const amount = parseFloat(data.amount) || 0;
                if (isInPeriod(data.recurringDay)) total += amount;
            });
            recurringIncome = total;
            updateIncome();
        });

        return () => { unsubExpenses(); unsubFixed(); unsubSubs(); unsubDebts(); unsubIncome(); unsubRecurring(); };

    }, [currentDate]);

    useEffect(() => {
        if (daysElapsed > 0 && daysInPeriod > 0) {
            // Formula: (Variable Daily Expenses / Days Elapsed) * Total Days + Fixed Monthly Costs
            const dailyRate = variableExpense / daysElapsed;
            const projected = (dailyRate * daysInPeriod) + fixedTotalExpense;
            setProjectedExpense(projected);
        }
    }, [variableExpense, fixedTotalExpense, daysElapsed, daysInPeriod]);

    if (loading) return null;

    const now = new Date();
    const { start, end } = getFiscalRange(currentDate);
    const isCurrentPeriod = now >= start && now <= end;
    if (!isCurrentPeriod) return null; // Only show for current period

    const progress = daysInPeriod > 0 ? (daysElapsed / daysInPeriod) * 100 : 0;
    const projectionVsIncome = income > 0 ? (projectedExpense / income) * 100 : 0;
    const savingProjected = income - projectedExpense;

    const status =
        projectionVsIncome > 100 ? 'danger' :
            projectionVsIncome > 85 ? 'warning' : 'ok';

    const statusConfig = {
        danger: { color: '#ef4444', bg: 'rgba(239,68,68,0.08)', icon: <AlertTriangle size={16} />, label: 'En riesgo' },
        warning: { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', icon: <AlertTriangle size={16} />, label: 'Precaución' },
        ok: { color: '#34d399', bg: 'rgba(52,211,153,0.08)', icon: <CheckCircle size={16} />, label: 'En control' },
    }[status];

    return (
        <>
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                    background: `linear-gradient(135deg, ${statusConfig.bg} 0%, var(--glass-bg) 100%)`,
                    borderRadius: '20px',
                    padding: '20px',
                    border: `1px solid ${statusConfig.color}30`,
                    cursor: 'pointer'
                }}
                onClick={() => setShowDetail(true)}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: `${statusConfig.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: statusConfig.color }}>
                            {statusConfig.icon}
                        </div>
                        <div>
                            <p style={{ fontSize: '12px', fontWeight: '700', color: statusConfig.color, margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                Proyección de Mes • {statusConfig.label}
                            </p>
                            <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', margin: 0 }}>Día {daysElapsed} de {daysInPeriod}</p>
                        </div>
                    </div>
                    <Info size={16} color="var(--text-tertiary)" />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                    <div>
                        <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: '0 0 4px 0' }}>Gasto proyectado</p>
                        <p style={{ fontSize: '18px', fontWeight: '900', margin: 0, color: statusConfig.color }}>
                            {currency.symbol} {projectedExpense.toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </p>
                    </div>
                    <div>
                        <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: '0 0 4px 0' }}>Ahorro proyectado</p>
                        <p style={{ fontSize: '18px', fontWeight: '900', margin: 0, color: savingProjected >= 0 ? '#34d399' : '#ef4444' }}>
                            {savingProjected >= 0 ? '+' : ''}{currency.symbol} {Math.abs(savingProjected).toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </p>
                    </div>
                </div>

                {/* Progress bar */}
                <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '100px', height: '6px', overflow: 'hidden', position: 'relative' }}>
                    {/* Days elapsed marker */}
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        style={{ height: '100%', background: `linear-gradient(90deg, ${statusConfig.color}60, ${statusConfig.color})`, borderRadius: '100px' }}
                    />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                    <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>{Math.round(progress)}% del período transcurrido</span>
                    <span style={{ fontSize: '10px', color: statusConfig.color, fontWeight: 'bold' }}>
                        {income > 0 ? `${Math.round(projectionVsIncome)}% del ingreso` : 'Sin ingresos registrados'}
                    </span>
                </div>
            </motion.div>

            {/* Detail Modal */}
            <AnimatePresence>
                {showDetail && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 3000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            style={{ width: '100%', maxWidth: '450px', background: 'var(--modal-bg)', borderTopLeftRadius: '32px', borderTopRightRadius: '32px', padding: '24px', maxHeight: '75vh', overflowY: 'auto' }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <h3 style={{ fontSize: '20px', fontWeight: '800', margin: 0 }}>Proyección de Fin de Mes</h3>
                                <button onClick={() => setShowDetail(false)} style={{ background: 'var(--glass-border)', border: 'none', color: 'var(--text-primary)', padding: '8px', borderRadius: '50%', cursor: 'pointer' }}><X size={20} /></button>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '20px' }}>
                                {[
                                    { label: 'Gastado hasta hoy', value: `${currency.symbol} ${actualExpense.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`, color: '#ef4444', icon: <TrendingDown size={14} /> },
                                    { label: 'Ingresos del mes', value: `${currency.symbol} ${income.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`, color: '#34d399', icon: <TrendingUp size={14} /> },
                                    { label: 'Gasto proyectado', value: `${currency.symbol} ${projectedExpense.toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`, color: statusConfig.color, icon: statusConfig.icon },
                                    { label: 'Ahorro proyectado', value: `${savingProjected >= 0 ? '+' : ''}${currency.symbol} ${Math.abs(savingProjected).toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`, color: savingProjected >= 0 ? '#34d399' : '#ef4444', icon: <CheckCircle size={14} /> },
                                ].map((item, i) => (
                                    <div key={i} style={{ background: `${item.color}10`, borderRadius: '16px', padding: '16px', border: `1px solid ${item.color}25` }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: item.color, marginBottom: '8px' }}>
                                            {item.icon}
                                            <span style={{ fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{item.label}</span>
                                        </div>
                                        <p style={{ fontSize: '16px', fontWeight: '900', margin: 0, color: item.color }}>{item.value}</p>
                                    </div>
                                ))}
                            </div>

                            {topCategories.length > 0 && (
                                <div>
                                    <h4 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>Top Categorías de Gasto</h4>
                                    {topCategories.map((cat, i) => {
                                        const pct = actualExpense > 0 ? (cat.amount / actualExpense) * 100 : 0;
                                        return (
                                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                                                <span style={{ fontSize: '18px', flexShrink: 0 }}>{cat.emoji || '📦'}</span>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                        <span style={{ fontSize: '13px', fontWeight: '600' }}>{cat.name}</span>
                                                        <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{currency.symbol} {cat.amount.toFixed(2)}</span>
                                                    </div>
                                                    <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '100px', height: '4px' }}>
                                                        <div style={{ width: `${pct}%`, height: '100%', background: '#818cf8', borderRadius: '100px' }} />
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '14px', padding: '12px', marginTop: '16px' }}>
                                <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', margin: 0, lineHeight: '1.5' }}>
                                    📊 La proyección se calcula dividiendo el gasto actual entre los días transcurridos y multiplicándolo por el total del período fiscal (del 24 al 25).
                                </p>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
};

export default MonthProjection;
