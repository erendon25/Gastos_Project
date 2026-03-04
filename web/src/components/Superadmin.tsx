import React, { useState, useEffect } from 'react';
import { collection, getDocs, collectionGroup, getCountFromServer, doc, updateDoc } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { db, auth } from '../lib/firebase';
import { Users, TrendingUp, TrendingDown, Star, Search, X, Loader2, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Superadmin: React.FC = () => {
    const [stats, setStats] = useState({
        totalUsers: 0,
        proUsers: 0,
        freeUsers: 0,
        totalReferrals: 0,
        totalGastos: 0,
        totalIngresos: 0,
    });
    const [usersList, setUsersList] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);

    // Modal states
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [showUserModal, setShowUserModal] = useState(false);
    const [proDays, setProDays] = useState(30);
    const [updatingPro, setUpdatingPro] = useState(false);
    const [resettingPassword, setResettingPassword] = useState(false);
    const [actionMessage, setActionMessage] = useState({ text: '', type: '' });

    useEffect(() => {
        const fetchStats = async () => {
            if (auth.currentUser?.email !== 'erickrendon18@gmail.com') return;

            try {
                // Usuarios
                const usersSnap = await getDocs(collection(db, 'users'));
                const usersCount = usersSnap.size;
                let proCount = 0;

                const loadedUsers: any[] = [];

                usersSnap.forEach(userDoc => {
                    const data = userDoc.data();
                    const isCreator = data.email === 'erickrendon18@gmail.com';
                    const isProActive = data.isPro || isCreator || (data.proUntil && new Date(data.proUntil) > new Date());
                    if (isProActive) {
                        proCount++;
                    }
                    loadedUsers.push({
                        uid: userDoc.id,
                        isProActive,
                        ...data
                    });
                });

                setUsersList(loadedUsers);

                // Referidos
                const referralsSnap = await getCountFromServer(collection(db, 'referrals'));
                const referralsCount = referralsSnap.data().count;

                // Gastos e Ingresos totales (Normales + Recurrentes)
                const gastosSnap = await getCountFromServer(collectionGroup(db, 'gastos'));
                const gastosRecurrentesSnap = await getCountFromServer(collectionGroup(db, 'gastos_recurrentes'));

                const ingresosSnap = await getCountFromServer(collectionGroup(db, 'ingresos'));
                const ingresosRecurrentesSnap = await getCountFromServer(collectionGroup(db, 'ingresos_recurrentes'));

                setStats({
                    totalUsers: usersCount,
                    proUsers: proCount,
                    freeUsers: usersCount - proCount,
                    totalReferrals: referralsCount,
                    totalGastos: gastosSnap.data().count + gastosRecurrentesSnap.data().count,
                    totalIngresos: ingresosSnap.data().count + ingresosRecurrentesSnap.data().count
                });
            } catch (error) {
                console.error('Error fetching admin stats', error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    const handleGrantPro = async () => {
        if (!selectedUser) return;
        setUpdatingPro(true);
        setActionMessage({ text: '', type: '' });

        try {
            const newProUntil = new Date();
            newProUntil.setDate(newProUntil.getDate() + proDays);

            await updateDoc(doc(db, 'users', selectedUser.uid), {
                proUntil: newProUntil.toISOString(),
                isPro: false // We use proUntil for temporary PRO
            });

            // Update local state
            setUsersList(prev => prev.map(u => {
                if (u.uid === selectedUser.uid) {
                    return { ...u, proUntil: newProUntil.toISOString(), isProActive: true }
                }
                return u;
            }));

            setSelectedUser({ ...selectedUser, proUntil: newProUntil.toISOString(), isProActive: true });
            setActionMessage({ text: `Se otorgaron ${proDays} días PRO con éxito.`, type: 'success' });

            // Update stats
            if (!selectedUser.isProActive) {
                setStats(prev => ({ ...prev, proUsers: prev.proUsers + 1, freeUsers: prev.freeUsers - 1 }));
            }

        } catch (error) {
            console.error("Error updating user", error);
            setActionMessage({ text: 'Error al actualizar usuario.', type: 'error' });
        } finally {
            setUpdatingPro(false);
        }
    };

    const handleResetPassword = async () => {
        if (!selectedUser?.email) {
            setActionMessage({ text: 'El usuario no tiene correo registrado.', type: 'error' });
            return;
        }

        // Cannot reset password for google only sign in, check if it's possible though Firebase sends the email regardless
        setResettingPassword(true);
        setActionMessage({ text: '', type: '' });

        try {
            await sendPasswordResetEmail(auth, selectedUser.email);
            setActionMessage({ text: `Correo de reseteo enviado a ${selectedUser.email}.`, type: 'success' });
        } catch (error) {
            console.error("Error sending reset email", error);
            setActionMessage({ text: 'Error al enviar correo de reseteo. Probablemente usa Google Sign-In exclusivamente.', type: 'error' });
        } finally {
            setResettingPassword(false);
        }
    };

    const filteredUsers = usersList.filter(u => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        const matchesName = u.displayName ? u.displayName.toLowerCase().includes(term) : false;
        const matchesEmail = u.email ? u.email.toLowerCase().includes(term) : false;
        return matchesName || matchesEmail;
    });

    if (auth.currentUser?.email !== 'erickrendon18@gmail.com') {
        return (
            <div style={{ padding: '20px', textAlign: 'center', color: 'red' }}>
                No tienes permiso para ver esta pantalla.
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '30px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h1 style={{ fontSize: '24px', fontWeight: '900' }}>Panel Superadmin</h1>
            </div>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
                    <Loader2 className="loader" size={32} />
                </div>
            ) : (
                <>
                    {/* Stats Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                        <div className="premium-card" style={{ padding: '20px', background: 'var(--card-bg)', borderRadius: '24px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ background: 'rgba(129, 138, 248, 0.1)', width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Users size={20} color="#818cf8" />
                            </div>
                            <div>
                                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>USUARIOS TOTALES</p>
                                <h2 style={{ fontSize: '32px', fontWeight: '900', margin: '4px 0 0 0' }}>{stats.totalUsers}</h2>
                            </div>
                        </div>

                        <div className="premium-card" style={{ padding: '20px', background: 'var(--card-bg)', borderRadius: '24px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ background: 'rgba(74, 222, 128, 0.1)', width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Star size={20} color="#4ade80" />
                            </div>
                            <div>
                                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>USUARIOS PRO</p>
                                <h2 style={{ fontSize: '32px', fontWeight: '900', margin: '4px 0 0 0', color: '#4ade80' }}>{stats.proUsers}</h2>
                            </div>
                        </div>

                        <div className="premium-card" style={{ padding: '20px', background: 'var(--card-bg)', borderRadius: '24px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ background: 'rgba(252, 163, 17, 0.1)', width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Users size={20} color="#fca311" />
                            </div>
                            <div>
                                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>USUARIOS FREE</p>
                                <h2 style={{ fontSize: '32px', fontWeight: '900', margin: '4px 0 0 0' }}>{stats.freeUsers}</h2>
                            </div>
                        </div>

                        <div className="premium-card" style={{ padding: '20px', background: 'var(--card-bg)', borderRadius: '24px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ background: 'rgba(239, 68, 68, 0.1)', width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <TrendingDown size={20} color="#ef4444" />
                            </div>
                            <div>
                                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>MOV. GASTOS (DIARIOS + FIJOS)</p>
                                <h2 style={{ fontSize: '32px', fontWeight: '900', margin: '4px 0 0 0' }}>{stats.totalGastos}</h2>
                            </div>
                        </div>

                        <div className="premium-card" style={{ padding: '20px', background: 'var(--card-bg)', borderRadius: '24px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ background: 'rgba(74, 222, 128, 0.1)', width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <TrendingUp size={20} color="#4ade80" />
                            </div>
                            <div>
                                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>MOV. INGRESOS (DIARIOS + FIJOS)</p>
                                <h2 style={{ fontSize: '32px', fontWeight: '900', margin: '4px 0 0 0' }}>{stats.totalIngresos}</h2>
                            </div>
                        </div>

                        <div className="premium-card" style={{ padding: '20px', background: 'var(--card-bg)', borderRadius: '24px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ background: 'rgba(59, 130, 246, 0.1)', width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Users size={20} color="#3b82f6" />
                            </div>
                            <div>
                                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>REFERIDOS</p>
                                <h2 style={{ fontSize: '32px', fontWeight: '900', margin: '4px 0 0 0' }}>{stats.totalReferrals}</h2>
                            </div>
                        </div>
                    </div>

                    {/* Users Management Section */}
                    <div style={{ marginTop: '16px' }}>
                        <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '16px' }}>Gestión de Usuarios</h2>

                        <div style={{ position: 'relative', marginBottom: '16px' }}>
                            <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                            <input
                                type="text"
                                placeholder="Buscar por nombre o correo..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{
                                    width: '100%', padding: '14px 14px 14px 44px', borderRadius: '16px',
                                    border: '1px solid var(--border-color)', background: 'var(--card-bg)',
                                    color: 'var(--text-primary)', fontSize: '15px'
                                }}
                            />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {filteredUsers.length === 0 ? (
                                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)', background: 'var(--card-bg)', borderRadius: '16px' }}>
                                    No se encontraron usuarios
                                </div>
                            ) : (
                                filteredUsers.map((u) => (
                                    <div
                                        key={u.uid}
                                        onClick={() => {
                                            setSelectedUser(u);
                                            setShowUserModal(true);
                                            setActionMessage({ text: '', type: '' });
                                            setProDays(30);
                                        }}
                                        style={{
                                            padding: '16px', background: 'var(--card-bg)', borderRadius: '16px', border: '1px solid var(--border-color)', cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden' }}>
                                            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--brand-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', flexShrink: 0 }}>
                                                {u.displayName ? u.displayName.charAt(0).toUpperCase() : <HelpCircle size={20} />}
                                            </div>
                                            <div style={{ overflow: 'hidden' }}>
                                                <p style={{ fontWeight: 'bold', fontSize: '15px', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {u.displayName || 'Sin nombre'}
                                                </p>
                                                <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {u.email || 'Sin correo'}
                                                </p>
                                            </div>
                                        </div>
                                        <div>
                                            {u.isProActive ? (
                                                <span style={{ padding: '4px 8px', background: 'rgba(74, 222, 128, 0.1)', color: '#4ade80', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold' }}>PRO</span>
                                            ) : (
                                                <span style={{ padding: '4px 8px', background: 'rgba(252, 163, 17, 0.1)', color: '#fca311', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold' }}>FREE</span>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </>
            )}

            {/* Individual User Modal */}
            <AnimatePresence>
                {showUserModal && selectedUser && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
                        onClick={() => setShowUserModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            style={{ background: 'var(--bg-color)', width: '100%', maxWidth: '400px', borderRadius: '28px', padding: '24px', position: 'relative', border: '1px solid var(--glass-border)' }}
                        >
                            <button
                                onClick={() => setShowUserModal(false)}
                                style={{ position: 'absolute', top: '20px', right: '20px', background: 'var(--card-bg)', border: 'none', width: '32px', height: '32px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)', cursor: 'pointer' }}
                            >
                                <X size={18} />
                            </button>

                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', marginBottom: '24px', marginTop: '10px' }}>
                                <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--brand-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '32px' }}>
                                    {selectedUser.displayName ? selectedUser.displayName.charAt(0).toUpperCase() : '?'}
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <h2 style={{ fontSize: '20px', fontWeight: '900', margin: 0, display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                                        {selectedUser.displayName || 'Usuario Desconocido'}
                                        {selectedUser.isProActive && <span style={{ padding: '4px 8px', background: 'rgba(74, 222, 128, 0.1)', color: '#4ade80', borderRadius: '8px', fontSize: '10px', fontWeight: 'bold' }}>PRO</span>}
                                    </h2>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>{selectedUser.email}</p>
                                    <p style={{ color: 'var(--text-tertiary)', fontSize: '11px', marginTop: '4px' }}>ID: {selectedUser.uid}</p>
                                </div>
                            </div>

                            {actionMessage.text && (
                                <div style={{ padding: '12px', borderRadius: '12px', marginBottom: '20px', fontSize: '13px', background: actionMessage.type === 'success' ? 'rgba(74, 222, 128, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: actionMessage.type === 'success' ? '#4ade80' : '#ef4444' }}>
                                    {actionMessage.text}
                                </div>
                            )}

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {/* Pro Control */}
                                <div style={{ background: 'var(--card-bg)', padding: '16px', borderRadius: '20px', border: '1px solid var(--border-color)' }}>
                                    <h3 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Star size={16} color="#fca311" /> Otorgar PRO
                                    </h3>
                                    {selectedUser.proUntil && new Date(selectedUser.proUntil) > new Date() && (
                                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                                            Activo hasta: {new Date(selectedUser.proUntil).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                                        </p>
                                    )}
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <input
                                            type="number"
                                            value={proDays}
                                            onChange={(e) => setProDays(Number(e.target.value))}
                                            style={{
                                                width: '80px', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)',
                                                background: 'var(--bg-color)', color: 'var(--text-primary)', textAlign: 'center', fontWeight: 'bold'
                                            }}
                                        />
                                        <button
                                            onClick={handleGrantPro}
                                            disabled={updatingPro}
                                            style={{
                                                flex: 1, padding: '12px', borderRadius: '12px', border: 'none', background: 'var(--text-primary)', color: 'var(--bg-color)',
                                                fontWeight: 'bold', cursor: updatingPro ? 'not-allowed' : 'pointer', opacity: updatingPro ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center'
                                            }}
                                        >
                                            {updatingPro ? <Loader2 size={18} className="loader" style={{ border: '2px solid transparent', borderTop: '2px solid var(--bg-color)' }} /> : `Dar ${proDays} días`}
                                        </button>
                                    </div>
                                </div>

                                {/* Danger Actions */}
                                <div style={{ background: 'rgba(239, 68, 68, 0.05)', padding: '16px', borderRadius: '20px', border: '1px solid rgba(239, 68, 68, 0.1)' }}>
                                    <h3 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '12px', color: '#ef4444' }}>Seguridad</h3>
                                    <button
                                        onClick={handleResetPassword}
                                        disabled={resettingPassword}
                                        style={{
                                            width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.2)', background: 'transparent',
                                            color: '#ef4444', fontWeight: 'bold', cursor: resettingPassword ? 'not-allowed' : 'pointer', opacity: resettingPassword ? 0.7 : 1,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                                        }}
                                    >
                                        {resettingPassword ? <Loader2 size={18} className="loader" style={{ borderTopColor: '#ef4444', borderLeftColor: '#ef4444', borderRightColor: '#ef4444' }} /> : 'Enviar Enlace de Reset Contraseña'}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Superadmin;

