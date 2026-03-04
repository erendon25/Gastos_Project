import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, CheckCircle2, Layers, PiggyBank, Zap } from 'lucide-react';
import { db, auth } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';

interface TutorialOverlayProps {
    onComplete: () => void;
}

const TutorialOverlay: React.FC<TutorialOverlayProps> = ({ onComplete }) => {
    const [step, setStep] = useState(0);

    const steps = [
        {
            title: "Tus Categorías",
            description: "Lo primero es registrar tus categorías. Esto te permitirá organizar tus gastos automáticamente.",
            icon: <Layers size={48} color="#818cf8" />,
            action: "Siguiente"
        },
        {
            title: "Control Total",
            description: "Puedes registrar gastos diarios, fijos y deudas. Mantén presionado los totales para ver el detalle.",
            icon: <Zap size={48} color="#facc15" />,
            action: "Siguiente"
        },
        {
            title: "Metas de Ahorro",
            description: "Define una meta mensual y Flux te ayudará a visualizar tu progreso en tiempo real.",
            icon: <PiggyBank size={48} color="#4ade80" />,
            action: "Comenzar"
        }
    ];

    const handleNext = async () => {
        if (step < steps.length - 1) {
            setStep(step + 1);
        } else {
            if (auth.currentUser) {
                try {
                    await updateDoc(doc(db, 'users', auth.currentUser.uid), {
                        tutorialCompleted: true
                    });
                } catch (err) {
                    console.error("Error marking tutorial as complete:", err);
                }
            }
            onComplete();
        }
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 10000,
            background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
            <AnimatePresence mode="wait">
                <motion.div
                    key={step}
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: -20 }}
                    style={{
                        width: '100%', maxWidth: '340px', background: '#1c1c1e',
                        borderRadius: '28px', padding: '32px', textAlign: 'center',
                        border: '1px solid rgba(255,255,255,0.1)',
                        boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
                    }}
                >
                    <div style={{
                        width: '80px', height: '80px', background: 'var(--glass-bg)',
                        borderRadius: '24px', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', margin: '0 auto 24px auto'
                    }}>
                        {steps[step].icon}
                    </div>

                    <h2 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '16px', color: 'var(--text-primary)' }}>
                        {steps[step].title}
                    </h2>

                    <p style={{ fontSize: '15px', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '32px' }}>
                        {steps[step].description}
                    </p>

                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '32px' }}>
                        {steps.map((_, i) => (
                            <div key={i} style={{
                                width: step === i ? '24px' : '6px',
                                height: '6px',
                                borderRadius: '3px',
                                background: step === i ? '#818cf8' : 'var(--glass-border)',
                                transition: 'all 0.3s'
                            }} />
                        ))}
                    </div>

                    <button
                        onClick={handleNext}
                        style={{
                            width: '100%', padding: '16px', borderRadius: '16px',
                            background: 'var(--text-primary)', color: 'var(--accent-color)', border: 'none',
                            fontWeight: '800', fontSize: '16px', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                        }}
                    >
                        {steps[step].action} {step < steps.length - 1 ? <ChevronRight size={18} /> : <CheckCircle2 size={18} />}
                    </button>
                </motion.div>
            </AnimatePresence>
        </div>
    );
};

export default TutorialOverlay;
