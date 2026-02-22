import React, { useEffect, useState } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, query, orderBy, limit, onSnapshot, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { CATEGORIES } from '../lib/categories';
import { CheckCircle, Circle, Calendar, AlertCircle, Info, Edit2, Trash2 } from 'lucide-react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import AddExpenseModal from './AddExpenseModal';

interface TransactionsListProps {
    type?: 'expense' | 'income' | 'recurring' | 'debt';
}

const SwipeableItem = ({ item, type, onEdit, onDelete, togglePaid }: { item: any; type: string; onEdit: (item: any) => void; onDelete: (id: string) => void; togglePaid: (e: any, item: any) => void }) => {
    const x = useMotionValue(0);

    // Transform background colors and icons based on drag direction
    const background = useTransform(
        x,
        [-100, 0, 100],
        ["#ef4444", "rgba(255, 255, 255, 0)", "#3b82f6"]
    );

    const opacityLeft = useTransform(x, [50, 100], [0, 1]);
    const opacityRight = useTransform(x, [-100, -50], [1, 0]);

    const categoryData = CATEGORIES.find(c => c.name === item.category) || CATEGORIES[CATEGORIES.length - 1];
    const Icon = categoryData.icon;
    const now = new Date();
    const dueDate = item.dueDate?.toDate();
    const isPastDue = type === 'debt' && !item.paid && dueDate && dueDate < now;

    const handleDragEnd = (_: any, info: any) => {
        if (info.offset.x > 100) {
            onEdit(item);
        } else if (info.offset.x < -100) {
            if (window.confirm('¿Eliminar este registro?')) {
                onDelete(item.id);
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
                <motion.div style={{ opacity: opacityLeft, display: 'flex', alignItems: 'center', gap: '8px', color: '#fff' }}>
                    <Edit2 size={20} /> <span style={{ fontWeight: 'bold', fontSize: '14px' }}>Editar</span>
                </motion.div>
                <motion.div style={{ opacity: opacityRight, display: 'flex', alignItems: 'center', gap: '8px', color: '#fff' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '14px' }}>Eliminar</span> <Trash2 size={20} />
                </motion.div>
            </motion.div>

            {/* Main Content Card */}
            <motion.div
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.7}
                onDragEnd={handleDragEnd}
                style={{ x }}
                className="premium-card"
                onClick={() => onEdit(item)}
                style={{
                    x,
                    margin: 0,
                    padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px',
                    background: item.paid === false ? (isPastDue ? 'rgba(239, 68, 68, 0.08)' : 'rgba(255, 255, 255, 0.02)') : '#161616',
                    border: '1px solid',
                    borderColor: item.paid === false ? (isPastDue ? '#ef4444' : 'rgba(255, 255, 255, 0.05)') : '#222',
                    cursor: 'pointer',
                    position: 'relative',
                    touchAction: 'none'
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        {(type === 'recurring' || type === 'debt') ? (
                            <div onClick={(e) => togglePaid(e, item)} style={{ cursor: 'pointer' }}>
                                {item.paid ? <CheckCircle size={24} color={type === 'debt' ? '#ef4444' : '#818cf8'} /> : <Circle size={24} color="#333" />}
                            </div>
                        ) : (
                            <div style={{
                                width: '44px', height: '44px', borderRadius: '14px', background: `${categoryData.color}20`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                <Icon size={20} color={categoryData.color} />
                            </div>
                        )}

                        <div>
                            <p style={{ fontSize: '15px', fontWeight: 'bold' }}>
                                {item.description || item.category}
                            </p>
                            <p style={{ fontSize: '11px', color: '#666' }}>{item.category}</p>
                        </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                        <p style={{
                            fontSize: '16px', fontWeight: '900',
                            color: item.paid === false ? (isPastDue ? '#ef4444' : '#666') : (type === 'income' ? 'var(--income-color)' : '#fff')
                        }}>
                            {type === 'income' ? '+' : '-'} S/ {parseFloat(item.amount).toFixed(2)}
                        </p>
                    </div>
                </div>

                {type === 'debt' && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.03)' }}>
                        {item.startDate && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.03)', padding: '4px 8px', borderRadius: '6px' }}>
                                <Info size={12} color="#666" />
                                <span style={{ fontSize: '10px', color: '#666' }}>Inició: {item.startDate.toDate().toLocaleDateString('es-PE')}</span>
                            </div>
                        )}
                        {item.dueDate && (
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '6px',
                                background: isPastDue ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255,255,255,0.03)',
                                padding: '4px 8px', borderRadius: '6px'
                            }}>
                                <Calendar size={12} color={isPastDue ? '#ef4444' : '#666'} />
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

const TransactionsList: React.FC<TransactionsListProps> = ({ type = 'expense' }) => {
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingItem, setEditingItem] = useState<any>(null);

    useEffect(() => {
        if (!auth.currentUser) return;
        setLoading(true);

        let collectionName = 'expenses';
        if (type === 'income') collectionName = 'income';
        if (type === 'recurring') collectionName = 'recurring_expenses';
        if (type === 'debt') collectionName = 'debts';

        const q = query(
            collection(db, 'users', auth.currentUser.uid, collectionName),
            orderBy('date', 'desc'),
            limit(20)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const docs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setTransactions(docs);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [type]);

    const togglePaid = async (e: React.MouseEvent, item: any) => {
        e.stopPropagation();
        if (!auth.currentUser) return;
        const collectionName = type === 'recurring' ? 'recurring_expenses' : 'debts';
        const docRef = doc(db, 'users', auth.currentUser.uid, collectionName, item.id);
        await updateDoc(docRef, { paid: !item.paid });
    };

    const handleDelete = async (id: string) => {
        if (!auth.currentUser) return;
        const collectionName = type === 'income' ? 'income' : (type === 'recurring' ? 'recurring_expenses' : (type === 'debt' ? 'debts' : 'expenses'));
        await deleteDoc(doc(db, 'users', auth.currentUser.uid, collectionName, id));
    };

    if (loading) return <p style={{ textAlign: 'center', color: '#666' }}>Cargando...</p>;
    if (transactions.length === 0) return <p style={{ textAlign: 'center', color: '#444', marginTop: '20px' }}>No hay registros.</p>;

    return (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
            <AnimatePresence>
                {transactions.map((item) => (
                    <SwipeableItem
                        key={item.id}
                        item={item}
                        type={type}
                        onEdit={setEditingItem}
                        onDelete={handleDelete}
                        togglePaid={togglePaid}
                    />
                ))}
            </AnimatePresence>

            {editingItem && (
                <AddExpenseModal
                    onClose={() => setEditingItem(null)}
                    editItem={editingItem}
                    editType={type}
                />
            )}
        </div>
    );
};

export default TransactionsList;
