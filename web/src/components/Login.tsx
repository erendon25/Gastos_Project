import React, { useState } from 'react';
import { Mail, Apple, Chrome, Wallet } from 'lucide-react';
import { signInWithPopup, signInWithRedirect, signInWithEmailAndPassword } from 'firebase/auth';
import { auth, googleProvider, appleProvider } from '../lib/firebase';

interface LoginProps {
    onLogin: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Intentamos Popup primero, si falla por COOP, el usuario puede ver el error o podemos reintentar con Redirect
    const handleGoogleLogin = async () => {
        setLoading(true);
        setError('');
        console.log("Login: Intentando Google Login (Popup)...");
        try {
            const result = await signInWithPopup(auth, googleProvider);
            console.log("Login: Éxito con Popup!", result.user.email);
            onLogin();
        } catch (err: any) {
            console.warn("Login: Popup bloqueado o error, intentando Redirect...", err.code);
            if (err.code === 'auth/popup-blocked' || err.code === 'auth/cancelled-popup-request') {
                try {
                    await signInWithRedirect(auth, googleProvider);
                } catch (redirErr: any) {
                    setError("Error crítico: " + redirErr.message);
                }
            } else if (err.code === 'auth/unauthorized-domain') {
                setError("Dominio no autorizado. Añade 'localhost' en Firebase Console > Authentication > Settings.");
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

    const handleEmailLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await signInWithEmailAndPassword(auth, email, password);
            onLogin();
        } catch (err: any) {
            setError('Credenciales inválidas. Verifica tu correo y contraseña.');
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
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '8px' }}>Tu control financiero inteligente</p>
            </div>

            <form onSubmit={handleEmailLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {error && <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                    <p style={{ color: '#ef4444', fontSize: '12px', textAlign: 'center' }}>{error}</p>
                </div>}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <input type="email" placeholder="Correo electrónico" className="input-field" value={email} onChange={(e) => setEmail(e.target.value)} required />
                    <input type="password" placeholder="Contraseña" className="input-field" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>

                <button type="submit" className="btn-primary" disabled={loading}>
                    {loading ? 'Entrando...' : 'Iniciar Sesión'}
                </button>
            </form>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ flex: 1, height: '1px', background: '#222' }}></div>
                <span style={{ fontSize: '12px', color: '#444' }}>o</span>
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
