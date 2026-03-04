import React, { useState, useEffect } from 'react'
import { auth, db } from '../lib/firebase'
import { updatePassword, updateProfile, EmailAuthProvider, reauthenticateWithCredential, deleteUser } from 'firebase/auth'
import { Lock, User, Check, AlertCircle, Eye, EyeOff, Trash2, Coins, ChevronDown } from 'lucide-react'
import { doc, deleteDoc, collection, getDocs, updateDoc } from 'firebase/firestore'
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
    const [isDarkTheme, setIsDarkTheme] = useState(true)

    // Verificar si el usuario se registró con correo/contraseña
    const isPasswordUser = auth.currentUser?.providerData.some(p => p.providerId === 'password')

    useEffect(() => {
        if (onUpdateDraft) {
            onUpdateDraft({ currentPassword, newPassword, confirmPassword, displayName });
        }
    }, [currentPassword, newPassword, confirmPassword, displayName, onUpdateDraft]);

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
        setIsDarkTheme(!isDarkTheme)
        alert("El tema claro estará disponible globalmente en una próxima actualización de accesibilidad.");
    }

    const handleShareLink = async () => {
        const link = `https://app.flux.com/invite?ref=${auth.currentUser?.uid || 'user'}`;
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


    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Perfil */}
            <form onSubmit={handleUpdateProfile} className="premium-card" style={{ padding: '20px', background: '#161616', display: 'flex', flexDirection: 'column', gap: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', color: '#888' }}>
                    <User size={16} /> PERFIL DE USUARIO
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '11px', color: '#555', fontWeight: 'bold' }}>NOMBRE PÚBLICO</label>
                    <input
                        type="text"
                        placeholder="Tu nombre"
                        className="input-field"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        style={{ background: '#0a0a0a' }}
                    />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '11px', color: '#555', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Coins size={12} /> MONEDA PRINCIPAL
                    </label>
                    <div style={{ position: 'relative' }}>
                        <select
                            value={selectedCurrency}
                            onChange={(e) => setSelectedCurrency(e.target.value)}
                            style={{
                                width: '100%',
                                background: '#0a0a0a',
                                color: '#fff',
                                border: '1px solid #333',
                                borderRadius: '12px',
                                padding: '12px',
                                fontSize: '14px',
                                appearance: 'none',
                                cursor: 'pointer',
                                outline: 'none'
                            }}
                        >
                            {currencies.map(c => (
                                <option key={c.code} value={c.code} style={{ background: '#111' }}>
                                    {c.name} ({c.symbol})
                                </option>
                            ))}
                        </select>
                        <ChevronDown size={14} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#666', pointerEvents: 'none' }} />
                    </div>
                </div>
                <button type="submit" className="btn-primary" disabled={loading} style={{
                    padding: '12px',
                    fontSize: '13px',
                    background: '#fff',
                    color: '#000',
                    fontWeight: '800'
                }}>
                    {loading ? 'GUARDANDO...' : 'GUARDAR CAMBIOS'}
                </button>
            </form>

            {/* Referidos */}
            <div className="premium-card" style={{ padding: '20px', background: 'linear-gradient(135deg, #111 0%, #1a1a1a 100%)', display: 'flex', flexDirection: 'column', gap: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ background: 'rgba(252, 163, 17, 0.1)', padding: '6px', borderRadius: '8px' }}>
                        <Share2 size={16} color="#fca311" />
                    </div>
                    <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: '#fff' }}>PROGRAMA DE REFERIDOS</h3>
                </div>
                <p style={{ fontSize: '12px', color: '#aaa', lineHeight: '1.5' }}>
                    Invita a tus amigos y obtén <strong>1 mes de Flux PRO gratis</strong> cuando 3 amigos realicen su primer registro con tu enlace.
                </p>
                <button
                    type="button"
                    onClick={handleShareLink}
                    style={{
                        padding: '12px',
                        background: '#fca311',
                        color: '#000',
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
                    <Share2 size={16} /> COMPARTIR MI ENLACE
                </button>
            </div>

            {/* Configuración de Pantalla/Tema */}
            <div className="premium-card" style={{ padding: '20px', background: '#161616', display: 'flex', flexDirection: 'column', gap: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', color: '#888' }}>
                    {isDarkTheme ? <Moon size={16} /> : <Sun size={16} />} APARIENCIA
                </h3>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#fff' }}>Tema Oscuro</span>
                        <span style={{ fontSize: '11px', color: '#666' }}>Interfaz principal</span>
                    </div>
                    {/* Toggle Switch */}
                    <button
                        type="button"
                        onClick={toggleTheme}
                        style={{
                            width: '44px',
                            height: '24px',
                            background: isDarkTheme ? '#4ade80' : '#444',
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
                            background: '#fff',
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
                background: '#161616',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                border: '1px solid rgba(255,255,255,0.05)',
                opacity: isPasswordUser ? 1 : 0.6
            }}>
                <h3 style={{ fontSize: '14px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', color: '#888' }}>
                    <Mail size={16} /> CORREO ELECTRÓNICO
                </h3>

                {!isPasswordUser ? (
                    <div style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <p style={{ fontSize: '12px', color: '#666', textAlign: 'center' }}>
                            Has iniciado sesión con un proveedor externo. Tu correo está vinculado a esa plataforma.
                        </p>
                    </div>
                ) : (
                    <>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <label style={{ fontSize: '11px', color: '#555', fontWeight: 'bold' }}>CORREO ACTUAL</label>
                            <input
                                type="email"
                                className="input-field"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                style={{ background: '#0a0a0a' }}
                                required
                            />
                        </div>
                        <button type="submit" className="btn-primary" disabled={loading} style={{
                            padding: '12px',
                            background: 'linear-gradient(135deg, #333 0%, #111 100%)',
                            color: '#fff',
                            border: '1px solid #444',
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
                background: '#161616',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                border: '1px solid rgba(255,255,255,0.05)',
                opacity: isPasswordUser ? 1 : 0.6
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', color: '#888' }}>
                        <Lock size={16} /> SEGURIDAD
                    </h3>
                    {isPasswordUser && (
                        <button type="button" onClick={() => setShowPasswords(!showPasswords)} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer' }}>
                            {showPasswords ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    )}
                </div>

                {!isPasswordUser ? (
                    <div style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <p style={{ fontSize: '12px', color: '#666', textAlign: 'center' }}>
                            Has iniciado sesión con un proveedor externo. La gestión de contraseña se realiza desde tu cuenta de Google/Apple.
                        </p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <label style={{ fontSize: '11px', color: '#555', fontWeight: 'bold' }}>CONTRASEÑA ACTUAL</label>
                            <input
                                type={showPasswords ? "text" : "password"}
                                className="input-field"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                style={{ background: '#0a0a0a' }}
                                required
                            />
                        </div>
                        <div style={{ height: '1px', background: '#222', margin: '4px 0' }}></div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                            <div style={{ flex: 1, minWidth: '150px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <label style={{ fontSize: '11px', color: '#555', fontWeight: 'bold' }}>NUEVA CONTRASEÑA</label>
                                <input
                                    type={showPasswords ? "text" : "password"}
                                    className="input-field"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    style={{ background: '#0a0a0a' }}
                                    required
                                />
                            </div>
                            <div style={{ flex: 1, minWidth: '150px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <label style={{ fontSize: '11px', color: '#555', fontWeight: 'bold' }}>REPETIR CONTRASEÑA</label>
                                <input
                                    type={showPasswords ? "text" : "password"}
                                    className="input-field"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    style={{ background: '#0a0a0a' }}
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
                    background: isPasswordUser ? 'linear-gradient(135deg, #333 0%, #111 100%)' : '#222',
                    color: isPasswordUser ? '#fff' : '#444',
                    border: '1px solid #444',
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
                <p style={{ fontSize: '12px', color: '#666', lineHeight: '1.5' }}>
                    Al eliminar tu cuenta, todos tus datos financieros serán borrados de forma permanente. No podrás recuperar esta información.
                </p>
                <button
                    onClick={handleDeleteAccount}
                    disabled={loading}
                    style={{
                        padding: '16px',
                        background: '#ef4444',
                        color: '#fff',
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
