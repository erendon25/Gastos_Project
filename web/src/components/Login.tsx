import React, { useState } from 'react';
import { Mail, Apple, Wallet, Key, UserPlus } from 'lucide-react';
import { signInWithPopup, signInWithRedirect, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth, googleProvider, appleProvider } from '../lib/firebase';

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
                setError("Error: " + err.message);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleAppleLogin = async () => {
        setLoading(true);
        setError('');
        try {
            await signInWithRedirect(auth, appleProvider);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');
        try {
            if (isRegistering) {
                await createUserWithEmailAndPassword(auth, email, password);
                setSuccess('¡Cuenta creada con éxito! Bienvenido.');
                setTimeout(() => onLogin(), 1500);
            } else {
                await signInWithEmailAndPassword(auth, email, password);
                onLogin();
            }
        } catch (err: any) {
            if (err.code === 'auth/user-not-found') setError('Usuario no encontrado.');
            else if (err.code === 'auth/wrong-password') setError('Contraseña incorrecta.');
            else if (err.code === 'auth/email-already-in-use') setError('El correo ya está registrado.');
            else if (err.code === 'auth/weak-password') setError('La contraseña debe tener al menos 6 caracteres.');
            else setError('Error: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async () => {
        if (!email) {
            setError('Ingresa tu correo primero para enviarte el enlace de recuperación.');
            return;
        }
        setLoading(true);
        setError('');
        setSuccess('');
        try {
            await sendPasswordResetEmail(auth, email);
            setSuccess('Se ha enviado un correo para restablecer tu contraseña.');
        } catch (err: any) {
            setError('Error: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: '40px 30px', display: 'flex', flexDirection: 'column', gap: '32px', minHeight: '100vh', justifyContent: 'center', background: 'var(--bg-color)' }}>
            <div style={{ textAlign: 'center' }}>
                <div style={{
                    width: '80px', height: '80px', borderRadius: '24px',
                    background: 'linear-gradient(135deg, #fff 0%, #e0e0e0 100%)',
                    margin: '0 auto 20px auto', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
                }}>
                    <Wallet size={40} color="#000" />
                </div>
                <h1 style={{ fontSize: '28px', fontWeight: '800', letterSpacing: '-1px' }}>GastosPremium</h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '8px' }}>
                    {isRegistering ? 'Crea tu cuenta gratuita' : 'Tu control financiero inteligente'}
                </p>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {error && <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                    <p style={{ color: '#ef4444', fontSize: '12px', textAlign: 'center' }}>{error}</p>
                </div>}

                {success && <div style={{ background: 'rgba(74, 222, 128, 0.1)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(74, 222, 128, 0.2)' }}>
                    <p style={{ color: '#4ade80', fontSize: '12px', textAlign: 'center' }}>{success}</p>
                </div>}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <input type="email" placeholder="Correo electrónico" className="input-field" value={email} onChange={(e) => setEmail(e.target.value)} required />
                    <input type="password" placeholder="Contraseña" className="input-field" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>

                {!isRegistering && (
                    <button type="button" onClick={handleForgotPassword} style={{ background: 'none', border: 'none', color: '#666', fontSize: '12px', textAlign: 'right', cursor: 'pointer', padding: '0 4px' }}>
                        ¿Olvidaste tu contraseña?
                    </button>
                )}

                <button type="submit" className="btn-primary" disabled={loading} style={{
                    background: isRegistering ? 'linear-gradient(135deg, #818cf8 0%, #6366f1 100%)' : 'var(--accent-color)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                }}>
                    {isRegistering ? <UserPlus size={18} /> : <Key size={18} />}
                    {loading ? 'Procesando...' : (isRegistering ? 'Crear Cuenta' : 'Iniciar Sesión')}
                </button>
            </form>

            <button
                type="button"
                onClick={() => { setIsRegistering(!isRegistering); setError(''); setSuccess(''); }}
                style={{ background: 'none', border: 'none', color: '#818cf8', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
            >
                {isRegistering ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate gratis'}
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ flex: 1, height: '1px', background: '#222' }}></div>
                <span style={{ fontSize: '12px', color: '#444' }}>o continúa con</span>
                <div style={{ flex: 1, height: '1px', background: '#222' }}></div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <button onClick={handleGoogleLogin} disabled={loading} className="input-field" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', cursor: 'pointer', background: '#1c1c1e', border: '1px solid #333' }}>
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width="18" height="18" alt="G" />
                    Google
                </button>
                <button onClick={handleAppleLogin} disabled={loading} className="input-field" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', cursor: 'pointer', background: '#000', border: '1px solid #333' }}>
                    <Apple size={20} fill="#fff" />
                    Apple
                </button>
            </div>
        </div>
    );
};

export default Login;
