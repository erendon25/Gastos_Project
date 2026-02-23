import React, { useState, useEffect } from 'react'
import { auth } from '../lib/firebase'
import { updatePassword, updateProfile, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth'
import { Lock, User, Check, AlertCircle, Eye, EyeOff } from 'lucide-react'

interface PasswordSettingsProps {
    draftData?: any;
    onUpdateDraft?: (data: any) => void;
}

const PasswordSettings: React.FC<PasswordSettingsProps> = ({ draftData, onUpdateDraft }) => {
    const [currentPassword, setCurrentPassword] = useState(draftData?.currentPassword || '')
    const [newPassword, setNewPassword] = useState(draftData?.newPassword || '')
    const [confirmPassword, setConfirmPassword] = useState(draftData?.confirmPassword || '')
    const [displayName, setDisplayName] = useState(draftData?.displayName || (auth.currentUser?.displayName || ''))
    const [loading, setLoading] = useState(false)
    const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null)
    const [showPasswords, setShowPasswords] = useState(false)

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
        </div>
    )
}

export default PasswordSettings
