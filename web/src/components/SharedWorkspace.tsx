import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    collection, onSnapshot, addDoc, updateDoc, deleteDoc,
    doc, Timestamp, query, where, getDocs
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Plus, X, Users, UserPlus, Copy, Check, Trash2 } from 'lucide-react';
import { useMotionValue, useTransform } from 'framer-motion';

interface Workspace {
    id: string;
    name: string;
    ownerId: string;
    members: string[];
    memberEmails: string[];
    createdAt: Timestamp;
    baseCurrency: string;
}

interface SharedWorkspaceProps {
    user?: any;
    currency?: { code: string; symbol: string };
    onUpgrade?: () => void;
}

const SwipeableWorkspace = ({ workspace, ownerId, onDelete, children }: { workspace: Workspace; ownerId: string; onDelete: (ws: Workspace) => void; children: React.ReactNode }) => {
    const x = useMotionValue(0);
    const background = useTransform(x, [-100, 0], ["#ef4444", "rgba(255, 255, 255, 0)"]);
    const opacityRight = useTransform(x, [-100, -50], [1, 0]);

    const handleDragEnd = (_: any, info: any) => {
        if (info.offset.x < -100 && workspace.ownerId === ownerId) {
            onDelete(workspace);
        }
    };

    return (
        <div style={{ position: 'relative', overflow: 'hidden', borderRadius: '20px', marginBottom: '0px' }}>
            <motion.div style={{
                position: 'absolute', inset: 0, display: 'flex', justifyContent: 'flex-end', alignItems: 'center',
                padding: '0 24px', background, borderRadius: '20px'
            }}>
                <motion.div style={{ opacity: opacityRight, display: 'flex', alignItems: 'center', gap: '8px', color: 'white' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '14px' }}>Eliminar</span> <Trash2 size={20} />
                </motion.div>
            </motion.div>

            <motion.div
                drag={workspace.ownerId === ownerId ? "x" : false}
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.7}
                onDragEnd={handleDragEnd}
                style={{ x, position: 'relative', zIndex: 1, touchAction: 'none' }}
            >
                {children}
            </motion.div>
        </div>
    );
};

const SharedWorkspace: React.FC<SharedWorkspaceProps> = ({ user, currency = { code: 'PEN', symbol: 'S/' }, onUpgrade }) => {
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showInviteModal, setShowInviteModal] = useState<Workspace | null>(null);
    const [newWorkspaceName, setNewWorkspaceName] = useState('');
    const [inviteEmail, setInviteEmail] = useState('');
    const [copied, setCopied] = useState(false);
    const [_loading, setLoading] = useState(true);
    const [statusMsg, setStatusMsg] = useState('');

    useEffect(() => {
        if (!auth.currentUser) return;
        const uid = auth.currentUser.uid;
        const unsub = onSnapshot(collection(db, 'users', uid, 'workspaces'), (snap) => {
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Workspace));
            setWorkspaces(data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
            setLoading(false);
        });
        return () => unsub();
    }, []);

    const handleCreate = async () => {
        if (!auth.currentUser || !newWorkspaceName) return;
        if (!user?.isPro) {
            onUpgrade?.();
            return;
        }
        const uid = auth.currentUser.uid;
        const data: any = {
            name: newWorkspaceName,
            ownerId: uid,
            ownerEmail: auth.currentUser.email || '',
            members: [uid],
            memberEmails: [auth.currentUser.email || ''],
            memberNames: [auth.currentUser.displayName || auth.currentUser.email?.split('@')[0] || 'Tú'],
            baseCurrency: currency.code,
            createdAt: Timestamp.now()
        };
        await addDoc(collection(db, 'users', uid, 'workspaces'), data);
        setNewWorkspaceName('');
        setShowCreateModal(false);
    };

    const handleInvite = async (workspace: Workspace) => {
        if (!auth.currentUser || !inviteEmail) return;
        setStatusMsg('Buscando usuario...');

        try {
            // Real user lookup via users_public collection
            const q = query(collection(db, 'users_public'), where('email', '==', inviteEmail));
            const snap = await getDocs(q);

            const wsRef = doc(db, 'users', auth.currentUser.uid, 'workspaces', workspace.id);
            const currentEmails = workspace.memberEmails || [];
            const currentMembers = workspace.members || [];

            if (!snap.empty) {
                // User found in app — add as full member
                const foundUser = snap.docs[0];
                const foundUid = foundUser.id;
                const foundName = (foundUser.data() as any).displayName || inviteEmail;

                if (!currentMembers.includes(foundUid)) {
                    await updateDoc(wsRef, {
                        members: [...currentMembers, foundUid],
                        memberEmails: [...currentEmails, inviteEmail],
                    });
                    // Also add workspace to found user's account
                    await addDoc(collection(db, 'users', foundUid, 'workspaces'), {
                        name: workspace.name,
                        ownerId: auth.currentUser.uid,
                        ownerEmail: auth.currentUser.email,
                        members: [...currentMembers, foundUid],
                        memberEmails: [...currentEmails, inviteEmail],
                        baseCurrency: workspace.baseCurrency,
                        linkedFrom: workspace.id,
                        createdAt: Timestamp.now()
                    });
                    setStatusMsg(`✅ ${foundName} agregado al grupo`);
                } else {
                    setStatusMsg('Este usuario ya es miembro');
                }
            } else {
                // User not in app — store pending invitation
                await addDoc(collection(db, 'invitations'), {
                    workspaceId: workspace.id,
                    workspaceName: workspace.name,
                    ownerId: auth.currentUser.uid,
                    ownerEmail: auth.currentUser.email,
                    ownerName: auth.currentUser.displayName || auth.currentUser.email?.split('@')[0],
                    inviteeEmail: inviteEmail,
                    status: 'pending',
                    createdAt: Timestamp.now()
                });
                if (!currentEmails.includes(inviteEmail)) {
                    await updateDoc(wsRef, {
                        memberEmails: [...currentEmails, `${inviteEmail} ⏳`]
                    });
                }
                setStatusMsg('📧 Sin cuenta aún — invitación pendiente');
            }
            setInviteEmail('');
            setTimeout(() => setStatusMsg(''), 3500);
        } catch {
            setStatusMsg('Error al enviar invitación');
            setTimeout(() => setStatusMsg(''), 2500);
        }
    };

    const handleDelete = async (workspace: Workspace) => {
        if (!auth.currentUser) return;
        if (workspace.ownerId !== auth.currentUser.uid) {
            alert('Solo el creador puede eliminar este grupo.');
            return;
        }
        if (window.confirm(`¿Eliminar el grupo "${workspace.name}"?`)) {
            await deleteDoc(doc(db, 'users', auth.currentUser.uid, 'workspaces', workspace.id));
        }
    };

    const copyInviteLink = (workspace: Workspace) => {
        const link = `${window.location.origin}?joinWorkspace=${workspace.id}&owner=${auth.currentUser?.uid}`;
        navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 style={{ fontSize: '24px', fontWeight: '800', margin: 0 }}>Presupuesto Compartido</h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '4px 0 0 0' }}>
                        Gestiona finanzas con pareja, familia o roomies
                    </p>
                </div>
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowCreateModal(true)}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px', borderRadius: '14px', background: '#f472b6', border: 'none', color: 'white', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}
                >
                    <Plus size={16} /> Crear Grupo
                </motion.button>
            </div>

            {!user?.isPro && (
                <div style={{ background: 'linear-gradient(135deg, rgba(244,114,182,0.12), rgba(129,140,248,0.1))', borderRadius: '20px', padding: '24px', border: '1px solid rgba(244,114,182,0.3)', textAlign: 'center' }}>
                    <div style={{ fontSize: '40px', marginBottom: '12px' }}>👥</div>
                    <p style={{ fontSize: '16px', fontWeight: '800', margin: '0 0 6px 0' }}>Presupuesto Compartido</p>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 20px 0' }}>Crea grupos con tu pareja, familia o compañeros de cuarto para gestionar finanzas juntos.</p>
                    <motion.button
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => onUpgrade?.()}
                        style={{ width: '100%', padding: '14px', borderRadius: '16px', background: 'linear-gradient(135deg, #f472b6, #818cf8)', border: 'none', color: 'white', fontWeight: '800', fontSize: '15px', cursor: 'pointer' }}
                    >
                        ✨ Actualizar a Pro
                    </motion.button>
                    <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', margin: '12px 0 0 0' }}>Invita usando su correo si ya tienen la app, o comparte tu link de referido</p>
                </div>
            )}

            {/* Workspaces list */}
            <AnimatePresence>
                {workspaces.map(ws => (
                    <SwipeableWorkspace key={ws.id} workspace={ws} ownerId={auth.currentUser?.uid || ''} onDelete={handleDelete}>
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            style={{ background: 'var(--glass-bg)', borderRadius: '20px', padding: '20px', border: '1px solid var(--glass-border)', marginBottom: '16px' }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                                <div style={{ width: '44px', height: '44px', borderRadius: '14px', background: 'rgba(244,114,182,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Users size={22} color="#f472b6" />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <p style={{ fontSize: '16px', fontWeight: '700', margin: 0 }}>{ws.name}</p>
                                    <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                                        {ws.memberEmails?.length || 1} {ws.memberEmails?.length === 1 ? 'miembro' : 'miembros'} • {ws.ownerId === auth.currentUser?.uid ? 'Tú eres el dueño' : 'Miembro'}
                                    </p>
                                </div>
                                <div style={{ display: 'flex', gap: '6px' }}>
                                    {ws.ownerId === auth.currentUser?.uid && (
                                        <button onClick={() => handleDelete(ws)} style={{ background: 'rgba(239,68,68,0.1)', border: 'none', color: '#ef4444', padding: '8px', borderRadius: '10px', cursor: 'pointer' }}><Trash2 size={14} /></button>
                                    )}
                                </div>
                            </div>

                            {/* Members list */}
                            {ws.memberEmails && ws.memberEmails.length > 0 && (
                                <div style={{ marginBottom: '14px' }}>
                                    <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Miembros</p>
                                    {ws.memberEmails.map((email, i) => (
                                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: i < ws.memberEmails.length - 1 ? '1px solid var(--glass-bg)' : 'none' }}>
                                            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: i === 0 ? 'rgba(244,114,182,0.2)' : 'var(--glass-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700' }}>
                                                {email[0]?.toUpperCase()}
                                            </div>
                                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', flex: 1 }}>{email}</span>
                                            {i === 0 && <span style={{ fontSize: '10px', background: 'rgba(244,114,182,0.15)', color: '#f472b6', padding: '3px 8px', borderRadius: '20px', fontWeight: '600' }}>Dueño</span>}
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    onClick={() => { setShowInviteModal(ws); setInviteEmail(''); setStatusMsg(''); }}
                                    style={{ flex: 1, padding: '10px', borderRadius: '12px', background: 'rgba(244,114,182,0.1)', border: '1px solid rgba(244,114,182,0.25)', color: '#f472b6', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                                >
                                    <UserPlus size={14} /> Invitar
                                </button>
                                <button
                                    onClick={() => copyInviteLink(ws)}
                                    style={{ flex: 1, padding: '10px', borderRadius: '12px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', color: 'var(--text-secondary)', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                                >
                                    {copied ? <Check size={14} color="#34d399" /> : <Copy size={14} />} {copied ? 'Copiado' : 'Copiar link'}
                                </button>
                            </div>
                        </motion.div>
                    </SwipeableWorkspace>
                ))}
            </AnimatePresence>

            {workspaces.length === 0 && user?.isPro && (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-tertiary)' }}>
                    <Users size={40} color="var(--text-tertiary)" style={{ margin: '0 auto 12px auto', opacity: 0.4 }} />
                    <p style={{ fontSize: '16px', fontWeight: 'bold', margin: '0 0 8px 0' }}>Sin grupos creados</p>
                    <p style={{ fontSize: '13px', margin: 0 }}>Crea un grupo para compartir el presupuesto con tu pareja o familia.</p>
                </div>
            )}

            {/* Create Modal */}
            <AnimatePresence>
                {showCreateModal && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            style={{ width: '100%', maxWidth: '380px', background: 'var(--modal-bg)', borderRadius: '28px', padding: '28px', border: '1px solid var(--glass-border)' }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                                <h3 style={{ fontSize: '18px', fontWeight: '800', margin: 0, color: 'var(--text-primary)' }}>Crear Grupo</h3>
                                <button onClick={() => setShowCreateModal(false)} style={{ background: 'var(--glass-border)', border: 'none', color: 'var(--text-primary)', padding: '8px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={18} /></button>
                            </div>
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px', display: 'block' }}>NOMBRE DEL GRUPO</label>
                                <input
                                    value={newWorkspaceName}
                                    onChange={e => setNewWorkspaceName(e.target.value)}
                                    placeholder='Ej: Casa, Pareja, Vacaciones...'
                                    className="input-field"
                                    autoFocus
                                />
                            </div>
                            <button onClick={handleCreate} style={{ width: '100%', padding: '14px', borderRadius: '16px', background: '#f472b6', border: 'none', color: 'white', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer' }}>
                                Crear Grupo
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Invite Modal */}
            <AnimatePresence>
                {showInviteModal && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            style={{ width: '100%', maxWidth: '380px', background: 'var(--modal-bg)', borderRadius: '28px', padding: '28px', border: '1px solid var(--glass-border)' }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <div>
                                    <h3 style={{ fontSize: '18px', fontWeight: '800', margin: 0, color: 'var(--text-primary)' }}>Invitar miembro</h3>
                                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>{showInviteModal.name}</p>
                                </div>
                                <button onClick={() => setShowInviteModal(null)} style={{ background: 'var(--glass-border)', border: 'none', color: 'var(--text-primary)', padding: '8px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={18} /></button>
                            </div>
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px', display: 'block' }}>CORREO DEL MIEMBRO</label>
                                <input
                                    type="email"
                                    value={inviteEmail}
                                    onChange={e => setInviteEmail(e.target.value)}
                                    placeholder='correo@ejemplo.com'
                                    className="input-field"
                                    autoFocus
                                />
                            </div>
                            {statusMsg && (
                                <p style={{ fontSize: '13px', color: statusMsg.startsWith('✅') ? '#34d399' : '#f59e0b', marginBottom: '12px', textAlign: 'center' }}>{statusMsg}</p>
                            )}
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button onClick={() => setShowInviteModal(null)} style={{ flex: 1, padding: '12px', borderRadius: '14px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', color: 'var(--text-secondary)', fontWeight: 'bold', cursor: 'pointer' }}>Cancelar</button>
                                <button onClick={() => handleInvite(showInviteModal)} style={{ flex: 2, padding: '12px', borderRadius: '14px', background: '#f472b6', border: 'none', color: 'white', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                    <UserPlus size={14} /> Enviar Invitación
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default SharedWorkspace;
