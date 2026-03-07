import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Plus, X, Wallet, Trash2, Edit2, Check, CreditCard, Banknote, Building2 } from 'lucide-react';

export interface WalletData {
    id: string;
    name: string;
    balance: number;
    currency: string;
    icon: string;
    color: string;
    type: 'cash' | 'bank' | 'credit' | 'digital';
    createdAt: Timestamp;
}

interface WalletsManagerProps {
    currency?: { code: string; symbol: string };
    user?: any;
    onUpgrade?: () => void;
}

const WALLET_ICONS = ['💵', '💳', '🏦', '📱', '👛', '💰', '🪙', '💎', '🏧', '💹'];
const WALLET_COLORS = ['#818cf8', '#34d399', '#f59e0b', '#60a5fa', '#f472b6', '#a78bfa', '#fb7185', '#14b8a6'];
const WALLET_TYPES: Array<{ id: 'cash' | 'bank' | 'credit' | 'digital'; label: string; icon: React.ReactNode }> = [
    { id: 'cash', label: 'Efectivo', icon: <Banknote size={14} /> },
    { id: 'bank', label: 'Banco', icon: <Building2 size={14} /> },
    { id: 'credit', label: 'Crédito', icon: <CreditCard size={14} /> },
    { id: 'digital', label: 'Digital', icon: <Wallet size={14} /> },
];

const WalletsManager: React.FC<WalletsManagerProps> = ({ currency = { code: 'PEN', symbol: 'S/' }, user, onUpgrade }) => {
    const [wallets, setWallets] = useState<WalletData[]>([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingWallet, setEditingWallet] = useState<WalletData | null>(null);

    // Form state
    const [name, setName] = useState('');
    const [balance, setBalance] = useState('');
    const [selectedIcon, setSelectedIcon] = useState('💵');
    const [selectedColor, setSelectedColor] = useState('#818cf8');
    const [walletType, setWalletType] = useState<'cash' | 'bank' | 'credit' | 'digital'>('cash');

    useEffect(() => {
        if (!auth.currentUser) return;
        const uid = auth.currentUser.uid;
        const unsub = onSnapshot(collection(db, 'users', uid, 'wallets'), async (snap) => {
            // Auto-create default wallet if user has none (only on fresh server data, not cache)
            if (snap.docs.length === 0 && !snap.metadata.fromCache) {
                await addDoc(collection(db, 'users', uid, 'wallets'), {
                    name: 'Efectivo',
                    balance: 0,
                    currency: 'PEN',
                    icon: '💵',
                    color: '#34d399',
                    type: 'cash',
                    isDefault: true,
                    createdAt: Timestamp.now()
                });
                return;
            }
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as WalletData));
            setWallets(data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
        });
        return () => unsub();
    }, []);

    const resetForm = () => {
        setName(''); setBalance('');
        setSelectedIcon('💵'); setSelectedColor('#818cf8');
        setWalletType('cash'); setEditingWallet(null);
    };

    const openEdit = (wallet: WalletData) => {
        setEditingWallet(wallet);
        setName(wallet.name);
        setBalance(wallet.balance.toString());
        setSelectedIcon(wallet.icon);
        setSelectedColor(wallet.color);
        setWalletType(wallet.type);
        setShowAddModal(true);
    };

    const handleSave = async () => {
        if (!auth.currentUser || !name) return;
        if (!user?.isPro && wallets.length >= 2 && !editingWallet) {
            onUpgrade?.();
            return;
        }
        const data = {
            name,
            balance: parseFloat(balance || '0'),
            currency: currency.code,
            icon: selectedIcon,
            color: selectedColor,
            type: walletType,
        };
        if (editingWallet) {
            await updateDoc(doc(db, 'users', auth.currentUser.uid, 'wallets', editingWallet.id), data);
        } else {
            await addDoc(collection(db, 'users', auth.currentUser.uid, 'wallets'), {
                ...data,
                createdAt: Timestamp.now()
            });
        }
        resetForm();
        setShowAddModal(false);
    };

    const handleDelete = async (wallet: WalletData) => {
        if (!auth.currentUser) return;
        if (window.confirm(`¿Eliminar la billetera "${wallet.name}"?`)) {
            await deleteDoc(doc(db, 'users', auth.currentUser.uid, 'wallets', wallet.id));
        }
    };

    const totalBalance = wallets.reduce((s, w) => s + (w.balance || 0), 0);

    return (
        <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 style={{ fontSize: '24px', fontWeight: '800', margin: 0 }}>Mis Billeteras</h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '4px 0 0 0' }}>
                        Balance total disponible
                    </p>
                </div>
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => { resetForm(); setShowAddModal(true); }}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px', borderRadius: '14px', background: '#34d399', border: 'none', color: '#0f2920', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}
                >
                    <Plus size={16} /> Nueva
                </motion.button>
            </div>

            {/* Total Balance Card */}
            <div style={{
                background: 'linear-gradient(135deg, rgba(52,211,153,0.15) 0%, rgba(96,165,250,0.1) 100%)',
                borderRadius: '24px', padding: '24px', border: '1px solid rgba(52,211,153,0.2)',
                textAlign: 'center'
            }}>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 8px 0', letterSpacing: '2px', textTransform: 'uppercase' }}>Balance Total</p>
                <p style={{ fontSize: '38px', fontWeight: '900', margin: 0, background: 'linear-gradient(135deg, #34d399, #60a5fa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    {currency.symbol} {totalBalance.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                </p>
                <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', margin: '8px 0 0 0' }}>{wallets.length} {wallets.length === 1 ? 'billetera' : 'billeteras'}</p>
            </div>

            {/* Wallets grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                <AnimatePresence>
                    {wallets.map((wallet) => (
                        <motion.div
                            key={wallet.id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            style={{
                                background: `linear-gradient(135deg, ${wallet.color}15 0%, ${wallet.color}08 100%)`,
                                borderRadius: '20px',
                                padding: '16px',
                                border: `1px solid ${wallet.color}30`,
                                position: 'relative',
                                overflow: 'hidden'
                            }}
                        >
                            {/* Type badge */}
                            <div style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', gap: '4px' }}>
                                <button onClick={() => openEdit(wallet)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'var(--text-secondary)', padding: '5px', borderRadius: '8px', cursor: 'pointer' }}><Edit2 size={12} /></button>
                                <button onClick={() => handleDelete(wallet)} style={{ background: 'rgba(239,68,68,0.15)', border: 'none', color: '#ef4444', padding: '5px', borderRadius: '8px', cursor: 'pointer' }}><Trash2 size={12} /></button>
                            </div>

                            <div style={{ fontSize: '28px', marginBottom: '8px' }}>{wallet.icon}</div>
                            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 4px 0', textTransform: 'uppercase', letterSpacing: '1px' }}>{WALLET_TYPES.find(t => t.id === wallet.type)?.label}</p>
                            <p style={{ fontSize: '14px', fontWeight: '700', margin: '0 0 8px 0' }}>{wallet.name}</p>
                            <p style={{ fontSize: '20px', fontWeight: '800', margin: 0, color: wallet.color }}>
                                {currency.symbol} {(wallet.balance || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                            </p>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {wallets.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-tertiary)' }}>
                    <Wallet size={40} color="var(--text-tertiary)" style={{ margin: '0 auto 12px auto', opacity: 0.4 }} />
                    <p style={{ fontSize: '16px', fontWeight: 'bold', margin: '0 0 8px 0' }}>Sin billeteras</p>
                    <p style={{ fontSize: '13px', margin: 0 }}>Registra tu efectivo, cuentas de banco y tarjetas.</p>
                </div>
            )}

            {/* Add/Edit Modal */}
            <AnimatePresence>
                {showAddModal && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 3000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            style={{ width: '100%', maxWidth: '450px', background: 'var(--modal-bg)', borderTopLeftRadius: '32px', borderTopRightRadius: '32px', padding: '24px', maxHeight: '80vh', overflowY: 'auto' }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                                <h3 style={{ fontSize: '20px', fontWeight: '800', margin: 0 }}>{editingWallet ? 'Editar Billetera' : 'Nueva Billetera'}</h3>
                                <button onClick={() => { setShowAddModal(false); resetForm(); }} style={{ background: 'var(--glass-border)', border: 'none', color: 'var(--text-primary)', padding: '8px', borderRadius: '50%', cursor: 'pointer' }}><X size={20} /></button>
                            </div>

                            {/* Type selector */}
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px', display: 'block' }}>TIPO</label>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                                    {WALLET_TYPES.map(wt => (
                                        <button key={wt.id} onClick={() => setWalletType(wt.id as any)}
                                            style={{ padding: '10px 4px', borderRadius: '12px', border: '1px solid', borderColor: walletType === wt.id ? selectedColor : 'var(--glass-border)', background: walletType === wt.id ? `${selectedColor}20` : 'var(--glass-bg)', color: walletType === wt.id ? 'var(--text-primary)' : 'var(--text-secondary)', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                            {wt.icon} {wt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Icon picker */}
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px', display: 'block' }}>ÍCONO</label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                    {WALLET_ICONS.map(icon => (
                                        <button key={icon} onClick={() => setSelectedIcon(icon)}
                                            style={{ width: '44px', height: '44px', borderRadius: '12px', border: '2px solid', borderColor: selectedIcon === icon ? selectedColor : 'var(--glass-border)', background: selectedIcon === icon ? `${selectedColor}20` : 'var(--glass-bg)', fontSize: '20px', cursor: 'pointer', transition: '0.2s' }}>
                                            {icon}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Color picker */}
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px', display: 'block' }}>COLOR</label>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    {WALLET_COLORS.map(color => (
                                        <button key={color} onClick={() => setSelectedColor(color)}
                                            style={{ width: '32px', height: '32px', borderRadius: '50%', background: color, border: selectedColor === color ? '3px solid white' : '3px solid transparent', cursor: 'pointer', transition: '0.2s', boxShadow: selectedColor === color ? `0 0 0 2px ${color}` : 'none' }} />
                                    ))}
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <div>
                                    <label style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>NOMBRE</label>
                                    <input value={name} onChange={e => setName(e.target.value)} placeholder='Ej: BCP, Efectivo, Yape...' className="input-field" />
                                </div>
                                <div>
                                    <label style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>SALDO ACTUAL</label>
                                    <input type="number" step="any" value={balance} onChange={e => setBalance(e.target.value)} placeholder={`${currency.symbol} 0.00`} className="input-field" />
                                </div>
                                <motion.button
                                    whileTap={{ scale: 0.97 }}
                                    onClick={handleSave}
                                    style={{ padding: '16px', borderRadius: '16px', background: selectedColor, border: 'none', color: 'white', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '8px' }}
                                >
                                    <Check size={20} /> {editingWallet ? 'Guardar Cambios' : 'Crear Billetera'}
                                </motion.button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default WalletsManager;
