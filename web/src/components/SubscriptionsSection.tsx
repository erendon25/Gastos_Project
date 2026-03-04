import React, { useEffect, useState } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { Tv, Trash2, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import AddExpenseModal from './AddExpenseModal';
import { SERVICE_LOGOS, isSubscriptionItem } from '../lib/subscriptionUtils';

interface Subscription {
    id: string;
    amount: number;
    description: string;
    category: string;
    categoryEmoji?: string;
    recurringDay: number;
    autoDebit: boolean;
    paidMonths?: string[];
    serviceType?: string; // e.g., 'netflix', 'spotify', etc.
}


const SubscriptionsSection: React.FC<{ currentDate: Date; user?: any; onUpgrade?: () => void; currency?: { code: string, symbol: string } }> = ({ currentDate, user, onUpgrade, currency = { code: 'PEN', symbol: 'S/' } }) => {
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingItem, setEditingItem] = useState<any>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const isPro = user?.isPro || false;

    useEffect(() => {
        if (!auth.currentUser) return;
        setLoading(true);

        const uid = auth.currentUser.uid;
        // We look in gastos_recurrentes because digital subscriptions are recurring expenses
        const q = query(collection(db, 'users', uid, 'gastos_recurrentes'), orderBy('date', 'desc'));

        const unsub = onSnapshot(q, (snap) => {
            const fiscalEnd = new Date(currentDate.getFullYear(), currentDate.getMonth(), 24, 23, 59, 59);

            const docs = snap.docs.map(doc => {
                const data = doc.data();
                // Identify if it's a digital subscription
                const isSubscription = isSubscriptionItem(data);

                return {
                    id: doc.id,
                    ...data,
                    isSubscription
                } as any;
            });

            // Filter only subscriptions created before the end of the fiscal month
            setSubscriptions(docs.filter(d => {
                const subDate = d.date?.toDate();
                return d.isSubscription && (!subDate || subDate <= fiscalEnd);
            }));
            setLoading(false);
        });

        return () => unsub();
    }, [currentDate]);

    const handleDelete = async (id: string) => {
        if (!auth.currentUser) return;
        if (window.confirm('¿Eliminar esta suscripción?')) {
            await deleteDoc(doc(db, 'users', auth.currentUser.uid, 'gastos_recurrentes', id));
        }
    };

    const getServiceStyle = (description: string) => {
        const desc = description.toLowerCase();
        for (const [_, style] of Object.entries(SERVICE_LOGOS)) {
            if (style.keywords.some(k => desc.includes(k))) {
                return style;
            }
        }
        return { emoji: '📱', color: 'var(--glass-border)' };
    };

    if (loading) return <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>Cargando suscripciones...</div>;

    const monthKey = `${currentDate.getFullYear()}-${currentDate.getMonth()}`;
    const now = new Date();
    const isCurrentMonth = currentDate.getMonth() === now.getMonth() && currentDate.getFullYear() === now.getFullYear();
    const isPastMonth = currentDate.getFullYear() < now.getFullYear() || (currentDate.getFullYear() === now.getFullYear() && currentDate.getMonth() < now.getMonth());

    const handleAddClick = (draft?: any) => {
        if (!isPro && subscriptions.length >= 3) {
            if (onUpgrade) onUpgrade();
            return;
        }
        if (draft) setEditingItem(draft);
        else setShowAddModal(true);
    };

    return (
        <div style={{ padding: '0 20px 24px 20px' }}>
            {!isPro && (
                <>
                    <div style={{
                        background: 'linear-gradient(135deg, #818cf815 0%, #818cf805 100%)',
                        border: '1px solid rgba(129, 138, 248, 0.2)',
                        borderRadius: '20px',
                        padding: '16px',
                        marginBottom: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                    }}>
                        <div style={{ background: '#818cf8', borderRadius: '10px', padding: '8px', color: 'var(--accent-color)' }}>
                            <Zap size={20} fill="currentColor" />
                        </div>
                        <div>
                            <p style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--text-primary)' }}>Flux PRO</p>
                            <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Las suscripciones automáticas son para usuarios PRO. Tus registros se guardarán como gastos simples.</p>
                        </div>
                    </div>
                    <button style={{
                        width: '100%',
                        padding: '14px',
                        background: 'white',
                        color: 'black',
                        borderRadius: '16px',
                        fontWeight: '800',
                        fontSize: '13px',
                        marginBottom: '24px',
                        border: 'none',
                        cursor: 'pointer'
                    }}
                        onClick={onUpgrade}
                    >
                        PASAR A PRO ✨
                    </button>
                </>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                {subscriptions.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 20px', background: 'var(--glass-bg)', borderRadius: '24px', border: '1px dashed #333' }}>
                        <Tv size={48} color="#333" style={{ marginBottom: '16px' }} />
                        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>No tienes suscripciones registradas.</p>
                        <button
                            onClick={() => handleAddClick()}
                            style={{ marginTop: '16px', padding: '10px 20px', borderRadius: '12px', background: 'var(--glass-border)', color: 'var(--text-primary)', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}
                        >
                            Agregar la primera
                        </button>
                    </div>
                ) : (
                    subscriptions.map((sub) => {
                        const style = getServiceStyle(sub.description);
                        let isAutoPaid = false;
                        if (sub.autoDebit) {
                            if (isPastMonth) isAutoPaid = true;
                            else if (isCurrentMonth) isAutoPaid = now.getDate() >= (sub.recurringDay || 1);
                        }
                        const isPaid = isAutoPaid || (sub.paidMonths && sub.paidMonths.includes(monthKey));

                        return (
                            <motion.div
                                key={sub.id}
                                layout
                                onClick={() => setEditingItem(sub)}
                                style={{
                                    background: isPaid ? 'var(--card-bg)' : 'var(--glass-bg)',
                                    border: '1px solid',
                                    borderColor: isPaid ? 'var(--border-color)' : 'var(--glass-bg)',
                                    borderRadius: '20px',
                                    padding: '16px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    cursor: 'pointer'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                    <div style={{
                                        width: '48px',
                                        height: '48px',
                                        borderRadius: '14px',
                                        background: `${style.color}15`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '24px',
                                        border: `1px solid ${style.color}30`
                                    }}>
                                        {style.emoji}
                                    </div>

                                    <div>
                                        <p style={{ fontSize: '15px', fontWeight: 'bold' }}>{sub.description}</p>
                                        <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Día {sub.recurringDay}</p>
                                    </div>
                                </div>

                                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDelete(sub.id);
                                            }}
                                            style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '4px' }}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                    <p style={{ fontSize: '16px', fontWeight: '900', color: isPaid ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                                        {currency.symbol} {parseFloat(sub.amount.toString()).toFixed(2)}
                                    </p>
                                    <span style={{ fontSize: '9px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Mensual</span>
                                </div>
                            </motion.div>
                        );
                    })
                )}
            </div>

            {/* Quick add suggestions */}
            {
                subscriptions.length > 0 && (
                    <div style={{ marginTop: '32px' }}>
                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 'bold', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '1px' }}>Sugerencias</p>
                        <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '10px' }}>
                            {Object.entries(SERVICE_LOGOS).map(([name, style]) => (
                                <button
                                    key={name}
                                    onClick={() => {
                                        handleAddClick({
                                            description: name.charAt(0).toUpperCase() + name.slice(1),
                                            category: 'Ocio',
                                            amount: '',
                                            recurringDay: new Date().getDate(),
                                            autoDebit: true
                                        });
                                    }}
                                    style={{
                                        flexShrink: 0,
                                        padding: '12px 20px',
                                        borderRadius: '16px',
                                        background: 'var(--glass-bg)',
                                        border: '1px solid var(--glass-border)',
                                        color: 'var(--text-primary)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <span>{style.emoji}</span>
                                    <span style={{ fontSize: '13px', fontWeight: 'bold' }}>{name.charAt(0).toUpperCase() + name.slice(1)}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )
            }

            {
                (editingItem || showAddModal) && (
                    <AddExpenseModal
                        onClose={() => {
                            setEditingItem(null);
                            setShowAddModal(false);
                        }}
                        editItem={editingItem?.id ? editingItem : null}
                        draftData={!editingItem?.id ? editingItem : null}
                        editType="recurring"
                        presetCategory="Ocio"
                        user={user}
                    />
                )
            }
        </div >
    );
};

export default SubscriptionsSection;
