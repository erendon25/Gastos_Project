import React, { useEffect, useState } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, query, orderBy, limit, onSnapshot, updateDoc, doc, deleteDoc, where } from 'firebase/firestore';
import { CATEGORIES } from '../lib/categories';
import { CheckCircle, Circle, Calendar, Info, Edit2, Trash2, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { isSubscriptionItem } from '../lib/subscriptionUtils';
import { getFiscalRange } from '../lib/dateUtils';
import AddExpenseModal from './AddExpenseModal';

interface TransactionsListProps {
    type?: 'expense' | 'income' | 'recurring' | 'debt' | 'recurring_income';
    currentDate: Date;
    currency?: { code: string, symbol: string };
}

const SwipeableItem = ({ item, type, currentDate, onEdit, onDelete, togglePaid, currency = { code: 'PEN', symbol: 'S/' } }: { item: any; type: string; currentDate: Date; onEdit: (item: any) => void; onDelete: (id: string) => void; togglePaid: (e: any, item: any) => void, currency?: { code: string, symbol: string } }) => {
    const x = useMotionValue(0);

    // Transform background colors and icons based on drag direction
    const background = useTransform(
        x,
        [-100, 0, 100],
        ["#ef4444", "rgba(255, 255, 255, 0)", "#3b82f6"]
    );

    const opacityLeft = useTransform(x, [50, 100], [0, 1]);
    const opacityRight = useTransform(x, [-100, -50], [1, 0]);

    const isIncome = type === 'income' || item.collection?.includes('ingresos') || item.type === 'income';
    const systemIncomeCat = CATEGORIES.find(c => c.id === 'ingresos');
    const categoryData = CATEGORIES.find(c => c.name === item.category) || (isIncome ? systemIncomeCat : CATEGORIES[0]);
    const Icon = categoryData?.icon || (isIncome ? TrendingUp : CATEGORIES[0].icon);
    const now = new Date();
    const dueDate = item.dueDate?.toDate();
    const isPastDue = type === 'debt' && !item.paid && dueDate && dueDate < now;

    // Monthly status for recurring items and debts
    const monthKey = `${currentDate.getFullYear()}-${currentDate.getMonth()}`;
    const isDebt = type === 'debt' || item.collection?.includes('prestamos');
    let isAutoPaid = false;
    if (item.autoDebit || (isDebt && item.debtSubtype === 'insurance')) {
        const rd = item.recurringDay || 1;
        const chargeYear = rd >= 25 ? (currentDate.getMonth() === 0 ? currentDate.getFullYear() - 1 : currentDate.getFullYear()) : currentDate.getFullYear();
        const chargeMonth = rd >= 25 ? (currentDate.getMonth() === 0 ? 11 : currentDate.getMonth() - 1) : currentDate.getMonth();
        const chargeDate = new Date(chargeYear, chargeMonth, rd);
        if (now.getTime() >= chargeDate.getTime()) isAutoPaid = true;
    }

    const isPaid = (type === 'recurring' || item.collection?.includes('recurrentes') || isDebt)
        ? (isAutoPaid || (item.paidMonths && item.paidMonths.includes(monthKey)))
        : item.paid;

    const handleDragEnd = (_: any, info: any) => {
        if (info.offset.x > 100) {
            onEdit(item);
        } else if (info.offset.x < -100) {
            if (window.confirm('¿Eliminar este registro?')) {
                onDelete(item);
            }
        }
    };

    return (
        <div style={{ position: 'relative', overflow: 'hidden', borderRadius: '16px', marginBottom: '12px' }}>
            {/* Background Actions */}
            <motion.div style={{
                position: 'absolute', inset: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '0 24px', background, borderRadius: '16px'
            }}>
                <motion.div style={{ opacity: opacityLeft, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
                    <Edit2 size={20} /> <span style={{ fontWeight: 'bold', fontSize: '14px' }}>Editar</span>
                </motion.div>
                <motion.div style={{ opacity: opacityRight, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '14px' }}>Eliminar</span> <Trash2 size={20} />
                </motion.div>
            </motion.div>

            {/* Main Content Card */}
            <motion.div
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.7}
                onDragEnd={handleDragEnd}
                className="premium-card"
                onClick={() => onEdit(item)}
                style={{
                    x,
                    margin: 0,
                    padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px',
                    background: isPaid === false ? (isPastDue ? 'rgba(239, 68, 68, 0.08)' : 'var(--glass-bg)') : 'var(--card-bg)',
                    border: '1px solid',
                    borderColor: isPaid === false ? (isPastDue ? '#ef4444' : 'var(--glass-bg)') : 'var(--border-color)',
                    cursor: 'pointer',
                    position: 'relative',
                    touchAction: 'none'
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        {(type === 'recurring' || type === 'debt' || item.collection?.includes('recurrentes')) ? (
                            <div onClick={(e) => togglePaid(e, item)} style={{ cursor: 'pointer' }}>
                                {isPaid ? (
                                    <CheckCircle size={24} color={isIncome ? '#4ade80' : (type === 'debt' ? '#ef4444' : '#818cf8')} />
                                ) : (
                                    <Circle size={24} color="#333" />
                                )}
                            </div>
                        ) : (
                            <div style={{
                                width: '44px', height: '44px', borderRadius: '14px', background: `${categoryData?.color || 'var(--glass-border)'}20`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px'
                            }}>
                                {item.categoryEmoji ? (
                                    <span>{item.categoryEmoji}</span>
                                ) : (
                                    isIncome ? <TrendingUp size={20} color="#4ade80" /> : <Icon size={20} color={categoryData?.color || 'var(--glass-border)'} />
                                )}
                            </div>
                        )}

                        <div>
                            <p style={{ fontSize: '15px', fontWeight: 'bold' }}>
                                {item.description || item.category}
                            </p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{item.category}</p>
                                <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)' }}>•</span>
                                <p style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
                                    {item.date?.toDate().toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })} • {item.date?.toDate().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                        <p style={{
                            fontSize: '16px', fontWeight: '900',
                            color: isPaid === false ? (isPastDue ? '#ef4444' : 'var(--text-secondary)') : (isIncome ? 'var(--income-color)' : 'var(--text-primary)')
                        }}>
                            {isIncome ? '+' : '-'} {currency.symbol} {parseFloat(item.amount).toFixed(2)}
                        </p>
                        {item.originalCurrency && item.originalCurrency !== currency.code && (
                            <div style={{
                                display: 'inline-flex', alignItems: 'center', gap: '4px',
                                background: 'var(--glass-border)', padding: '2px 6px', borderRadius: '4px', marginTop: '4px'
                            }}>
                                <span style={{ fontSize: '9px', fontWeight: 'bold', color: 'var(--text-secondary)' }}>
                                    {item.originalCurrency} {parseFloat(item.originalAmount || 0).toFixed(2)}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {type === 'debt' && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', paddingTop: '8px', borderTop: '1px solid var(--glass-bg)' }}>
                        {item.startDate && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--glass-bg)', padding: '4px 8px', borderRadius: '6px' }}>
                                <Info size={12} color="#666" />
                                <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Inició: {item.startDate.toDate().toLocaleDateString('es-PE')}</span>
                            </div>
                        )}
                        {item.dueDate && (
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '6px',
                                background: isPastDue ? 'rgba(239, 68, 68, 0.1)' : 'var(--glass-bg)',
                                padding: '4px 8px', borderRadius: '6px'
                            }}>
                                <Calendar size={12} color={isPastDue ? '#ef4444' : 'var(--text-secondary)'} />
                                <span style={{ fontSize: '10px', color: isPastDue ? '#ef4444' : '#999', fontWeight: 'bold' }}>
                                    Vence: {item.dueDate.toDate().toLocaleDateString('es-PE')}
                                </span>
                            </div>
                        )}
                    </div>
                )}
            </motion.div>
        </div>
    );
};

const TransactionsList: React.FC<TransactionsListProps> = ({ type = 'expense', currentDate, currency = { code: 'PEN', symbol: 'S/' } }) => {
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingItem, setEditingItem] = useState<any>(null);

    useEffect(() => {
        if (!auth.currentUser) return;
        setLoading(true);
        const uid = auth.currentUser.uid;
        const { start: fiscalStart, end: fiscalEnd, startTimestamp, endTimestamp } = getFiscalRange(currentDate);

        let primaryCollection = 'gastos';
        let secondaryCollection: string | null = null;

        if (type === 'income') {
            primaryCollection = 'ingresos';
            // recurring income is handled exclusively by type='recurring_income'
        } else if (type === 'recurring_income') {
            primaryCollection = 'ingresos_recurrentes';
        } else if (type === 'recurring') {
            primaryCollection = 'gastos_recurrentes';
        } else if (type === 'debt') {
            primaryCollection = 'prestamos';
        }

        let primaryDocs: any[] = [];
        let secondaryDocs: any[] = [];

        const updateState = () => {
            let combined = [...primaryDocs, ...secondaryDocs];

            // Filter secondary docs (recurring/debts) if they are outside the selected month scope
            combined = combined.filter((d: any) => {
                if (type === 'recurring' && isSubscriptionItem(d)) return false;

                if (d._source === 'recurring' || d._source === 'debt') {
                    if (d._source === 'debt') {
                        if (!d.startDate || !d.dueDate) return true;
                        return d.startDate.toDate() <= fiscalEnd && d.dueDate.toDate() >= fiscalStart;
                    } else {
                        // Recurring check: showed if created on or before this month
                        return !d.date || d.date.toDate() <= fiscalEnd;
                    }
                }
                return true; // Regular items are already filtered by query
            });

            setTransactions(combined.sort((a, b) => {
                const dateA = a.date?.seconds || 0;
                const dateB = b.date?.seconds || 0;
                return dateB - dateA;
            }));
            setLoading(false);
        };

        // Primary Listener
        let qPrimary;
        if (type === 'recurring' || type === 'debt' || type === 'recurring_income') {
            qPrimary = query(collection(db, 'users', uid, primaryCollection), orderBy('date', 'desc'), limit(50));
        } else {
            qPrimary = query(
                collection(db, 'users', uid, primaryCollection),
                where('date', '>=', startTimestamp),
                where('date', '<=', endTimestamp),
                orderBy('date', 'desc')
            );
        }

        const unsubPrimary = onSnapshot(qPrimary, (snap) => {
            primaryDocs = snap.docs.map(doc => ({
                id: doc.id,
                _source: type === 'debt' ? 'debt' : (type === 'recurring' ? 'recurring' : 'regular'),
                collection: primaryCollection,
                ...doc.data()
            }));
            updateState();
        });

        // Secondary Listener (for income + recurring income)
        let unsubSecondary = () => { };
        if (secondaryCollection) {
            const qSecondary = query(collection(db, 'users', uid, secondaryCollection), orderBy('date', 'desc'), limit(50));
            unsubSecondary = onSnapshot(qSecondary, (snap) => {
                secondaryDocs = snap.docs.map(doc => ({
                    id: doc.id,
                    _source: 'recurring',
                    collection: secondaryCollection,
                    ...doc.data()
                }));
                updateState();
            });
        }

        return () => { unsubPrimary(); unsubSecondary(); };
    }, [type, currentDate]);

    const togglePaid = async (e: React.MouseEvent, item: any) => {
        e.stopPropagation();
        if (!auth.currentUser) return;
        const collectionName = item.collection;
        const docRef = doc(db, 'users', auth.currentUser.uid, collectionName, item.id);

        const isRecurring = collectionName?.includes('recurrentes');
        const isDebt = collectionName?.includes('prestamos');

        if (isRecurring || isDebt) {
            // Toggle for specific month
            const monthKey = `${currentDate.getFullYear()}-${currentDate.getMonth()}`;
            let paidMonths = item.paidMonths || [];
            const wasPaid = paidMonths.includes(monthKey);

            if (wasPaid) {
                paidMonths = paidMonths.filter((m: string) => m !== monthKey);
            } else {
                paidMonths = [...paidMonths, monthKey];
            }

            const updates: any = { paidMonths };

            // For loans, also update the remaining amount and quotas
            if (isDebt && item.debtSubtype === 'loan') {
                const amount = parseFloat(item.amount) || 0;
                const currentRemaining = parseFloat(item.remainingAmount) || 0;
                const currentQuotas = parseInt(item.paidQuotas) || 0;

                if (!wasPaid) {
                    updates.remainingAmount = Math.max(0, currentRemaining - amount).toString();
                    updates.paidQuotas = (currentQuotas + 1).toString();
                } else {
                    updates.remainingAmount = (currentRemaining + amount).toString();
                    updates.paidQuotas = Math.max(0, currentQuotas - 1).toString();
                }
            }

            await updateDoc(docRef, updates);
        } else {
            // Global toggle for regular items (legacy)
            await updateDoc(docRef, { paid: !item.paid });
        }
    };

    const handleDelete = async (item: any) => {
        if (!auth.currentUser) return;
        await deleteDoc(doc(db, 'users', auth.currentUser.uid, item.collection, item.id));
    };

    if (loading) return <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Cargando...</p>;
    if (transactions.length === 0) return <p style={{ textAlign: 'center', color: 'var(--text-tertiary)', marginTop: '20px' }}>No hay registros.</p>;

    const curNow = new Date();
    const mKey = `${currentDate.getFullYear()}-${currentDate.getMonth()}`;
    const isPastMonth = currentDate.getFullYear() < curNow.getFullYear() || (currentDate.getFullYear() === curNow.getFullYear() && currentDate.getMonth() < curNow.getMonth());
    const isCurrentMonth = currentDate.getFullYear() === curNow.getFullYear() && currentDate.getMonth() === curNow.getMonth();
    const isFutureMonth = currentDate.getFullYear() > curNow.getFullYear() || (currentDate.getFullYear() === curNow.getFullYear() && currentDate.getMonth() > curNow.getMonth());

    const totalAmount = transactions.reduce((acc, item) => {
        const amt = parseFloat(item.amount) || 0;
        if (item._source === 'recurring' || item._source === 'debt') {
            const isPaid = (item.paidMonths?.includes(mKey)) || (item.autoDebit && !isFutureMonth && (isPastMonth || (isCurrentMonth && curNow.getDate() >= (item.recurringDay || 1))));
            if (isPaid) return acc + amt;
            return acc;
        }
        return acc + amt;
    }, 0);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div className="premium-card" style={{
                background: 'var(--glass-bg)',
                border: '1px solid var(--glass-bg)',
                padding: '16px',
                marginBottom: '16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>Total {type === 'income' ? 'Ingresos' : 'Gastos'} {type === 'recurring' ? 'Fijos' : ''}</span>
                <span style={{ fontSize: '18px', fontWeight: '800', color: type === 'income' ? '#4ade80' : 'var(--text-primary)' }}>{currency.symbol} {totalAmount.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</span>
            </div>

            <AnimatePresence>
                {transactions.map((item) => (
                    <SwipeableItem
                        key={item.id}
                        item={item}
                        type={type}
                        currentDate={currentDate}
                        onEdit={setEditingItem}
                        onDelete={handleDelete}
                        togglePaid={togglePaid}
                        currency={currency}
                    />
                ))}
            </AnimatePresence>

            {editingItem && (
                <AddExpenseModal
                    onClose={() => setEditingItem(null)}
                    editItem={editingItem}
                    editType={editingItem.collection === 'ingresos' ? 'income' : 'expense'}
                    currency={currency}
                />
            )}
        </div>
    );
};

export default TransactionsList;
