import React from 'react';
import { Home, Wallet, Repeat, Landmark, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

const Dock: React.FC<{ activeTab: string; onChange: (tab: string) => void }> = ({ activeTab, onChange }) => {
    const tabs = [
        { id: 'home', icon: Home, label: 'Inicio' },
        { id: 'expenses', icon: Wallet, label: 'Gastos' },
        { id: 'recurring', icon: Repeat, label: 'Fijos' },
        { id: 'debts', icon: Landmark, label: 'Deudas' },
        { id: 'income', icon: TrendingUp, label: 'Ingresos' },
    ];

    return (
        <div style={{
            position: 'fixed',
            bottom: '16px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 999,
            width: 'calc(100% - 20px)',
            maxWidth: '430px'
        }}>
            <div className="glass-dock liquid-glass" style={{
                display: 'flex',
                justifyContent: 'space-around',
                alignItems: 'center',
                height: '72px',
                padding: '0 8px',
                borderRadius: '24px',
                position: 'relative'
            }}>
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <motion.div
                            key={tab.id}
                            onClick={() => onChange(tab.id)}
                            whileTap={{ scale: 0.9 }}
                            whileHover={{ scale: 1.05 }}
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '4px',
                                cursor: 'pointer',
                                padding: '8px 4px',
                                borderRadius: '18px',
                                position: 'relative',
                                transition: 'all 0.2s ease',
                                flex: 1,
                                height: '56px',
                                zIndex: 1
                            }}
                        >
                            {isActive && (
                                <motion.div
                                    layoutId="activeTab"
                                    className="liquid-glass-inner"
                                    style={{
                                        position: 'absolute',
                                        inset: '4px',
                                        borderRadius: '22px',
                                        zIndex: -1,
                                    }}
                                    transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                                />
                            )}
                            <motion.div
                                animate={{
                                    y: isActive ? -2 : 0,
                                    color: isActive ? '#ffffff' : '#555'
                                }}
                            >
                                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                            </motion.div>
                            <span style={{
                                fontSize: '9px',
                                color: isActive ? '#ffffff' : '#555',
                                fontWeight: isActive ? '700' : '500',
                                textAlign: 'center'
                            }}>
                                {tab.label}
                            </span>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
};

export default Dock;

