import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Zap, Check } from 'lucide-react';

interface UpgradeModalProps {
    onClose: () => void;
}

declare global {
    interface Window {
        MercadoPago: any;
    }
}

const UpgradeModal: React.FC<UpgradeModalProps> = ({ onClose }) => {
    const [loading, setLoading] = useState(false);

    const handleUpgrade = async () => {
        setLoading(true);
        // Directamente utilizamos el link de pago ya que MercadoPago bloquea CORS en Frontend
        // y usar el ACCESS TOKEN acá es una vulnerabilidad de seguridad grave.
        setTimeout(() => {
            window.open('https://mpago.la/1M4ZuPH', '_blank', 'noopener,noreferrer');
            setLoading(false);
        }, 600); // Pequeño delay visual para mejor UX
    };

    const plan = {
        name: 'Flux PRO',
        price: 'S/ 5.00',
        period: 'pago único',
        features: [
            'Categorías ilimitadas',
            'Suscripciones automáticas',
            'Deudas y préstamos ilimitados',
            'Reportes avanzados PDF',
            'Soporte prioritario',
            'Acceso de por vida'
        ],
        buttonText: 'MEJORAR AHORA'
    };

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 3000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
        }}>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(0,0,0,0.9)',
                    backdropFilter: 'blur(8px)'
                }}
            />

            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                style={{
                    position: 'relative',
                    width: '100%',
                    maxWidth: '400px',
                    background: 'var(--card-bg-light)',
                    borderRadius: '32px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    overflow: 'hidden',
                    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
                }}
            >
                <div style={{
                    height: '140px',
                    background: 'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative'
                }}>
                    <button
                        onClick={onClose}
                        style={{
                            position: 'absolute',
                            top: '16px',
                            right: '16px',
                            background: 'rgba(0,0,0,0.2)',
                            border: 'none',
                            borderRadius: '50%',
                            width: '32px',
                            height: '32px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--text-primary)',
                            cursor: 'pointer'
                        }}
                    >
                        <X size={18} />
                    </button>
                    <div style={{
                        width: '80px',
                        height: '80px',
                        background: 'var(--bg-color)',
                        borderRadius: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
                    }}>
                        <Zap size={40} color="#fbbf24" fill="#fbbf24" />
                    </div>
                </div>

                <div style={{ padding: '32px 24px' }}>
                    <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                        <h2 style={{ fontSize: '24px', fontWeight: '900', color: 'var(--text-primary)', marginBottom: '8px' }}>Desbloquea Flux PRO</h2>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Toma el control total de tus finanzas sin límites.</p>
                    </div>

                    <div style={{
                        background: 'var(--glass-bg)',
                        borderRadius: '24px',
                        padding: '24px',
                        border: '1px solid rgba(251, 191, 36, 0.2)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px' }}>
                            <div>
                                <p style={{ fontSize: '12px', fontWeight: 'bold', color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '1px' }}>{plan.name}</p>
                                <p style={{ fontSize: '32px', fontWeight: '900', color: 'var(--text-primary)' }}>{plan.price}</p>
                            </div>
                            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '6px' }}>{plan.period}</p>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
                            {plan.features.map((feature, fidx) => (
                                <div key={fidx} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ color: '#fbbf24' }}>
                                        <Check size={16} strokeWidth={3} />
                                    </div>
                                    <span style={{ fontSize: '14px', color: '#ccc' }}>{feature}</span>
                                </div>
                            ))}
                        </div>

                        <motion.button
                            onClick={handleUpgrade}
                            disabled={loading}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.95 }}
                            animate={{
                                boxShadow: loading ? '0 8px 16px rgba(251, 191, 36, 0.2)' : ['0 8px 16px rgba(251, 191, 36, 0.2)', '0 8px 24px rgba(251, 191, 36, 0.6)', '0 8px 16px rgba(251, 191, 36, 0.2)']
                            }}
                            transition={{
                                boxShadow: { repeat: Infinity, duration: 2 }
                            }}
                            style={{
                                width: '100%',
                                padding: '18px',
                                background: 'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)',
                                color: 'var(--accent-color)',
                                border: 'none',
                                borderRadius: '16px',
                                fontWeight: '900',
                                fontSize: '15px',
                                cursor: 'pointer',
                                boxShadow: '0 8px 16px rgba(251, 191, 36, 0.2)',
                                opacity: loading ? 0.7 : 1
                            }}
                        >
                            {loading ? 'PROCESANDO PAGO...' : plan.buttonText}
                        </motion.button>
                    </div>

                    <p style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '24px' }}>
                        Acceso de por vida. Un solo pago.
                    </p>
                </div>
            </motion.div>
        </div>
    );
};

export default UpgradeModal;
