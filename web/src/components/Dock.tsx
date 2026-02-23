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
            <div className="glass-dock" style={{
                display: 'flex',
                justifyContent: 'space-around',
                alignItems: 'center',
                height: '72px',
                padding: '0 8px',
                borderRadius: '24px',
                position: 'relative',
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                background: 'rgba(20, 20, 20, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.08)'
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
                                gap: '4px',
                                cursor: 'pointer',
                                padding: '10px 4px',
                                borderRadius: '16px',
                                position: 'relative',
                                transition: 'all 0.2s ease',
                                flex: 1,
                                zIndex: 1
                            }}
                        >
                            {isActive && (
                                <motion.div
                                    layoutId="activeTab"
                                    style={{
                                        position: 'absolute',
                                        inset: '4px',
                                        background: 'rgba(255, 255, 255, 0.08)',
                                        borderRadius: '16px',
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

