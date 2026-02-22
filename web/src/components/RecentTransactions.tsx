import React, { useEffect, useState } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { Repeat } from 'lucide-react';

const RecentTransactions: React.FC = () => {
    const [transactions, setTransactions] = useState<any[]>([]);

    useEffect(() => {
        if (!auth.currentUser) return;

        // Listen to normal expenses
        const qExp = query(
            collection(db, 'users', auth.currentUser.uid, 'expenses'),
            orderBy('date', 'desc'),
            limit(10)
        );

        // Listen to recurring expenses
        const qRec = query(
            collection(db, 'users', auth.currentUser.uid, 'recurring_expenses'),
            orderBy('date', 'desc'),
            limit(10)
        );

        let allTrans: any[] = [];

        const unsubExp = onSnapshot(qExp, (snapshot) => {
            const expDocs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                type: 'expense',
                isRecurring: false
            }));
            updateList(expDocs, 'expense');
        });

        const unsubRec = onSnapshot(qRec, (snapshot) => {
            const recDocs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                type: 'expense',
                isRecurring: true
            }));
            updateList(recDocs, 'recurring');
        });

        const updateList = (newDocs: any[], group: string) => {
            setTransactions(prev => {
                const otherGroup = prev.filter(t => group === 'expense' ? t.isRecurring : !t.isRecurring);
                const combined = [...otherGroup, ...newDocs];
                // Sort by date descending
                return combined.sort((a, b) => {
                    const dateA = a.date?.toDate() || new Date(0);
                    const dateB = b.date?.toDate() || new Date(0);
                    return dateB - dateA;
                }).slice(0, 10);
            });
        };

        return () => { unsubExp(); unsubRec(); };
    }, []);

    if (transactions.length === 0) {
        return <p style={{ color: '#444', fontSize: '14px', textAlign: 'center' }}>No hay registros aún.</p>;
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {transactions.map((item) => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid #111' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            width: '36px', height: '36px', borderRadius: '10px',
                            background: item.isRecurring ? 'rgba(129, 138, 248, 0.1)' : '#1a1a1a',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            {item.isRecurring ? <Repeat size={16} color="#818cf8" /> : <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#666' }} />}
                        </div>
                        <div>
                            <p style={{ fontSize: '14px', fontWeight: '500' }}>{item.description || item.category}</p>
                            <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                {item.category} • {item.date?.toDate().toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                                {item.isRecurring && " • Recurrente"}
                            </p>
                        </div>
                    </div>
                    <p style={{ fontSize: '14px', fontWeight: 'bold', color: item.type === 'expense' ? 'var(--expense-color)' : 'var(--income-color)' }}>
                        - S/ {item.amount.toFixed(2)}
                    </p>
                </div>
            ))}
        </div>
    );
};

export default RecentTransactions;
