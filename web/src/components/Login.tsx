import React, { useState } from 'react';
import { Apple, Zap, Key, User, Mail, RefreshCw, CheckCircle } from 'lucide-react';
import {
    signInWithPopup, signInWithRedirect, signInWithEmailAndPassword,
    createUserWithEmailAndPassword, sendPasswordResetEmail,
    sendEmailVerification, reload, setPersistence, browserLocalPersistence, browserSessionPersistence
} from 'firebase/auth';
import { auth, googleProvider, appleProvider } from '../lib/firebase';

const ACTION_CODE_SETTINGS = {
    url: 'https://finanzasflux.com/',
    handleCodeInApp: false,
};

interface LoginProps {
    onLogin: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const [isRegistering, setIsRegistering] = useState(false);
    const [rememberMe, setRememberMe] = useState(true);

    const [verificationPending, setVerificationPending] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);
    const [checkingVerification, setCheckingVerification] = useState(false);

    const startCooldown = () => {
        setResendCooldown(60);
        const interval = setInterval(() => {
            setResendCooldown(prev => {
                if (prev <= 1) { clearInterval(interval); return 0; }
                return prev - 1;
            });
        }, 1000);
    };

    const handleGoogleLogin = async () => {
        setLoading(true);
        setError('');
        try {
            await signInWithPopup(auth, googleProvider);
            onLogin();
        } catch (err: any) {
            if (err.code === 'auth/popup-blocked') {
                await signInWithRedirect(auth, googleProvider);
            } else {
                setError('Error: ' + err.message);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleAppleLogin = async () => {
        setLoading(true);
        setError('');
        try {
            await signInWithPopup(auth, appleProvider);
            onLogin();
        } catch (err: any) {
            if (err.code === 'auth/popup-blocked' || err.code === 'auth/popup-closed-by-user') {
                // Fallback to redirect for browsers that block popups
                await signInWithRedirect(auth, appleProvider);
            } else if (err.code !== 'auth/cancelled-popup-request') {
                setError('Error con Apple: ' + err.message);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const lockout = localStorage.getItem('loginLockout');
        if (lockout && parseInt(lockout) > Date.now()) {
            const remainingMins = Math.ceil((parseInt(lockout) - Date.now()) / 60000);
            setError(`Demasiados intentos. Intenta nuevamente en ${remainingMins} minutos.`);
            return;
        }

        if (lockout) {
            localStorage.removeItem('loginLockout');
            localStorage.removeItem('loginAttempts');
        }

        setLoading(true);
        setError('');
        setSuccess('');

        if (isRegistering) {
            const isStrongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
            if (!isStrongPassword.test(password)) {
                setError('La contraseña debe tener al menos 8 caracteres, 1 mayúscula, 1 minúscula y 1 número.');
                setLoading(false);
                return;
            }
        }

        try {
            await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
            if (isRegistering) {
                const cred = await createUserWithEmailAndPassword(auth, email, password);
                localStorage.removeItem('loginAttempts');
                localStorage.removeItem('loginLockout');
                await sendEmailVerification(cred.user, ACTION_CODE_SETTINGS);
                setVerificationPending(true);
                startCooldown();
            } else {
                const cred = await signInWithEmailAndPassword(auth, email, password);
                localStorage.removeItem('loginAttempts');
                localStorage.removeItem('loginLockout');
                if (!cred.user.emailVerified) {
                    await sendEmailVerification(cred.user, ACTION_CODE_SETTINGS);
                    setVerificationPending(true);
                    startCooldown();
                } else {
                    onLogin();
                }
            }
        } catch (err: any) {
            let attempts = parseInt(localStorage.getItem('loginAttempts') || '0') + 1;
            localStorage.setItem('loginAttempts', attempts.toString());

            if (attempts >= 5) {
                const lockTime = Date.now() + 5 * 60 * 1000; // 5 minutos
                localStorage.setItem('loginLockout', lockTime.toString());
                setError('Demasiados intentos fallidos. Cuenta bloqueada temporalmente por 5 minutos.');
            } else {
                if (err.code === 'auth/user-not-found') setError('No existe una cuenta con este correo.');
                else if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') setError('Contraseña incorrecta.');
                else if (err.code === 'auth/email-already-in-use') setError('El correo ya está registrado. Inicia sesión.');
                else if (err.code === 'auth/weak-password') setError('La contraseña debe tener al menos 6 caracteres.');
                else if (err.code === 'auth/invalid-email') setError('El correo no tiene un formato válido.');
                else setError('Error: ' + err.message);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleResendVerification = async () => {
        if (!auth.currentUser || resendCooldown > 0) return;
        setLoading(true);
        setError('');
        setSuccess('');
        try {
            await sendEmailVerification(auth.currentUser, ACTION_CODE_SETTINGS);
            setSuccess('Correo reenviado. Revisa tu bandeja de entrada y spam.');
            startCooldown();
        } catch {
            setError('No se pudo reenviar. Intenta en unos momentos.');
        } finally {
            setLoading(false);
        }
    };

    const handleCheckVerification = async () => {
        if (!auth.currentUser) return;
        setCheckingVerification(true);
        setError('');
        try {
            await reload(auth.currentUser);
            if (auth.currentUser.emailVerified) {
                onLogin();
            } else {
                setError('Aún no se verifica tu correo. Revisa bandeja de entrada y la carpeta Spam.');
            }
        } catch {
            setError('Error al verificar. Intenta de nuevo.');
        } finally {
            setCheckingVerification(false);
        }
    };

    const handleForgotPassword = async () => {
        if (!email) {
            setError('Ingresa tu correo primero.');
            return;
        }
        setLoading(true);
        setError('');
        setSuccess('');
        try {
            await sendPasswordResetEmail(auth, email);
            setSuccess('Se envió el correo de recuperación.');
        } catch (err: any) {
            setError('Error: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    // ── Pantalla de verificación pendiente ──────────────────────────────────
    if (verificationPending) {
        return (
            <div style={{ padding: '40px 30px', display: 'flex', flexDirection: 'column', gap: '28px', minHeight: '100vh', justifyContent: 'center', background: 'var(--bg-color)' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{
                        width: '80px', height: '80px', borderRadius: '24px',
                        background: 'linear-gradient(135deg, #4ade80 0%, #22c55e 100%)',
                        margin: '0 auto 20px auto', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 10px 30px rgba(74,222,128,0.3)'
                    }}>
                        <Mail size={36} color="#000" />
                    </div>
                    <h1 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '8px' }}>Verifica tu correo</h1>
                    <p style={{ color: '#666', fontSize: '14px', lineHeight: 1.6 }}>
                        Enviamos un enlace a<br />
                        <span style={{ color: '#fff', fontWeight: '600' }}>{email || auth.currentUser?.email}</span>
                    </p>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '16px', padding: '20px', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {[
                        { num: '1', text: 'Abre tu correo electrónico' },
                        { num: '2', text: 'Busca un mensaje de FLUX (revisa Spam / Correo no deseado)' },
                        { num: '3', text: 'Haz clic en "Verificar dirección de correo electrónico"' },
                        { num: '4', text: 'Vuelve aquí y pulsa el botón de abajo' },
                    ].map(step => (
                        <div key={step.num} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#4ade8022', border: '1px solid #4ade8055', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <span style={{ fontSize: '11px', color: '#4ade80', fontWeight: '700' }}>{step.num}</span>
                            </div>
                            <span style={{ fontSize: '13px', color: '#aaa' }}>{step.text}</span>
                        </div>
                    ))}
                </div>

                {error && (
                    <div style={{ background: 'rgba(239,68,68,0.1)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(239,68,68,0.2)' }}>
                        <p style={{ color: '#ef4444', fontSize: '12px', textAlign: 'center' }}>{error}</p>
                    </div>
                )}
                {success && (
                    <div style={{ background: 'rgba(74,222,128,0.1)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(74,222,128,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        <CheckCircle size={14} color="#4ade80" />
                        <p style={{ color: '#4ade80', fontSize: '12px' }}>{success}</p>
                    </div>
                )}

                <button
                    onClick={handleCheckVerification}
                    disabled={checkingVerification}
                    className="btn-primary"
                    style={{ background: 'linear-gradient(135deg, #4ade80, #22c55e)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                    {checkingVerification
                        ? <><RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> Verificando...</>
                        : <><CheckCircle size={16} /> Ya verifiqué mi correo</>
                    }
                </button>

                <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '12px', color: '#555', marginBottom: '8px' }}>¿No llegó el correo?</p>
                    <button
                        onClick={handleResendVerification}
                        disabled={resendCooldown > 0 || loading}
                        style={{
                            background: 'none', border: '1px solid #333', borderRadius: '10px',
                            padding: '8px 16px', color: resendCooldown > 0 ? '#444' : '#818cf8',
                            fontSize: '13px', cursor: resendCooldown > 0 ? 'default' : 'pointer',
                            display: 'inline-flex', alignItems: 'center', gap: '6px'
                        }}
                    >
                        <RefreshCw size={13} />
                        {resendCooldown > 0 ? `Reenviar en ${resendCooldown}s` : 'Reenviar correo'}
                    </button>
                </div>

                <button
                    onClick={() => { setVerificationPending(false); setError(''); setSuccess(''); auth.signOut(); }}
                    style={{ background: 'none', border: 'none', color: '#444', fontSize: '12px', cursor: 'pointer' }}
                >
                    ← Volver al inicio de sesión
                </button>

                <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    // ── Pantalla de login / registro ────────────────────────────────────────
    return (
        <div style={{ padding: '40px 30px', display: 'flex', flexDirection: 'column', gap: '32px', minHeight: '100vh', justifyContent: 'center', background: 'var(--bg-color)' }}>
            <div style={{ textAlign: 'center' }}>
                <div style={{
                    width: '80px', height: '80px', borderRadius: '24px',
                    background: 'linear-gradient(135deg, #fff 0%, #e0e0e0 100%)',
                    margin: '0 auto 20px auto', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
                }}>
                    <Zap size={40} color="#000" />
                </div>
                <h1 style={{ fontSize: '32px', fontWeight: '900', letterSpacing: '-1px' }}>FLUX</h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
                    {isRegistering ? 'Únete a la élite financiera' : 'Tu flujo de dinero, dominado.'}
                </p>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {error && (
                    <div style={{ background: 'rgba(239,68,68,0.1)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(239,68,68,0.2)' }}>
                        <p style={{ color: '#ef4444', fontSize: '12px', textAlign: 'center' }}>{error}</p>
                    </div>
                )}
                {success && (
                    <div style={{ background: 'rgba(74,222,128,0.1)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(74,222,128,0.2)' }}>
                        <p style={{ color: '#4ade80', fontSize: '12px', textAlign: 'center' }}>{success}</p>
                    </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <input
                        type="email" placeholder="Correo electrónico" className="input-field"
                        value={email} onChange={e => setEmail(e.target.value)}
                        style={{ fontSize: '16px' }} required
                    />
                    <input
                        type="password" placeholder="Contraseña (mín. 6 caracteres)" className="input-field"
                        value={password} onChange={e => setPassword(e.target.value)}
                        style={{ fontSize: '16px' }} required
                    />
                    {isRegistering && (
                        <p style={{ fontSize: '11px', color: '#555', paddingLeft: '4px' }}>
                            📧 Recibirás un correo para confirmar que la dirección es válida.
                        </p>
                    )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: 'var(--text-secondary)' }}>
                        <input
                            type="checkbox"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                            style={{ accentColor: 'var(--accent-color)' }}
                        />
                        Recordar cuenta
                    </label>
                    {!isRegistering && (
                        <button type="button" onClick={handleForgotPassword} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '12px', textAlign: 'right', cursor: 'pointer', padding: '0' }}>
                            ¿Olvidaste tu contraseña?
                        </button>
                    )}
                </div>

                <button type="submit" className="btn-primary" disabled={loading} style={{
                    background: isRegistering ? 'linear-gradient(135deg, #818cf8 0%, #6366f1 100%)' : 'var(--accent-color)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                }}>
                    {isRegistering ? <User size={18} /> : <Key size={18} />}
                    {loading ? 'Procesando...' : (isRegistering ? 'Crear Cuenta' : 'Iniciar Sesión')}
                </button>
            </form>

            <button type="button"
                onClick={() => { setIsRegistering(!isRegistering); setError(''); setSuccess(''); }}
                style={{ background: 'none', border: 'none', color: '#818cf8', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
                {isRegistering ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate gratis'}
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }}></div>
                <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>o continúa con</span>
                <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }}></div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <button onClick={handleGoogleLogin} disabled={loading} className="input-field" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', cursor: 'pointer', background: '#1c1c1e', border: '1px solid var(--glass-border)', fontSize: '16px' }}>
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width="18" height="18" alt="G" />
                    Google
                </button>
                <button onClick={handleAppleLogin} disabled={loading} className="input-field" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', cursor: 'pointer', background: 'var(--bg-color)', border: '1px solid var(--glass-border)', fontSize: '16px' }}>
                    <Apple size={20} fill="var(--text-primary)" />
                    Apple
                </button>
            </div>
        </div>
    );
};

export default Login;
