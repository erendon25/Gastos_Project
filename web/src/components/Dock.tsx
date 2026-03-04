import React, { useRef, useEffect, useState } from 'react';
import { Home, Wallet, Repeat, Landmark, TrendingUp, Tv } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const navBgColor = 'var(--card-bg)';
const activeItemColor = '#fca311';
const activeIconColor = 'var(--bg-color)';
const inactiveIconColor = 'var(--text-secondary)';

const tabs = [
    { id: 'home', icon: Home, label: 'Inicio' },
    { id: 'expenses', icon: Wallet, label: 'Gastos' },
    { id: 'recurring', icon: Repeat, label: 'Fijos' },
    { id: 'subscriptions', icon: Tv, label: 'Digital' },
    { id: 'debts', icon: Landmark, label: 'Deudas' },
    { id: 'income', icon: TrendingUp, label: 'Ingresos' },
];

const Dock: React.FC<{ activeTab: string; onChange: (tab: string) => void }> = ({ activeTab, onChange }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [containerWidth, setContainerWidth] = useState(400);

    const activeIndex = tabs.findIndex(t => t.id === activeTab);
    const tabCount = tabs.length;

    useEffect(() => {
        const updateWidth = () => {
            if (containerRef.current) {
                setContainerWidth(containerRef.current.offsetWidth);
            }
        };
        updateWidth();
        window.addEventListener('resize', updateWidth);
        return () => window.removeEventListener('resize', updateWidth);
    }, []);

    // Re-calculate the exact center taking into account the flexbox padding '0 4px'
    const PADDING = 4;
    const innerWidth = containerWidth > 0 ? containerWidth - (PADDING * 2) : 400 - (PADDING * 2);
    const tabWidth = innerWidth / tabCount;
    const centerX = PADDING + (tabWidth * activeIndex) + (tabWidth / 2);

    // Calculates the perfect Apple-style smooth notch cutout for the mask
    const getCutoutPath = (cx: number) => {
        return [
            `M ${cx - 48} -10`,
            `L ${cx - 48} 0`,
            // Left curve dropping gracefully
            `C ${cx - 24} 0, ${cx - 28} 38, ${cx} 38`,
            // Right curve sweeping back up
            `C ${cx + 28} 38, ${cx + 24} 0, ${cx + 48} 0`,
            `L ${cx + 48} -10`,
            `Z`
        ].join(' ');
    };

    return (
        <div
            ref={containerRef}
            style={{
                position: 'fixed',
                bottom: 'calc(env(safe-area-inset-bottom, 0px) + 32px)',
                left: '50%',
                transform: 'translateX(-50%)',
                width: 'calc(100% - 32px)',
                maxWidth: '430px',
                height: '74px',
                zIndex: 50,
            }}
        >
            {/* SVG Background Layer defining the pill and the liquid hole cutout */}
            <svg
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    pointerEvents: 'none',
                    zIndex: 0
                }}
            >
                <defs>
                    <mask id="notch-mask">
                        {/* White keeps the background solid */}
                        <rect width="100%" height="100%" fill="white" />
                        {/* Black perfectly punches the animated liquid hole */}
                        <motion.path
                            initial={false}
                            animate={{ d: getCutoutPath(centerX) }}
                            transition={{ type: "spring", stiffness: 450, damping: 28 }}
                            fill="black"
                        />
                    </mask>
                </defs>
                {/* The beautifully rounded pill background */}
                <rect
                    width="100%"
                    height="100%"
                    rx="24"
                    fill={navBgColor}
                    mask="url(#notch-mask)"
                />
            </svg>

            {/* Content Layer (Tabs + Floating Icons) */}
            <div style={{
                position: 'relative',
                width: '100%',
                height: '100%',
                display: 'flex',
                justifyContent: 'space-around',
                alignItems: 'center',
                zIndex: 10,
                padding: '0 4px',
            }}>
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;

                    return (
                        <div
                            key={tab.id}
                            onClick={() => onChange(tab.id)}
                            style={{
                                position: 'relative',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flex: 1,
                                height: '100%',
                                cursor: 'pointer',
                                WebkitTapHighlightColor: 'transparent'
                            }}
                        >
                            {/* Floating Action Button purely animating Y-axis */}
                            <motion.div
                                animate={{
                                    y: isActive ? -34 : 0,
                                    scale: isActive ? 1.05 : 1
                                }}
                                transition={{ type: "spring", stiffness: 500, damping: 25 }}
                                style={{
                                    width: '48px',
                                    height: '48px',
                                    borderRadius: '50%',
                                    background: isActive ? activeItemColor : 'transparent',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    zIndex: 1,
                                    border: 'none',
                                    boxShadow: isActive ? `0 8px 16px ${activeItemColor}66` : 'none'
                                }}
                            >
                                <Icon
                                    size={isActive ? 22 : 22}
                                    color={isActive ? activeIconColor : inactiveIconColor}
                                    strokeWidth={isActive ? 2.5 : 2}
                                />
                            </motion.div>

                            {/* Animated Label */}
                            <AnimatePresence>
                                {isActive && (
                                    <motion.span
                                        initial={{ opacity: 0, y: 15 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 15 }}
                                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                        style={{
                                            position: 'absolute',
                                            bottom: '8px',
                                            fontSize: '10px',
                                            fontWeight: '800',
                                            color: 'var(--text-primary)',
                                            pointerEvents: 'none',
                                            letterSpacing: '0.2px'
                                        }}
                                    >
                                        {tab.label}
                                    </motion.span>
                                )}
                            </AnimatePresence>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default Dock;