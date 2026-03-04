import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Check, X, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { getFunctions, httpsCallable } from 'firebase/functions';

const FEATURES = [
    { label: 'Gastos diarios', free: 'Máx. 10/mes', pro: 'Ilimitados' },
    { label: 'Gastos fijos', free: 'Máx. 3', pro: 'Ilimitados' },
    { label: 'Ingresos', free: 'Máx. 3', pro: 'Ilimitados' },
    { label: 'Suscripciones digitales', free: false, pro: true },
    { label: 'Débito automático', free: false, pro: true },
    { label: 'Gráfico visual de gastos', free: false, pro: true },
    { label: 'Meta de ahorro', free: true, pro: true },
    { label: 'Soporte prioritario', free: false, pro: true },
];

const ProBanner: React.FC = () => {
    const [expanded, setExpanded] = useState(false);
    const [loadingCheckout, setLoadingCheckout] = useState(false);
    const [checkoutError, setCheckoutError] = useState('');

    const handleUpgrade = async () => {
        setLoadingCheckout(true);
        setCheckoutError('');
        try {
            const functions = getFunctions();
            const createPreference = httpsCallable<object, { checkoutUrl: string }>(
                functions,
                'createPreference'
            );
            const result = await createPreference({});
            window.location.href = result.data.checkoutUrl;
        } catch (err: any) {
            console.error('MercadoPago error:', err);
            setCheckoutError('No se pudo iniciar el pago. Intenta de nuevo.');
            setLoadingCheckout(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            style={{
                borderRadius: '20px',
                overflow: 'hidden',
                background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1040 50%, #0a0a0a 100%)',
                border: '1px solid rgba(129, 140, 248, 0.3)',
                boxShadow: '0 0 40px rgba(99, 102, 241, 0.1), inset 0 1px 0 rgba(129,140,248,0.1)',
                position: 'relative',
            }}
        >
            {/* Background glow */}
            <div style={{
                position: 'absolute', top: '-40px', right: '-40px',
                width: '160px', height: '160px',
                background: 'radial-gradient(circle, rgba(129,140,248,0.15) 0%, transparent 70%)',
                borderRadius: '50%', pointerEvents: 'none'
            }} />

            <div style={{ padding: '20px' }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                            width: '36px', height: '36px', borderRadius: '10px',
                            background: 'linear-gradient(135deg, #818cf8, #6366f1)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 4px 12px rgba(99,102,241,0.4)'
                        }}>
                            <Zap size={18} color="#fff" fill="#fff" />
                        </div>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontSize: '16px', fontWeight: '800', color: '#fff' }}>FLUX PRO</span>
                                <span style={{
                                    fontSize: '9px', fontWeight: '700', color: '#818cf8',
                                    background: 'rgba(129,140,248,0.15)', padding: '2px 6px',
                                    borderRadius: '4px', letterSpacing: '1px', textTransform: 'uppercase'
                                }}>NUEVO</span>
                            </div>
                            <p style={{ fontSize: '11px', color: '#666', marginTop: '1px' }}>Desbloquea todo el potencial</p>
                        </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: '20px', fontWeight: '900', color: '#818cf8', lineHeight: 1 }}>S/5.00</p>
                        <p style={{ fontSize: '10px', color: '#555' }}>/mes</p>
                    </div>
                </div>

                {/* Benefit pills */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
                    {['Ilimitado', 'Gráficos', 'Auto-débito', 'Suscripciones'].map(b => (
                        <span key={b} style={{
                            fontSize: '11px', color: '#818cf8',
                            background: 'rgba(129,140,248,0.1)',
                            border: '1px solid rgba(129,140,248,0.2)',
                            borderRadius: '20px', padding: '4px 10px',
                            display: 'flex', alignItems: 'center', gap: '4px'
                        }}>
                            <Sparkles size={9} />{b}
                        </span>
                    ))}
                </div>

                {/* Error */}
                {checkoutError && (
                    <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', padding: '10px', marginBottom: '12px' }}>
                        <p style={{ color: '#ef4444', fontSize: '12px', textAlign: 'center' }}>{checkoutError}</p>
                    </div>
                )}

                {/* CTA Button */}
                <button
                    onClick={handleUpgrade}
                    disabled={loadingCheckout}
                    style={{
                        width: '100%', padding: '14px',
                        background: loadingCheckout ? 'rgba(99,102,241,0.5)' : 'linear-gradient(135deg, #818cf8 0%, #6366f1 100%)',
                        border: 'none', borderRadius: '14px',
                        color: '#fff', fontSize: '15px', fontWeight: '800',
                        cursor: loadingCheckout ? 'default' : 'pointer',
                        boxShadow: '0 8px 24px rgba(99,102,241,0.4)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                        transition: 'all 0.15s ease',
                    }}
                >
                    {loadingCheckout ? (
                        <>
                            <div style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                            Abriendo pago...
                        </>
                    ) : (
                        <>
                            <Zap size={16} fill="#fff" />
                            ¡Vuélvete PRO — S/5.00/mes!
                        </>
                    )}
                </button>

                {/* Toggle comparison */}
                <button
                    onClick={() => setExpanded(e => !e)}
                    style={{
                        width: '100%', background: 'none', border: 'none',
                        color: '#555', fontSize: '12px', cursor: 'pointer',
                        marginTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px'
                    }}
                >
                    {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    {expanded ? 'Ocultar comparativa' : 'Ver qué incluye PRO'}
                </button>
            </div>

            {/* Feature comparison */}
            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        style={{ overflow: 'hidden' }}
                    >
                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '16px 20px 20px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 72px 72px', gap: '8px', marginBottom: '10px' }}>
                                <span style={{ fontSize: '11px', color: '#444', fontWeight: '600', textTransform: 'uppercase' }}>Función</span>
                                <span style={{ fontSize: '11px', color: '#444', fontWeight: '600', textAlign: 'center' }}>Free</span>
                                <span style={{ fontSize: '11px', color: '#818cf8', fontWeight: '700', textAlign: 'center' }}>PRO</span>
                            </div>

                            {FEATURES.map((f, i) => (
                                <div key={i} style={{
                                    display: 'grid', gridTemplateColumns: '1fr 72px 72px', gap: '8px',
                                    padding: '9px 10px', borderRadius: '10px',
                                    background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent',
                                    alignItems: 'center'
                                }}>
                                    <span style={{ fontSize: '12px', color: '#ccc' }}>{f.label}</span>
                                    <div style={{ textAlign: 'center' }}>
                                        {f.free === false
                                            ? <X size={14} color="#333" style={{ margin: '0 auto' }} />
                                            : f.free === true
                                                ? <Check size={14} color="#4ade80" style={{ margin: '0 auto' }} />
                                                : <span style={{ fontSize: '10px', color: '#555' }}>{f.free}</span>
                                        }
                                    </div>
                                    <div style={{ textAlign: 'center' }}>
                                        {f.pro === true
                                            ? <Check size={14} color="#818cf8" style={{ margin: '0 auto' }} />
                                            : <span style={{ fontSize: '10px', color: '#818cf8', fontWeight: '600' }}>{f.pro}</span>
                                        }
                                    </div>
                                </div>
                            ))}

                            <button
                                onClick={handleUpgrade}
                                disabled={loadingCheckout}
                                style={{
                                    width: '100%', padding: '12px', marginTop: '16px',
                                    background: 'linear-gradient(135deg, #818cf8 0%, #6366f1 100%)',
                                    border: 'none', borderRadius: '12px',
                                    color: '#fff', fontSize: '14px', fontWeight: '800',
                                    cursor: 'pointer', boxShadow: '0 4px 16px rgba(99,102,241,0.4)'
                                }}
                            >
                                Suscribirme por S/5.00/mes
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </motion.div>
    );
};

export default ProBanner;
