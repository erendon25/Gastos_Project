import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ArrowRight, Zap, Target } from 'lucide-react';
import { db, auth } from '../lib/firebase';
import { doc, setDoc, addDoc, collection } from 'firebase/firestore';

interface OnboardingProps {
    onComplete: () => void;
}

const PRESET_CATEGORIES = [
    { name: 'Alimentación', emoji: '🍱', color: '#EF4444' },
    { name: 'Transporte', emoji: '🚕', color: '#F59E0B' },
    { name: 'Vivienda', emoji: '🏠', color: '#10B981' },
    { name: 'Ocio', emoji: '🎮', color: '#8B5CF6' },
    { name: 'Salud', emoji: '🏥', color: '#EC4899' },
    { name: 'Educación', emoji: '🎓', color: '#3B82F6' },
    { name: 'Ropa', emoji: '👕', color: '#14B8A6' },
    { name: 'Suscripciones', emoji: '📱', color: '#6366F1' },
];

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
    const [step, setStep] = useState(0);
    const [selectedCategories, setSelectedCategories] = useState<string[]>(['Alimentación', 'Transporte', 'Vivienda']);
    const [saving, setSaving] = useState(false);

    const toggleCategory = (catName: string) => {
        setSelectedCategories(prev =>
            prev.includes(catName)
                ? prev.filter(c => c !== catName)
                : [...prev, catName]
        );
    };

    const handleFinish = async () => {
        if (!auth.currentUser) return;
        setSaving(true);
        try {
            // Guardar categorías seleccionadas en Firestore
            const promises = selectedCategories.map(catName => {
                const config = PRESET_CATEGORIES.find(c => c.name === catName);
                if (!config) return Promise.resolve();

                return addDoc(collection(db, 'users', auth.currentUser!.uid, 'categorias'), {
                    name: config.name,
                    color: config.color,
                    emoji: config.emoji,
                    iconName: 'Tag',
                    keywords: [config.name.toLowerCase()]
                });
            });
            await Promise.all(promises);

            // Marcar onboarding como completado en el documento del usuario principal
            await setDoc(doc(db, 'users', auth.currentUser.uid), {
                onboardingCompleted: true,
                createdAt: new Date().toISOString()
            }, { merge: true });

            // Registrar referido si existe
            const refCode = localStorage.getItem('fluxRefCode');
            if (refCode && refCode !== auth.currentUser.uid) {
                try {
                    await setDoc(doc(db, 'referrals', auth.currentUser.uid), {
                        referrerId: refCode,
                        referredId: auth.currentUser.uid,
                        status: 'pending',
                        createdAt: new Date().toISOString()
                    });
                    localStorage.removeItem('fluxRefCode');
                } catch (e) {
                    console.error("Error saving referral:", e);
                }
            }

            onComplete();
        } catch (error) {
            console.error("Error saving onboarding:", error);
            setSaving(false);
        }
    };

    return (
        <div className="desktop-wrapper" style={{ zIndex: 9999, position: 'fixed', inset: 0 }}>
            <div className="app-container" style={{
                maxWidth: '450px',
                width: '100%',
                margin: '0 auto',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                padding: '40px 20px',
                color: 'var(--text-primary)',
                background: 'var(--bg-color)',
                zIndex: 9999
            }}>
                <AnimatePresence mode="wait">
                    {step === 0 && (
                        <motion.div
                            key="step0"
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: -50 }}
                            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', flex: 1, justifyContent: 'center' }}
                        >
                            <div style={{
                                width: '100px', height: '100px', borderRadius: '32px',
                                background: 'linear-gradient(135deg, #fff 0%, #e0e0e0 100%)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: '0 20px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.1)',
                                marginBottom: '40px'
                            }}>
                                <Zap size={50} color="#000" />
                            </div>
                            <h1 style={{ fontSize: '42px', fontWeight: '900', letterSpacing: '-1px', marginBottom: '16px' }}>¡Bienvenido!</h1>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '16px', lineHeight: '1.5', maxWidth: '300px' }}>
                                Estás a un paso de tomar el control total de tus finanzas. Vamos a configurar tu espacio en menos de un minuto.
                            </p>

                            <div style={{ flex: 1 }}></div>

                            <button
                                className="btn-primary"
                                style={{
                                    marginTop: 'auto', width: '100%', height: '56px', fontSize: '18px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px'
                                }}
                                onClick={() => setStep(1)}
                            >
                                Comenzar configuración <ArrowRight size={20} />
                            </button>
                        </motion.div>
                    )}

                    {step === 1 && (
                        <motion.div
                            key="step1"
                            initial={{ opacity: 0, x: 50 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -50 }}
                            style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
                        >
                            <div style={{ marginBottom: '32px' }}>
                                <div style={{ display: 'inline-flex', padding: '8px 16px', borderRadius: '20px', background: 'rgba(99, 102, 241, 0.1)', color: '#818cf8', fontWeight: 'bold', fontSize: '13px', marginBottom: '16px', alignItems: 'center', gap: '8px' }}>
                                    <Target size={16} /> Paso 1 de 1
                                </div>
                                <h1 style={{ fontSize: '32px', fontWeight: '900', letterSpacing: '-1px', lineHeight: '1.2' }}>¿Qué categorías usas más?</h1>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '15px', marginTop: '12px' }}>
                                    Hemos preseleccionado las más comunes, pero puedes editarlas en cualquier momento.
                                </p>
                            </div>

                            <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '20px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                                    {PRESET_CATEGORIES.map(cat => {
                                        const isSelected = selectedCategories.includes(cat.name);
                                        return (
                                            <motion.div
                                                key={cat.name}
                                                whileTap={{ scale: 0.95 }}
                                                onClick={() => toggleCategory(cat.name)}
                                                style={{
                                                    background: isSelected ? 'rgba(129, 138, 248, 0.15)' : 'var(--card-bg-light)',
                                                    border: isSelected ? '1px solid #818cf8' : '1px solid var(--border-color)',
                                                    padding: '16px',
                                                    borderRadius: '20px',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: '12px',
                                                    position: 'relative',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                <div style={{ fontSize: '28px' }}>{cat.emoji}</div>
                                                <span style={{ fontSize: '14px', fontWeight: '600', color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{cat.name}</span>

                                                {isSelected && (
                                                    <div style={{ position: 'absolute', top: '12px', right: '12px', color: '#818cf8' }}>
                                                        <Check size={18} strokeWidth={3} />
                                                    </div>
                                                )}
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div style={{ paddingTop: '20px', background: 'var(--bg-color)' }}>
                                <button
                                    className="btn-primary"
                                    style={{
                                        width: '100%', height: '56px', fontSize: '18px',
                                        background: selectedCategories.length === 0 ? 'var(--glass-border)' : 'var(--accent-color)',
                                        color: selectedCategories.length === 0 ? 'var(--text-secondary)' : 'var(--text-primary)',
                                        pointerEvents: selectedCategories.length === 0 ? 'none' : 'auto'
                                    }}
                                    onClick={handleFinish}
                                    disabled={saving || selectedCategories.length === 0}
                                >
                                    {saving ? 'Preparando tu app...' : 'Finalizar e Identificarse'}
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default Onboarding;
