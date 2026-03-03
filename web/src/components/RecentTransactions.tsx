import React, { useEffect, useState } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, query, orderBy, limit, onSnapshot, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { CATEGORIES } from '../lib/categories';
import { Edit2, Trash2, TrendingUp, CheckCircle, Circle } from 'lucide-react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import AddExpenseModal from './AddExpenseModal';

const SwipeableRecentItem = ({ item, currentDate, onEdit, onDelete, onTogglePaid, onNavigate, currency = { code: 'PEN', symbol: 'S/' } }: { item: any; currentDate: Date; onEdit: (item: any) => void; onDelete: (item: any) => void; onTogglePaid: (e: any, item: any) => void; onNavigate?: (view: string) => void; currency?: { code: string, symbol: string } }) => {
    const x = useMotionValue(0);
    const background = useTransform(x, [-100, 0, 100], ["#ef4444", "rgba(255, 255, 255, 0)", "#3b82f6"]);
    const opacityLeft = useTransform(x, [50, 100], [0, 1]);
    const opacityRight = useTransform(x, [-100, -50], [1, 0]);

    const isIncome = item.collection?.includes('ingresos') ||
        item.type === 'income' ||
        item.category === 'Ingresos' ||
        item.description?.toLowerCase().includes('sueldo');

    const monthKey = `${currentDate.getFullYear()}-${currentDate.getMonth()}`;
    const isPaid = (item.collection?.includes('recurrentes'))
        ? (item.autoDebit || (item.paidMonths && item.paidMonths.includes(monthKey)))
        : item.paid;

    const systemIncomeCat = CATEGORIES.find(c => c.id === 'ingresos');
    const categoryData = (isIncome && !item.isUserCat)
        ? systemIncomeCat
        : (CATEGORIES.find(c => c.name === item.category) || (isIncome ? systemIncomeCat : CATEGORIES[0]));
    const Icon = categoryData?.icon || TrendingUp;

    const handleDragEnd = (_: any, info: any) => {
        if (info.offset.x > 80) onEdit(item);
        else if (info.offset.x < -80) {
            if (window.confirm('¿Eliminar este registro?')) onDelete(item);
        }
    };

    return (
        <div style={{ position: 'relative', overflow: 'hidden', borderRadius: '16px' }}>
            <motion.div style={{ position: 'absolute', inset: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 20px', background, borderRadius: '16px' }}>
                <motion.div style={{ opacity: opacityLeft, display: 'flex', alignItems: 'center', gap: '8px', color: '#fff' }}><Edit2 size={16} /> <span style={{ fontWeight: 'bold', fontSize: '12px' }}>Editar</span></motion.div>
                <motion.div style={{ opacity: opacityRight, display: 'flex', alignItems: 'center', gap: '8px', color: '#fff' }}><span style={{ fontWeight: 'bold', fontSize: '12px' }}>Borrar</span> <Trash2 size={16} /></motion.div>
            </motion.div>

            <motion.div
                drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.5} onDragEnd={handleDragEnd}
                className="premium-card" onClick={() => {
                    const target = item.collection?.includes('ingresos') ? 'income' :
                        item.collection?.includes('recurrentes') ? 'recurring' : 'expenses';
                    onNavigate?.(target);
                }}
                style={{ x, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', position: 'relative', touchAction: 'none' }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div onClick={(e) => { e.stopPropagation(); onTogglePaid(e, item); }} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                        {item.collection?.includes('recurrentes') ? (
                            isPaid ? <CheckCircle size={20} color={isIncome ? '#4ade80' : '#818cf8'} /> : <Circle size={20} color="#333" />
                        ) : (
                            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: `${categoryData?.color || '#333'}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
                                {item.categoryEmoji ? <span>{item.categoryEmoji}</span> : (isIncome ? <TrendingUp size={16} color="#4ade80" /> : <Icon size={16} color={categoryData?.color || '#333'} />)}
                            </div>
                        )}
                    </div>
                    <div>
                        <p style={{ fontSize: '14px', fontWeight: 'bold', color: isPaid === false && item.collection?.includes('recurrentes') ? '#666' : '#fff' }}>{item.description || item.category}</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <p style={{ fontSize: '10px', color: '#666' }}>{item.category === 'Casa' && isIncome ? 'Ingresos' : item.category}</p>
                            <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)' }}>•</span>
                            <p style={{ fontSize: '10px', color: '#444' }}>
                                {item.date?.toDate().toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })} • {item.date?.toDate().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                        </div>
                    </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <p style={{ fontWeight: 'bold', fontSize: '14px', color: isPaid === false && item.collection?.includes('recurrentes') ? '#333' : (isIncome ? 'var(--income-color)' : '#fff') }}>
                        {isIncome ? '+' : '-'} {currency.symbol} {parseFloat(item.amount).toFixed(2)}
                    </p>
                </div>
            </motion.div>
        </div>
    );
};

const RecentTransactions: React.FC<{ onNavigate?: (view: string) => void; currency?: { code: string, symbol: string } }> = ({ onNavigate, currency = { code: 'PEN', symbol: 'S/' } }) => {
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingItem, setEditingItem] = useState<any>(null);

    useEffect(() => {
        if (!auth.currentUser) return;

        const uid = auth.currentUser.uid;

        const qExp = query(collection(db, 'users', uid, 'gastos'), orderBy('date', 'desc'), limit(10));
        const qInc = query(collection(db, 'users', uid, 'ingresos'), orderBy('date', 'desc'), limit(10));
        const qExpRec = query(collection(db, 'users', uid, 'gastos_recurrentes'), orderBy('date', 'desc'), limit(10));
        const qIncRec = query(collection(db, 'users', uid, 'ingresos_recurrentes'), orderBy('date', 'desc'), limit(10));

        let data: Record<string, any[]> = { gastos: [], ingresos: [], gastos_recurrentes: [], ingresos_recurrentes: [] };

        const updateState = () => {
            const merged = Object.values(data).flat()
                .sort((a, b) => {
                    const dateA = a.date?.seconds || 0;
                    const dateB = b.date?.seconds || 0;
                    return dateB - dateA;
                })
                .slice(0, 5);
            setTransactions(merged);
            setLoading(false);
        };

        const unsubExp = onSnapshot(qExp, (snap) => {
            data.gastos = snap.docs.map(doc => ({ id: doc.id, collection: 'gastos', ...doc.data() }));
            updateState();
        });

        const unsubInc = onSnapshot(qInc, (snap) => {
            data.ingresos = snap.docs.map(doc => ({ id: doc.id, collection: 'ingresos', ...doc.data() }));
            updateState();
        });

        const unsubExpRec = onSnapshot(qExpRec, (snap) => {
            data.gastos_recurrentes = snap.docs.map(doc => ({ id: doc.id, collection: 'gastos_recurrentes', ...doc.data() }));
            updateState();
        });

        const unsubIncRec = onSnapshot(qIncRec, (snap) => {
            data.ingresos_recurrentes = snap.docs.map(doc => ({ id: doc.id, collection: 'ingresos_recurrentes', ...doc.data() }));
            updateState();
        });

        return () => { unsubExp(); unsubInc(); unsubExpRec(); unsubIncRec(); };
    }, []);

    const handleDelete = async (item: any) => {
        if (!auth.currentUser) return;
        await deleteDoc(doc(db, 'users', auth.currentUser.uid, item.collection, item.id));
    };

    const togglePaid = async (e: any, item: any) => {
        e.stopPropagation();
        if (!auth.currentUser) return;
        const collectionName = item.collection;
        const docRef = doc(db, 'users', auth.currentUser.uid, collectionName, item.id);

        const isRecurring = collectionName?.includes('recurrentes');

        if (isRecurring) {
            const now = new Date();
            const monthKey = `${now.getFullYear()}-${now.getMonth()}`;
            let paidMonths = item.paidMonths || [];
            if (paidMonths.includes(monthKey)) {
                paidMonths = paidMonths.filter((m: string) => m !== monthKey);
            } else {
                paidMonths = [...paidMonths, monthKey];
            }
            await updateDoc(docRef, { paidMonths });
        } else {
            await updateDoc(docRef, { paid: !item.paid });
        }
    };

    if (loading) return null;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <AnimatePresence>
                {transactions.map((item) => (
                    <SwipeableRecentItem
                        key={item.id}
                        item={item}
                        currentDate={new Date()}
                        onEdit={setEditingItem}
                        onDelete={handleDelete}
                        onTogglePaid={togglePaid}
                        onNavigate={onNavigate}
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


export default RecentTransactions;
