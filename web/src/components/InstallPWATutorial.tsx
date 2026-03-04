import React, { useState, useEffect } from 'react';
import { Share, PlusSquare, X, Smartphone, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const InstallPWATutorial: React.FC = () => {
    const [showPrompt, setShowPrompt] = useState(false);
    const [installType, setInstallType] = useState<'ios' | 'android' | null>(null);
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

    useEffect(() => {
        // Check if already installed
        if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
            return; // Already installed
        }

        // Checking if the user has dismissed it recently
        const dismissed = localStorage.getItem('pwa_prompt_dismissed');
        if (dismissed && Date.now() - parseInt(dismissed) < 1000 * 60 * 60 * 24 * 7) { // 7 days
            return;
        }

        const ua = window.navigator.userAgent;
        const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
        const isAndroid = /android/i.test(ua);

        if (isIOS) {
            setInstallType('ios');
            // Delay showing slightly so it's not aggressive
            const timer = setTimeout(() => setShowPrompt(true), 2000);
            return () => clearTimeout(timer);
        }

        if (isAndroid) {
            setInstallType('android');
            window.addEventListener('beforeinstallprompt', (e) => {
                e.preventDefault();
                setDeferredPrompt(e);
                setShowPrompt(true);
            });
        }
    }, []);

    const handleDismiss = () => {
        setShowPrompt(false);
        localStorage.setItem('pwa_prompt_dismissed', Date.now().toString());
    };

    const handleInstallClick = async () => {
        if (installType === 'android' && deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                setShowPrompt(false);
            }
            setDeferredPrompt(null);
        }
    };

    return (
        <AnimatePresence>
            {showPrompt && (
                <motion.div
                    initial={{ y: 150, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 150, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    style={{
                        position: 'fixed',
                        bottom: 'env(safe-area-inset-bottom, 20px)',
                        left: '20px',
                        right: '20px',
                        background: 'var(--card-bg)',
                        border: '1px solid var(--border-color)',
                        boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
                        borderRadius: '24px',
                        padding: '24px',
                        zIndex: 9999, // Super high so it shows above everything
                        paddingBottom: '24px',
                    }}
                >
                    <button
                        onClick={handleDismiss}
                        style={{
                            position: 'absolute',
                            top: '16px',
                            right: '16px',
                            background: 'var(--glass-bg)',
                            border: 'none',
                            borderRadius: '50%',
                            width: '32px',
                            height: '32px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--text-primary)',
                            cursor: 'pointer',
                        }}
                    >
                        <X size={16} />
                    </button>

                    <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                        <div style={{
                            background: 'linear-gradient(135deg, #fca311 0%, #d97706 100%)',
                            width: '48px',
                            height: '48px',
                            minWidth: '48px',
                            borderRadius: '16px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#000',
                            boxShadow: '0 4px 12px rgba(252, 163, 17, 0.4)'
                        }}>
                            <Smartphone size={24} />
                        </div>

                        <div style={{ flex: 1 }}>
                            <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '8px', color: 'var(--text-primary)' }}>
                                Instala la App de Flux
                            </h3>

                            {installType === 'ios' ? (
                                <>
                                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Instala Flux en tu celular para una experiencia rápida y sin conexión como App Nativa.</p>

                                    <div style={{ background: 'var(--glass-bg)', borderRadius: '12px', padding: '16px', marginTop: '16px' }}>
                                        <ol style={{ paddingLeft: '20px', margin: 0, color: 'var(--text-primary)', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            <li style={{ paddingLeft: '4px' }}>
                                                Toca el botón <Share size={14} style={{ margin: '0 4px', verticalAlign: 'text-bottom', color: '#0A84FF' }} /> en la barra de Safari.
                                            </li>
                                            <li style={{ paddingLeft: '4px' }}>
                                                Desliza y busca <span style={{ fontWeight: 'bold' }}>"Agregar a Inicio"</span> <PlusSquare size={14} style={{ margin: '0 4px', verticalAlign: 'text-bottom' }} />.
                                            </li>
                                            <li style={{ paddingLeft: '4px' }}>
                                                Toca <span style={{ fontWeight: 'bold', color: '#0A84FF' }}>Agregar</span> en la esquina superior derecha.
                                            </li>
                                        </ol>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                                        Instala Flux ahora para usarlo sin límite, más rápido y directamente desde tu escritorio.
                                    </p>
                                    {deferredPrompt ? (
                                        <button
                                            onClick={handleInstallClick}
                                            style={{
                                                width: '100%',
                                                padding: '14px',
                                                borderRadius: '12px',
                                                border: 'none',
                                                background: 'var(--text-primary)',
                                                color: 'var(--bg-color)',
                                                fontWeight: '800',
                                                fontSize: '14px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '8px',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            <Download size={18} /> Instalar Aplicación
                                        </button>
                                    ) : (
                                        <div style={{ background: 'var(--glass-bg)', borderRadius: '12px', padding: '16px', marginTop: '16px' }}>
                                            <ol style={{ paddingLeft: '20px', margin: 0, color: 'var(--text-primary)', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                <li style={{ paddingLeft: '4px' }}>Toca el menú de opciones (tres puntitos) arriba a la derecha.</li>
                                                <li style={{ paddingLeft: '4px' }}>Toca en <span style={{ fontWeight: 'bold' }}>"Instalar aplicación"</span> o "Agregar a inicio".</li>
                                            </ol>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default InstallPWATutorial;
