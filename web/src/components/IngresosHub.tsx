import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, Repeat, Briefcase } from 'lucide-react';
import TransactionsList from './TransactionsList';
import WalletsManager from './WalletsManager';
import MonthNavigator from './MonthNavigator';

interface IngresosHubProps {
    currentDate: Date;
    changeMonth: (offset: number) => void;
    currency?: { code: string; symbol: string };
    user?: any;
    onUpgrade?: () => void;
}

const SUBTABS = [
    { id: 'income', label: 'Variables', Icon: TrendingUp, color: '#4ade80' },
    { id: 'recurring_income', label: 'Fijos', Icon: Repeat, color: '#22c55e' },
    { id: 'wallets', label: 'Billeteras', Icon: Briefcase, color: '#34d399' },
];

const SUBTAB_DESCRIPTIONS: Record<string, string> = {
    income: 'Tus entradas de dinero variables.',
    recurring_income: 'Salarios y entradas periódicas.',
    wallets: 'Saldo disponible por cuenta.',
};

const IngresosHub: React.FC<IngresosHubProps> = ({ currentDate, changeMonth, currency, user, onUpgrade }) => {
    const [activeSubTab, setActiveSubTab] = useState(0);

    const handleDragEnd = (_: any, info: any) => {
        const delta = info.offset.x;
        if (delta < -60 && activeSubTab < SUBTABS.length - 1) {
            setActiveSubTab(prev => prev + 1);
        } else if (delta > 60 && activeSubTab > 0) {
            setActiveSubTab(prev => prev - 1);
        }
    };

    const current = SUBTABS[activeSubTab];
    const needsMonthNav = current.id !== 'wallets';

    return (
        <div style={{ display: 'flex', flexDirection: 'column', paddingTop: '24px', minHeight: '100%' }}>
            {/* Header */}
            <div style={{ padding: '0 20px', marginBottom: '16px' }}>
                <h2 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '2px' }}>Ingresos</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{SUBTAB_DESCRIPTIONS[current.id]}</p>
            </div>

            {/* Pill sub-tabs */}
            <div style={{ padding: '0 20px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', background: 'var(--glass-bg)', borderRadius: '16px', padding: '4px', gap: '4px' }}>
                    {SUBTABS.map((tab, i) => {
                        const isActive = activeSubTab === i;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveSubTab(i)}
                                style={{
                                    flex: 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '5px',
                                    padding: '9px 6px',
                                    borderRadius: '12px',
                                    border: 'none',
                                    background: isActive ? tab.color : 'transparent',
                                    color: isActive ? '#0f2920' : 'var(--text-secondary)',
                                    fontWeight: isActive ? '700' : '500',
                                    fontSize: '11px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                <tab.Icon size={13} />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Month navigator (only for transaction views) */}
            {needsMonthNav && <MonthNavigator currentDate={currentDate} onChange={changeMonth} />}

            {/* Swipeable content */}
            <div style={{ flex: 1, overflow: 'hidden' }}>
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeSubTab}
                        drag="x"
                        dragConstraints={{ left: 0, right: 0 }}
                        dragElastic={0.15}
                        onDragEnd={handleDragEnd}
                        initial={{ opacity: 0, x: 40 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -40 }}
                        transition={{ duration: 0.2 }}
                        style={{ padding: '0 20px 24px 20px', cursor: 'grab', touchAction: 'pan-y' }}
                        whileTap={{ cursor: 'grabbing' }}
                    >
                        {current.id === 'wallets' ? (
                            <WalletsManager currency={currency} user={user} onUpgrade={onUpgrade} />
                        ) : (
                            <TransactionsList
                                type={current.id as 'income' | 'recurring_income'}
                                currentDate={currentDate}
                                currency={currency}
                            />
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Swipe hint dots */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', paddingBottom: '16px' }}>
                {SUBTABS.map((_, i) => (
                    <div key={i} onClick={() => setActiveSubTab(i)} style={{ width: activeSubTab === i ? '20px' : '6px', height: '6px', borderRadius: '100px', background: activeSubTab === i ? SUBTABS[activeSubTab].color : 'var(--glass-border)', transition: 'all 0.3s', cursor: 'pointer' }} />
                ))}
            </div>
        </div>
    );
};

export default IngresosHub;
