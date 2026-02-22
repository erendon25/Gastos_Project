import React, { useEffect, useState } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, query, orderBy, limit, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { CATEGORIES } from '../lib/categories';
import { Edit2, Trash2 } from 'lucide-react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import AddExpenseModal from './AddExpenseModal';

const SwipeableRecentItem = ({ item, onEdit, onDelete }: { item: any; onEdit: (item: any) => void; onDelete: (id: string) => void }) => {
    const x = useMotionValue(0);

    const background = useTransform(
        x,
        [-100, 0, 100],
        ["#ef4444", "rgba(255, 255, 255, 0)", "#3b82f6"]
    );

    const opacityLeft = useTransform(x, [50, 100], [0, 1]);
    const opacityRight = useTransform(x, [-100, -50], [1, 0]);

    const categoryData = CATEGORIES.find(c => c.name === item.category) || CATEGORIES[CATEGORIES.length - 1];
    const Icon = categoryData.icon;

    const handleDragEnd = (_: any, info: any) => {
        if (info.offset.x > 80) {
            onEdit(item);
        } else if (info.offset.x < -80) {
            if (window.confirm('¿Eliminar este registro?')) {
                onDelete(item.id);
            }
        }
    };

    return (
        <div style={{ position: 'relative', overflow: 'hidden', borderRadius: '16px' }}>
            <motion.div style={{
                position: 'absolute', inset: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '0 20px', background, borderRadius: '16px'
            }}>
                <motion.div style={{ opacity: opacityLeft, display: 'flex', alignItems: 'center', gap: '8px', color: '#fff' }}>
                    <Edit2 size={16} /> <span style={{ fontWeight: 'bold', fontSize: '12px' }}>Editar</span>
                </motion.div>
                <motion.div style={{ opacity: opacityRight, display: 'flex', alignItems: 'center', gap: '8px', color: '#fff' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '12px' }}>Borrar</span> <Trash2 size={16} />
                </motion.div>
            </motion.div>

            <motion.div
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.5}
                onDragEnd={handleDragEnd}
                style={{ x }}
                className="premium-card"
                onClick={() => onEdit(item)}
                style={{
                    x,
                    padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    cursor: 'pointer', position: 'relative', touchAction: 'none'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                        width: '36px', height: '36px', borderRadius: '10px', background: `${categoryData.color}15`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <Icon size={16} color={categoryData.color} />
                    </div>
                    <div>
                        <p style={{ fontSize: '14px', fontWeight: 'bold' }}>{item.description || item.category}</p>
                        <p style={{ fontSize: '10px', color: '#666' }}>{item.category}</p>
                    </div>
                </div>
                <p style={{ fontWeight: 'bold', fontSize: '14px', color: 'var(--expense-color)' }}>
                    - S/ {parseFloat(item.amount).toFixed(2)}
                </p>
            </motion.div>
        </div>
    );
};

const RecentTransactions: React.FC = () => {
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingItem, setEditingItem] = useState<any>(null);

    useEffect(() => {
        if (!auth.currentUser) return;
        const q = query(collection(db, 'users', auth.currentUser.uid, 'expenses'), orderBy('date', 'desc'), limit(5));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleDelete = async (id: string) => {
        if (!auth.currentUser) return;
        await deleteDoc(doc(db, 'users', auth.currentUser.uid, 'expenses', id));
    };

    if (loading) return null;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <AnimatePresence>
                {transactions.map((item) => (
                    <SwipeableRecentItem key={item.id} item={item} onEdit={setEditingItem} onDelete={handleDelete} />
                ))}
            </AnimatePresence>

            {editingItem && (
                <AddExpenseModal onClose={() => setEditingItem(null)} editItem={editingItem} editType="expense" />
            )}
        </div>
    );
};

export default RecentTransactions;
