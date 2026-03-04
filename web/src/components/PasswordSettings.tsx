import React, { useState, useEffect } from 'react'
import { auth, db } from '../lib/firebase'
import { updatePassword, updateProfile, EmailAuthProvider, reauthenticateWithCredential, deleteUser } from 'firebase/auth'
import { Lock, User, Check, AlertCircle, Eye, EyeOff, Trash2, Coins, ChevronDown } from 'lucide-react'
import { doc, deleteDoc, collection, getDocs, updateDoc, query, where } from 'firebase/firestore'
import { updateEmail } from 'firebase/auth'
import { Share2, Moon, Sun, Mail } from 'lucide-react'

interface PasswordSettingsProps {
    draftData?: any;
    onUpdateDraft?: (data: any) => void;
    user?: any;
    onCurrencyChange?: (currency: { code: string, symbol: string }) => void;
}

const currencies = [
    { code: 'PEN', symbol: 'S/', name: 'Sol Peruano' },
    { code: 'USD', symbol: '$', name: 'Dólar Estadounidense' },
    { code: 'EUR', symbol: '€', name: 'Euro' },
    { code: 'MXN', symbol: '$', name: 'Peso Mexicano' },
    { code: 'ARS', symbol: '$', name: 'Peso Argentino' },
    { code: 'CLP', symbol: '$', name: 'Peso Chileno' },
    { code: 'COP', symbol: '$', name: 'Peso Colombiano' },
    { code: 'BRL', symbol: 'R$', name: 'Real Brasileño' },
    { code: 'JPY', symbol: '¥', name: 'Yen Japonés' },
    { code: 'GBP', symbol: '£', name: 'Libra Esterlina' }
];

const PasswordSettings: React.FC<PasswordSettingsProps> = ({ draftData, onUpdateDraft, user, onCurrencyChange }) => {
    const [currentPassword, setCurrentPassword] = useState(draftData?.currentPassword || '')
    const [newPassword, setNewPassword] = useState(draftData?.newPassword || '')
    const [confirmPassword, setConfirmPassword] = useState(draftData?.confirmPassword || '')
    const [displayName, setDisplayName] = useState(draftData?.displayName || (auth.currentUser?.displayName || ''))
    const [selectedCurrency, setSelectedCurrency] = useState(user?.currency?.code || 'PEN')
    const [loading, setLoading] = useState(false)
    const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null)
    const [showPasswords, setShowPasswords] = useState(false)
    const [email, setEmail] = useState(auth.currentUser?.email || '')
    const [referralsCount, setReferralsCount] = useState(0)
    const [unclaimedReferrals, setUnclaimedReferrals] = useState<any[]>([])
    const [isDarkTheme, setIsDarkTheme] = useState(() => {
        const storedTheme = localStorage.getItem('theme');
        if (storedTheme) {
            return storedTheme === 'dark';
        }
        return true;
    });

    // Validar en el primer renderizado, por si el body ya tiene la clase o falta.
    useEffect(() => {
        if (!isDarkTheme) {
            document.body.classList.add('light-theme');
        } else {
            document.body.classList.remove('light-theme');
        }
    }, [isDarkTheme]);

    // Verificar si el usuario se registró con correo/contraseña
    const isPasswordUser = auth.currentUser?.providerData.some(p => p.providerId === 'password')

    useEffect(() => {
        if (onUpdateDraft) {
            onUpdateDraft({ currentPassword, newPassword, confirmPassword, displayName });
        }
    }, [currentPassword, newPassword, confirmPassword, displayName, onUpdateDraft]);

    useEffect(() => {
        if (!auth.currentUser) return;
        const loadReferrals = async () => {
            try {
                const q = query(collection(db, 'referrals'), where('referrerId', '==', auth.currentUser!.uid), where('status', '==', 'completed'));
                const snap = await getDocs(q);
                setReferralsCount(snap.size);

                const unclaimed = snap.docs.filter(d => !d.data().claimed).map(d => ({ id: d.id, ...d.data() }));
                setUnclaimedReferrals(unclaimed);
            } catch (e) {
                console.error('Error fetching referrals', e);
            }
        };
        loadReferrals();
    }, []);

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!auth.currentUser) return

        setLoading(true)
        setStatus(null)

        try {
            await updateProfile(auth.currentUser, { displayName })

            // Actualizar moneda en Firestore
            const newCurrencyObj = currencies.find(c => c.code === selectedCurrency);
            if (newCurrencyObj) {
                await updateDoc(doc(db, 'users', auth.currentUser.uid), {
                    currency: newCurrencyObj
                });
                if (onCurrencyChange) onCurrencyChange(newCurrencyObj);
            }

            setStatus({ type: 'success', message: 'Perfil actualizado correctamente' })
        } catch (error: any) {
            setStatus({ type: 'error', message: error.message })
        } finally {
            setLoading(false)
        }
    }

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!auth.currentUser || !auth.currentUser.email) return

        if (!isPasswordUser) {
            setStatus({ type: 'error', message: 'Tu cuenta usa autenticación externa (Google/Apple). No puedes cambiar la contraseña aquí.' })
            return
        }

        if (newPassword !== confirmPassword) {
            setStatus({ type: 'error', message: 'Las nuevas contraseñas no coinciden' })
            return
        }

        const isStrongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
        if (!isStrongPassword.test(newPassword)) {
            setStatus({ type: 'error', message: 'La contraseña debe tener al menos 8 caracteres, 1 mayúscula, 1 minúscula y 1 número.' })
            return
        }

        setLoading(true)
        setStatus(null)

        try {
            // Re-autenticar al usuario antes de cambiar contraseña (seguridad de Firebase)
            const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPassword)
            await reauthenticateWithCredential(auth.currentUser, credential)

            await updatePassword(auth.currentUser, newPassword)
            setStatus({ type: 'success', message: 'Contraseña actualizada correctamente' })
            setCurrentPassword('')
            setNewPassword('')
            setConfirmPassword('')
        } catch (error: any) {
            console.error("Error en cambio de contraseña:", error);
            let msg = 'Error al actualizar la contraseña'
            if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                msg = 'La contraseña actual es incorrecta'
            } else if (error.code === 'auth/requires-recent-login') {
                msg = 'Sesión expirada. Por favor, re-inicia sesión.'
            } else if (error.code === 'auth/too-many-requests') {
                msg = 'Demasiados intentos. Inténtalo más tarde.'
            }
            setStatus({ type: 'error', message: msg })
        } finally {
            setLoading(false)
        }
    }

    const handleDeleteAccount = async () => {
        if (!auth.currentUser) return;

        const confirmDelete = window.confirm(
            "⚠️ ¿ESTÁS SEGURO?\n\nEsta acción eliminará permanentemente tu cuenta y todos tus datos (gastos, ingresos, ahorros). No se puede deshacer.\n\nSi decides volver a registrarte después, empezarás de cero."
        );

        if (!confirmDelete) return;

        setLoading(true);
        setStatus(null);

        try {
            const uid = auth.currentUser.uid;

            // 1. Eliminar colecciones
            const subcollections = ['gastos', 'ingresos', 'gastos_recurrentes', 'ingresos_recurrentes', 'categorias', 'prestamos'];
            for (const sub of subcollections) {
                const q = await getDocs(collection(db, 'users', uid, sub));
                for (const d of q.docs) {
                    await deleteDoc(doc(db, 'users', uid, sub, d.id));
                }
            }

            // 2. Eliminar documento de usuario
            await deleteDoc(doc(db, 'users', uid));

            // 3. Eliminar de Auth
            await deleteUser(auth.currentUser);

            alert("Tu cuenta ha sido eliminada correctamente.");
        } catch (error: any) {
            console.error("Error al eliminar cuenta:", error);
            let msg = 'Error al eliminar la cuenta.';
            if (error.code === 'auth/requires-recent-login') {
                msg = 'Por seguridad, debes haber iniciado sesión recientemente para eliminar tu cuenta. Por favor, sal y vuelve a entrar.';
            }
            setStatus({ type: 'error', message: msg });
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateEmail = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!auth.currentUser) return

        if (!isPasswordUser) {
            setStatus({ type: 'error', message: 'Tu cuenta usa autenticación externa (Google/Apple). No puedes cambiar el correo aquí.' })
            return
        }

        setLoading(true)
        setStatus(null)

        try {
            await updateEmail(auth.currentUser, email)
            setStatus({ type: 'success', message: 'Correo actualizado correctamente (Puede requerir re-inicio de sesión)' })
        } catch (error: any) {
            console.error("Error al actualizar correo:", error)
            let msg = 'Error al actualizar el correo'
            if (error.code === 'auth/requires-recent-login') {
                msg = 'Sesión expirada. Por favor, re-inicia sesión para cambiar tu correo.'
            } else if (error.code === 'auth/email-already-in-use') {
                msg = 'El correo ya está en uso por otra cuenta.'
            } else if (error.code === 'auth/invalid-email') {
                msg = 'El correo no es válido.'
            }
            setStatus({ type: 'error', message: msg })
        } finally {
            setLoading(false)
        }
    }

    const toggleTheme = () => {
        const newIsDark = !isDarkTheme;
        setIsDarkTheme(newIsDark);
        if (newIsDark) {
            document.body.classList.remove('light-theme');
            localStorage.setItem('theme', 'dark');
        } else {
            document.body.classList.add('light-theme');
            localStorage.setItem('theme', 'light');
        }
    }

    const handleShareLink = async () => {
        const link = `${window.location.origin}/?ref=${auth.currentUser?.uid || 'user'}`;
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Únete a Flux',
                    text: 'Maneja tus finanzas como un PRO. Únete con mi enlace.',
                    url: link
                });
            } catch (err) {
                console.log("Share cancelado o error");
            }
        } else {
            navigator.clipboard.writeText(link);
            alert('¡Enlace copiado al portapapeles! Compártelo con tus amigos.');
        }
    }

    const handleClaimReferralReward = async () => {
        if (!auth.currentUser || unclaimedReferrals.length < 3) return;

        setLoading(true);
        try {
            const toClaim = unclaimedReferrals.slice(0, 3);
            const userRef = doc(db, 'users', auth.currentUser.uid);

            let currentProUntil = user?.proUntil ? new Date(user.proUntil) : new Date();
            if (currentProUntil < new Date()) {
                currentProUntil = new Date();
            }
            currentProUntil.setDate(currentProUntil.getDate() + 30);

            await updateDoc(userRef, {
                proUntil: currentProUntil.toISOString()
            });

            const promises = toClaim.map(ref => updateDoc(doc(db, 'referrals', ref.id), { claimed: true, claimedAt: new Date().toISOString() }));
            await Promise.all(promises);

            alert('¡Felicidades! Has reclamado 1 mes de Flux PRO.');
            setUnclaimedReferrals(prev => prev.slice(3));
        } catch (e: any) {
            console.error("Error reclamando recompensa:", e);
            alert("Hubo un error al reclamar la recompensa.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Perfil */}
            <form onSubmit={handleUpdateProfile} className="premium-card" style={{ padding: '20px', background: 'var(--card-bg-light)', display: 'flex', flexDirection: 'column', gap: '16px', border: '1px solid var(--glass-border)' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                    <User size={16} /> PERFIL DE USUARIO
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 'bold' }}>NOMBRE PÚBLICO</label>
                    <input
                        type="text"
                        placeholder="Tu nombre"
                        className="input-field"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        style={{ background: 'var(--bg-color)' }}
                    />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Coins size={12} /> MONEDA PRINCIPAL
                    </label>
                    <div style={{ position: 'relative' }}>
                        <select
                            value={selectedCurrency}
                            onChange={(e) => setSelectedCurrency(e.target.value)}
                            style={{
                                width: '100%',
                                background: 'var(--bg-color)',
                                color: 'var(--text-primary)',
                                border: '1px solid var(--glass-border)',
                                borderRadius: '12px',
                                padding: '12px',
                                fontSize: '14px',
                                appearance: 'none',
                                cursor: 'pointer',
                                outline: 'none'
                            }}
                        >
                            {currencies.map(c => (
                                <option key={c.code} value={c.code} style={{ background: 'var(--card-bg-light)' }}>
                                    {c.name} ({c.symbol})
                                </option>
                            ))}
                        </select>
                        <ChevronDown size={14} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', pointerEvents: 'none' }} />
                    </div>
                </div>
                <button type="submit" className="btn-primary" disabled={loading} style={{
                    padding: '12px',
                    fontSize: '13px',
                    background: 'var(--text-primary)',
                    color: 'var(--bg-color)',
                    fontWeight: '800'
                }}>
                    {loading ? 'GUARDANDO...' : 'GUARDAR CAMBIOS'}
                </button>
            </form>

            {/* Mostrar panel PRO si tiene proUntil activo, de lo contrario mostrar referidos */}
            {user?.proUntil && new Date(user.proUntil) > new Date() ? (
                <div className="premium-card" style={{ padding: '20px', background: 'linear-gradient(135deg, rgba(74, 222, 128, 0.1) 0%, rgba(74, 222, 128, 0.05) 100%)', display: 'flex', flexDirection: 'column', gap: '12px', border: '1px solid rgba(74, 222, 128, 0.3)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ background: '#4ade80', padding: '6px', borderRadius: '8px' }}>
                            <Check size={16} color="#000" />
                        </div>
                        <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--text-primary)' }}>FLUX PRO ACTIVO</h3>
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                        Disfruta de todos los beneficios de Flux PRO hasta el <strong>{new Date(user.proUntil).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>.
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-tertiary)' }}>
                            <span>Tiempo restante</span>
                            <span style={{ fontWeight: 'bold', color: '#4ade80' }}>
                                {Math.ceil((new Date(user.proUntil).getTime() - new Date().getTime()) / (1000 * 3600 * 24))} días
                            </span>
                        </div>
                        <div style={{ height: '6px', background: 'var(--glass-bg)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{
                                height: '100%',
                                background: '#4ade80',
                                width: `${Math.max(0, Math.min(100, (Math.ceil((new Date(user.proUntil).getTime() - new Date().getTime()) / (1000 * 3600 * 24)) / 30) * 100))}%`,
                                borderRadius: '3px'
                            }} />
                        </div>
                    </div>
                </div>
            ) : (
                <div className="premium-card" style={{ padding: '20px', background: 'linear-gradient(135deg, var(--card-bg-light) 0%, var(--card-bg) 100%)', display: 'flex', flexDirection: 'column', gap: '12px', border: '1px solid var(--glass-border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ background: 'rgba(252, 163, 17, 0.1)', padding: '6px', borderRadius: '8px' }}>
                            <Share2 size={16} color="#fca311" />
                        </div>
                        <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--text-primary)' }}>PROGRAMA DE REFERIDOS</h3>
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                        Invita a tus amigos y obtén <strong>1 mes de Flux PRO gratis</strong> cuando 3 amigos se registren con tu enlace y agreguen su primer movimiento.
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-color)', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 'bold' }}>AMIGOS REFERIDOS</span>
                            <span style={{ fontSize: '18px', fontWeight: '900', color: 'var(--text-primary)' }}>{referralsCount}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 'bold' }}>PROGRESO</span>
                            <span style={{ fontSize: '14px', fontWeight: 'bold', color: unclaimedReferrals.length >= 3 ? '#4ade80' : '#fca311' }}>{unclaimedReferrals.length} / 3</span>
                        </div>
                    </div>

                    {unclaimedReferrals.length >= 3 ? (
                        <button
                            type="button"
                            onClick={handleClaimReferralReward}
                            disabled={loading}
                            style={{
                                padding: '12px',
                                background: '#4ade80',
                                color: '#000',
                                border: 'none',
                                borderRadius: '12px',
                                fontSize: '13px',
                                fontWeight: '900',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                animation: 'pulse 2s infinite'
                            }}
                        >
                            {loading ? 'RECLAMANDO...' : '¡RECLAMAR 1 MES PRO!'}
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={handleShareLink}
                            style={{
                                padding: '12px',
                                background: '#fca311',
                                color: 'var(--accent-color)',
                                border: 'none',
                                borderRadius: '12px',
                                fontSize: '13px',
                                fontWeight: '800',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px'
                            }}
                        >
                            <Share2 size={16} /> {unclaimedReferrals.length > 0 ? `FALTAN ${3 - unclaimedReferrals.length}` : 'COMPARTIR MI ENLACE'}
                        </button>
                    )}
                </div>
            )}

            {/* Configuración de Pantalla/Tema */}
            <div className="premium-card" style={{ padding: '20px', background: 'var(--card-bg-light)', display: 'flex', flexDirection: 'column', gap: '16px', border: '1px solid var(--glass-border)' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                    {isDarkTheme ? <Moon size={16} /> : <Sun size={16} />} APARIENCIA
                </h3>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-primary)' }}>Tema Oscuro</span>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Interfaz principal</span>
                    </div>
                    {/* Toggle Switch */}
                    <button
                        type="button"
                        onClick={toggleTheme}
                        style={{
                            width: '44px',
                            height: '24px',
                            background: isDarkTheme ? '#4ade80' : 'border-color',
                            borderRadius: '12px',
                            position: 'relative',
                            border: 'none',
                            cursor: 'pointer',
                            transition: 'background 0.3s'
                        }}
                    >
                        <div style={{
                            width: '20px',
                            height: '20px',
                            background: 'var(--text-primary)',
                            borderRadius: '50%',
                            position: 'absolute',
                            top: '2px',
                            left: isDarkTheme ? '22px' : '2px',
                            transition: 'left 0.3s',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                        }} />
                    </button>
                </div>
            </div>

            {/* Email */}
            <form onSubmit={handleUpdateEmail} className="premium-card" style={{
                padding: '20px',
                background: 'var(--card-bg-light)',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                border: '1px solid var(--glass-border)',
                opacity: isPasswordUser ? 1 : 0.6
            }}>
                <h3 style={{ fontSize: '14px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                    <Mail size={16} /> CORREO ELECTRÓNICO
                </h3>

                {!isPasswordUser ? (
                    <div style={{ padding: '12px', background: 'var(--glass-bg)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'center' }}>
                            Has iniciado sesión con un proveedor externo. Tu correo está vinculado a esa plataforma.
                        </p>
                    </div>
                ) : (
                    <>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <label style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 'bold' }}>CORREO ACTUAL</label>
                            <input
                                type="email"
                                className="input-field"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                style={{ background: 'var(--bg-color)' }}
                                required
                            />
                        </div>
                        <button type="submit" className="btn-primary" disabled={loading} style={{
                            padding: '12px',
                            background: 'linear-gradient(135deg, var(--glass-border) 0%, var(--card-bg-light) 100%)',
                            color: 'var(--text-primary)',
                            border: '1px solid border-color',
                            fontSize: '13px',
                            fontWeight: '800'
                        }}>
                            {loading ? 'MODIFICANDO...' : 'CAMBIAR CORREO'}
                        </button>
                    </>
                )}
            </form>

            {/* Contraseña */}
            <form onSubmit={handleChangePassword} className="premium-card" style={{
                padding: '20px',
                background: 'var(--card-bg-light)',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                border: '1px solid var(--glass-border)',
                opacity: isPasswordUser ? 1 : 0.6
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                        <Lock size={16} /> SEGURIDAD
                    </h3>
                    {isPasswordUser && (
                        <button type="button" onClick={() => setShowPasswords(!showPasswords)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                            {showPasswords ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    )}
                </div>

                {!isPasswordUser ? (
                    <div style={{ padding: '12px', background: 'var(--glass-bg)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'center' }}>
                            Has iniciado sesión con un proveedor externo. La gestión de contraseña se realiza desde tu cuenta de Google/Apple.
                        </p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <label style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 'bold' }}>CONTRASEÑA ACTUAL</label>
                            <input
                                type={showPasswords ? "text" : "password"}
                                className="input-field"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                style={{ background: 'var(--bg-color)' }}
                                required
                            />
                        </div>
                        <div style={{ height: '1px', background: 'var(--border-color)', margin: '4px 0' }}></div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                            <div style={{ flex: 1, minWidth: '150px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <label style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 'bold' }}>NUEVA CONTRASEÑA</label>
                                <input
                                    type={showPasswords ? "text" : "password"}
                                    className="input-field"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    style={{ background: 'var(--bg-color)' }}
                                    required
                                />
                            </div>
                            <div style={{ flex: 1, minWidth: '150px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <label style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 'bold' }}>REPETIR CONTRASEÑA</label>
                                <input
                                    type={showPasswords ? "text" : "password"}
                                    className="input-field"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    style={{ background: 'var(--bg-color)' }}
                                    required
                                />
                            </div>
                        </div>
                    </div>
                )}

                {status && (
                    <div style={{
                        background: status.type === 'success' ? 'rgba(74, 222, 128, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        padding: '12px',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        border: `1px solid ${status.type === 'success' ? 'rgba(74, 222, 128, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
                    }}>
                        {status.type === 'success' ? <Check size={16} color="#4ade80" /> : <AlertCircle size={16} color="#ef4444" />}
                        <span style={{ fontSize: '12px', color: status.type === 'success' ? '#4ade80' : '#ef4444' }}>{status.message}</span>
                    </div>
                )}

                <button type="submit" className="btn-primary" disabled={loading || !isPasswordUser} style={{
                    padding: '12px',
                    background: isPasswordUser ? 'linear-gradient(135deg, var(--glass-border) 0%, var(--card-bg-light) 100%)' : 'var(--border-color)',
                    color: isPasswordUser ? 'var(--text-primary)' : 'border-color',
                    border: '1px solid border-color',
                    fontSize: '13px',
                    fontWeight: '800'
                }}>
                    {loading ? 'ACTUALIZANDO...' : 'CAMBIAR CONTRASEÑA'}
                </button>
            </form>

            {/* Peligro: Eliminar Cuenta */}
            <div className="premium-card" style={{
                padding: '24px',
                background: 'rgba(239, 68, 68, 0.03)',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                border: '1px solid rgba(239, 68, 68, 0.1)',
                marginTop: '12px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#ef4444' }}>
                    <Trash2 size={20} />
                    <h3 style={{ fontSize: '15px', fontWeight: 'bold' }}>ZONA DE PELIGRO</h3>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                    Al eliminar tu cuenta, todos tus datos financieros serán borrados de forma permanente. No podrás recuperar esta información.
                </p>
                <button
                    onClick={handleDeleteAccount}
                    disabled={loading}
                    style={{
                        padding: '16px',
                        background: '#ef4444',
                        color: 'var(--text-primary)',
                        border: 'none',
                        borderRadius: '16px',
                        fontSize: '14px',
                        fontWeight: '800',
                        cursor: 'pointer',
                        transition: 'opacity 0.2s',
                        opacity: loading ? 0.5 : 1
                    }}
                >
                    {loading ? 'PROCESANDO...' : 'ELIMINAR MI CUENTA'}
                </button>
            </div>
        </div>
    )
}

export default PasswordSettings
