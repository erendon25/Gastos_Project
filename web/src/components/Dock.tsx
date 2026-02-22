import React from 'react';
import { Home, Wallet, Repeat, Landmark, TrendingUp } from 'lucide-react';

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
                height: '76px',
                padding: '0 8px',
                borderRadius: '24px'
            }}>
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <div
                            key={tab.id}
                            onClick={() => onChange(tab.id)}
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '6px',
                                cursor: 'pointer',
                                padding: '10px 4px',
                                borderRadius: '16px',
                                background: isActive ? 'rgba(255,255,255,0.08)' : 'transparent',
                                transition: 'all 0.2s ease',
                                flex: 1
                            }}
                        >
                            <Icon size={20} color={isActive ? '#ffffff' : '#555'} strokeWidth={isActive ? 2.5 : 2} />
                            <span style={{
                                fontSize: '9px',
                                color: isActive ? '#ffffff' : '#555',
                                fontWeight: isActive ? '700' : '500',
                                textAlign: 'center'
                            }}>
                                {tab.label}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default Dock;
