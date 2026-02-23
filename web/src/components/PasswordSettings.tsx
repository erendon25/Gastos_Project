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
            let msg = 'Error al actualizar la contraseña'
            if (error.code === 'auth/wrong-password') msg = 'La contraseña actual es incorrecta'
            setStatus({ type: 'error', message: msg })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Perfil */}
            <form onSubmit={handleUpdateProfile} className="premium-card" style={{ padding: '20px', background: '#161616', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <User size={18} /> Nombre de Usuario
                </h3>
                <div style={{ position: 'relative' }}>
                    <input
                        type="text"
                        placeholder="Tu nombre"
                        className="input-field"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                    />
                </div>
                <button type="submit" className="btn-primary" disabled={loading} style={{ padding: '12px' }}>
                    {loading ? 'Guardando...' : 'Actualizar Nombre'}
                </button>
            </form>

            {/* Contraseña */}
            <form onSubmit={handleChangePassword} className="premium-card" style={{ padding: '20px', background: '#161616', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Lock size={18} /> Seguridad
                    </h3>
                    <button type="button" onClick={() => setShowPasswords(!showPasswords)} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer' }}>
                        {showPasswords ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                        <label style={{ fontSize: '10px', color: '#666', marginBottom: '4px', display: 'block' }}>Contraseña Actual</label>
                        <input
                            type={showPasswords ? "text" : "password"}
                            className="input-field"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            required
                        />
                    </div>
                    <div style={{ height: '1px', background: '#222', margin: '4px 0' }}></div>
                    <div>
                        <label style={{ fontSize: '10px', color: '#666', marginBottom: '4px', display: 'block' }}>Nueva Contraseña</label>
                        <input
                            type={showPasswords ? "text" : "password"}
                            className="input-field"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label style={{ fontSize: '10px', color: '#666', marginBottom: '4px', display: 'block' }}>Confirmar Nueva Contraseña</label>
                        <input
                            type={showPasswords ? "text" : "password"}
                            className="input-field"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                        />
                    </div>
                </div>

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

                <button type="submit" className="btn-primary" disabled={loading} style={{
                    padding: '12px',
                    background: 'linear-gradient(135deg, #333 0%, #111 100%)',
                    color: '#fff',
                    border: '1px solid #444'
                }}>
                    {loading ? 'Actualizando...' : 'Cambiar Contraseña'}
                </button>
            </form>
        </div>
    )
}

export default PasswordSettings
