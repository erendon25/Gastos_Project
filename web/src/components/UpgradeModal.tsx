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
        const ACCESS_TOKEN = 'APP_USR-5804890502331578-030220-6d5e8b2692a506ef4783e1836d66d7d0-148250709';

        try {
            setLoading(true);
            // STEP 1: Create preference via PROXY (Bypasses CORS for DEV)
            const response = await fetch('/mp-api/checkout/preferences', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${ACCESS_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    items: [
                        {
                            title: 'Flux PRO - Acceso de por vida',
                            unit_price: 5.0,
                            quantity: 1,
                            currency_id: 'PEN'
                        }
                    ],
                    back_urls: {
                        success: 'https://myflux.app/success',
                        failure: 'https://myflux.app/failure',
                        pending: 'https://myflux.app/pending'
                    },
                    auto_return: 'approved'
                })
            });

            if (!response.ok) {
                const errText = await response.text();
                console.error('Preference Error Text:', errText);
                alert(`API Error: ${response.status} - ${errText}`);
                throw new Error('No se pudo crear la preferencia');
            }

            const preference = await response.json();

            // STEP 2: Redirect to full Mercado Pago Checkout (Supports Yape, PagoEfectivo, etc)
            if (preference.init_point) {
                window.location.href = preference.init_point;
            } else {
                throw new Error('No se generó el link de pago (init_point)');
            }
        } catch (error: any) {
            console.error('Error initiating payment:', error);
            if (error.message !== 'No se pudo crear la preferencia') {
                alert(`Error interno: ${error.message}`);
            }
            // Fallback to direct link if SDK fails
            window.open('https://mpago.la/1M4ZuPH', '_blank');
        } finally {
            setLoading(false);
        }
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
                    background: '#111',
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
                            color: '#fff',
                            cursor: 'pointer'
                        }}
                    >
                        <X size={18} />
                    </button>
                    <div style={{
                        width: '80px',
                        height: '80px',
                        background: '#000',
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
                        <h2 style={{ fontSize: '24px', fontWeight: '900', color: '#fff', marginBottom: '8px' }}>Desbloquea Flux PRO</h2>
                        <p style={{ color: '#666', fontSize: '14px' }}>Toma el control total de tus finanzas sin límites.</p>
                    </div>

                    <div style={{
                        background: 'rgba(255,255,255,0.03)',
                        borderRadius: '24px',
                        padding: '24px',
                        border: '1px solid rgba(251, 191, 36, 0.2)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px' }}>
                            <div>
                                <p style={{ fontSize: '12px', fontWeight: 'bold', color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '1px' }}>{plan.name}</p>
                                <p style={{ fontSize: '32px', fontWeight: '900', color: '#fff' }}>{plan.price}</p>
                            </div>
                            <p style={{ fontSize: '14px', color: '#666', marginBottom: '6px' }}>{plan.period}</p>
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
                                color: '#000',
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

                    <p style={{ textAlign: 'center', fontSize: '11px', color: '#444', marginTop: '24px' }}>
                        Acceso de por vida. Un solo pago.
                    </p>
                </div>
            </motion.div>
        </div>
    );
};

export default UpgradeModal;
