import React, { useEffect, useState } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, query, orderBy, limit, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { CATEGORIES } from '../lib/categories';
import { CheckCircle, Circle, Calendar, AlertCircle, Info } from 'lucide-react';

interface TransactionsListProps {
    type?: 'expense' | 'income' | 'recurring' | 'debt';
}

const TransactionsList: React.FC<TransactionsListProps> = ({ type }) => {
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

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

    const togglePaid = async (item: any) => {
        if (!auth.currentUser) return;
        const collectionName = type === 'recurring' ? 'recurring_expenses' : 'debts';
        const docRef = doc(db, 'users', auth.currentUser.uid, collectionName, item.id);
        await updateDoc(docRef, { paid: !item.paid });
    };

    if (loading) return <p style={{ textAlign: 'center', color: '#666' }}>Cargando...</p>;
    if (transactions.length === 0) return <p style={{ textAlign: 'center', color: '#444', marginTop: '20px' }}>No hay registros.</p>;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {transactions.map((item) => {
                const categoryData = CATEGORIES.find(c => c.name === item.category) || CATEGORIES[CATEGORIES.length - 1];
                const Icon = categoryData.icon;

                // Full date comparison
                const now = new Date();
                const dueDate = item.dueDate?.toDate();
                const isPastDue = type === 'debt' && !item.paid && dueDate && dueDate < now;

                return (
                    <div key={item.id} className="premium-card" style={{
                        padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px',
                        background: item.paid === false ? (isPastDue ? 'rgba(239, 68, 68, 0.08)' : 'rgba(255, 255, 255, 0.02)') : '#161616',
                        border: '1px solid',
                        borderColor: item.paid === false ? (isPastDue ? '#ef4444' : 'rgba(255, 255, 255, 0.05)') : '#222',
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                {(type === 'recurring' || type === 'debt') ? (
                                    <div onClick={() => togglePaid(item)} style={{ cursor: 'pointer' }}>
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
                                    <p style={{ fontSize: '15px', fontWeight: 'bold', color: item.paid === false && !isPastDue ? '#ccc' : '#fff' }}>
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
                                {item.paid === false && isPastDue && (
                                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <AlertCircle size={12} color="#ef4444" />
                                        <span style={{ fontSize: '10px', color: '#ef4444', fontWeight: '900' }}>VENCIDO</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

export default TransactionsList;
