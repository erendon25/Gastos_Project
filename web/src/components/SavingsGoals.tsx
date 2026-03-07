import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Plus, X, Target, Trash2, PiggyBank, Edit2, Check } from 'lucide-react';

interface SavingsGoal {
    id: string;
    name: string;
    targetAmount: number;
    currentAmount: number;
    deadline?: string;
    icon: string;
    color: string;
    createdAt: Timestamp;
}

interface SavingsGoalsProps {
    currency?: { code: string; symbol: string };
    user?: any;
    onUpgrade?: () => void;
}

const GOAL_ICONS = ['🎯', '🏠', '✈️', '💻', '🚗', '💍', '🎓', '👶', '🏋️', '📱', '🏖️', '🎸', '🛥️', '🐕', '💰'];
const GOAL_COLORS = ['#818cf8', '#f472b6', '#34d399', '#f59e0b', '#60a5fa', '#a78bfa', '#fb7185', '#14b8a6'];

const SavingsGoals: React.FC<SavingsGoalsProps> = ({ currency = { code: 'PEN', symbol: 'S/' }, user, onUpgrade }) => {
    const [goals, setGoals] = useState<SavingsGoal[]>([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
    const [showAddFunds, setShowAddFunds] = useState<SavingsGoal | null>(null);
    const [fundAmount, setFundAmount] = useState('');

    // Form state
    const [name, setName] = useState('');
    const [targetAmount, setTargetAmount] = useState('');
    const [currentAmount, setCurrentAmount] = useState('');
    const [deadline, setDeadline] = useState('');
    const [selectedIcon, setSelectedIcon] = useState('🎯');
    const [selectedColor, setSelectedColor] = useState('#818cf8');

    useEffect(() => {
        if (!auth.currentUser) return;
        const unsub = onSnapshot(collection(db, 'users', auth.currentUser.uid, 'savingsGoals'), (snap) => {
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as SavingsGoal));
            setGoals(data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
        });
        return () => unsub();
    }, []);

    const resetForm = () => {
        setName(''); setTargetAmount(''); setCurrentAmount(''); setDeadline('');
        setSelectedIcon('🎯'); setSelectedColor('#818cf8');
        setEditingGoal(null);
    };

    const openEdit = (goal: SavingsGoal) => {
        setEditingGoal(goal);
        setName(goal.name);
        setTargetAmount(goal.targetAmount.toString());
        setCurrentAmount(goal.currentAmount.toString());
        setDeadline(goal.deadline || '');
        setSelectedIcon(goal.icon);
        setSelectedColor(goal.color);
        setShowAddModal(true);
    };

    const handleSave = async () => {
        if (!auth.currentUser || !name || !targetAmount) return;
        if (!user?.isPro && goals.length >= 2 && !editingGoal) {
            onUpgrade?.();
            return;
        }
        const data = {
            name,
            targetAmount: parseFloat(targetAmount),
            currentAmount: parseFloat(currentAmount || '0'),
            deadline: deadline || null,
            icon: selectedIcon,
            color: selectedColor,
        };
        if (editingGoal) {
            await updateDoc(doc(db, 'users', auth.currentUser.uid, 'savingsGoals', editingGoal.id), data);
        } else {
            await addDoc(collection(db, 'users', auth.currentUser.uid, 'savingsGoals'), {
                ...data,
                createdAt: Timestamp.now()
            });
        }
        resetForm();
        setShowAddModal(false);
    };

    const handleDelete = async (goal: SavingsGoal) => {
        if (!auth.currentUser) return;
        if (window.confirm(`¿Eliminar la meta "${goal.name}"?`)) {
            await deleteDoc(doc(db, 'users', auth.currentUser.uid, 'savingsGoals', goal.id));
        }
    };

    const handleAddFunds = async () => {
        if (!auth.currentUser || !showAddFunds || !fundAmount) return;
        const add = parseFloat(fundAmount);
        const newCurrent = Math.min(showAddFunds.currentAmount + add, showAddFunds.targetAmount);
        await updateDoc(doc(db, 'users', auth.currentUser.uid, 'savingsGoals', showAddFunds.id), {
            currentAmount: newCurrent
        });
        setShowAddFunds(null);
        setFundAmount('');
    };

    const totalTarget = goals.reduce((s, g) => s + g.targetAmount, 0);
    const totalSaved = goals.reduce((s, g) => s + g.currentAmount, 0);

    return (
        <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 style={{ fontSize: '24px', fontWeight: '800', margin: 0 }}>Metas de Ahorro</h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '4px 0 0 0' }}>
                        {goals.length} {goals.length === 1 ? 'meta activa' : 'metas activas'}
                    </p>
                </div>
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => { resetForm(); setShowAddModal(true); }}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px', borderRadius: '14px', background: '#818cf8', border: 'none', color: 'white', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}
                >
                    <Plus size={16} /> Nueva Meta
                </motion.button>
            </div>

            {/* Summary card */}
            {goals.length > 0 && (
                <div style={{ background: 'linear-gradient(135deg, rgba(129,140,248,0.15) 0%, rgba(244,114,182,0.1) 100%)', borderRadius: '20px', padding: '20px', border: '1px solid rgba(129,140,248,0.2)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                        <div>
                            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0 }}>TOTAL AHORRADO</p>
                            <p style={{ fontSize: '22px', fontWeight: '900', margin: '4px 0 0 0', color: '#818cf8' }}>{currency.symbol} {totalSaved.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0 }}>META TOTAL</p>
                            <p style={{ fontSize: '22px', fontWeight: '900', margin: '4px 0 0 0' }}>{currency.symbol} {totalTarget.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</p>
                        </div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '100px', height: '8px', overflow: 'hidden' }}>
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${totalTarget > 0 ? Math.min((totalSaved / totalTarget) * 100, 100) : 0}%` }}
                            transition={{ duration: 1, ease: 'easeOut' }}
                            style={{ height: '100%', background: 'linear-gradient(90deg, #818cf8, #f472b6)', borderRadius: '100px' }}
                        />
                    </div>
                    <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: '8px 0 0 0', textAlign: 'right' }}>
                        {totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0}% completado
                    </p>
                </div>
            )}

            {/* Goals list */}
            <AnimatePresence>
                {goals.map((goal) => {
                    const percent = goal.targetAmount > 0 ? Math.min((goal.currentAmount / goal.targetAmount) * 100, 100) : 0;
                    const remaining = goal.targetAmount - goal.currentAmount;
                    const isDone = percent >= 100;

                    return (
                        <motion.div
                            key={goal.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            style={{
                                background: isDone ? `${goal.color}12` : 'var(--glass-bg)',
                                borderRadius: '20px',
                                padding: '20px',
                                border: `1px solid ${isDone ? goal.color + '40' : 'var(--glass-border)'}`,
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                                <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: `${goal.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0 }}>
                                    {goal.icon}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <p style={{ fontSize: '16px', fontWeight: '700', margin: 0 }}>{goal.name}</p>
                                    {goal.deadline && (
                                        <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                                            📅 Meta: {new Date(goal.deadline).toLocaleDateString('es-PE', { year: 'numeric', month: 'short', day: 'numeric' })}
                                        </p>
                                    )}
                                </div>
                                <div style={{ display: 'flex', gap: '6px' }}>
                                    <button onClick={() => openEdit(goal)} style={{ background: 'var(--glass-bg)', border: 'none', color: 'var(--text-secondary)', padding: '8px', borderRadius: '10px', cursor: 'pointer' }}><Edit2 size={14} /></button>
                                    <button onClick={() => handleDelete(goal)} style={{ background: 'rgba(239,68,68,0.1)', border: 'none', color: '#ef4444', padding: '8px', borderRadius: '10px', cursor: 'pointer' }}><Trash2 size={14} /></button>
                                </div>
                            </div>

                            {/* Progress bar */}
                            <div style={{ marginBottom: '12px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                                        {currency.symbol} {goal.currentAmount.toLocaleString('es-PE', { minimumFractionDigits: 2 })} ahorrado
                                    </span>
                                    <span style={{ fontSize: '13px', fontWeight: 'bold', color: goal.color }}>
                                        {Math.round(percent)}%
                                    </span>
                                </div>
                                <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '100px', height: '10px', overflow: 'hidden' }}>
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${percent}%` }}
                                        transition={{ duration: 0.8, ease: 'easeOut' }}
                                        style={{ height: '100%', background: isDone ? `linear-gradient(90deg, ${goal.color}, #4ade80)` : `linear-gradient(90deg, ${goal.color}90, ${goal.color})`, borderRadius: '100px' }}
                                    />
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                                    <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                                        {isDone ? '🎉 ¡Meta alcanzada!' : `Falta: ${currency.symbol} ${remaining.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`}
                                    </span>
                                    <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                                        Meta: {currency.symbol} {goal.targetAmount.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                            </div>

                            {!isDone && (
                                <motion.button
                                    whileTap={{ scale: 0.97 }}
                                    onClick={() => { setShowAddFunds(goal); setFundAmount(''); }}
                                    style={{ width: '100%', padding: '12px', borderRadius: '14px', background: `${goal.color}20`, border: `1px solid ${goal.color}40`, color: goal.color, fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                                >
                                    <PiggyBank size={16} /> Agregar fondos
                                </motion.button>
                            )}
                        </motion.div>
                    );
                })}
            </AnimatePresence>

            {goals.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-tertiary)' }}>
                    <Target size={40} color="var(--text-tertiary)" style={{ margin: '0 auto 12px auto', opacity: 0.4 }} />
                    <p style={{ fontSize: '16px', fontWeight: 'bold', margin: '0 0 8px 0' }}>Sin metas de ahorro</p>
                    <p style={{ fontSize: '13px', margin: 0 }}>Crea tu primera meta y empieza a ahorrar con propósito.</p>
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
                            style={{ width: '100%', maxWidth: '450px', background: 'var(--modal-bg)', borderTopLeftRadius: '32px', borderTopRightRadius: '32px', padding: '24px', maxHeight: '85vh', overflowY: 'auto' }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                                <h3 style={{ fontSize: '20px', fontWeight: '800', margin: 0 }}>{editingGoal ? 'Editar Meta' : 'Nueva Meta de Ahorro'}</h3>
                                <button onClick={() => { setShowAddModal(false); resetForm(); }} style={{ background: 'var(--glass-border)', border: 'none', color: 'var(--text-primary)', padding: '8px', borderRadius: '50%', cursor: 'pointer' }}><X size={20} /></button>
                            </div>

                            {/* Icon picker */}
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px', display: 'block' }}>ÍCONO</label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                    {GOAL_ICONS.map(icon => (
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
                                    {GOAL_COLORS.map(color => (
                                        <button key={color} onClick={() => setSelectedColor(color)}
                                            style={{ width: '32px', height: '32px', borderRadius: '50%', background: color, border: selectedColor === color ? '3px solid white' : '3px solid transparent', cursor: 'pointer', transition: '0.2s', boxShadow: selectedColor === color ? `0 0 0 2px ${color}` : 'none' }} />
                                    ))}
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <div>
                                    <label style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>NOMBRE DE LA META</label>
                                    <input value={name} onChange={e => setName(e.target.value)} placeholder='Ej: Laptop nueva, Vacaciones...' className="input-field" />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    <div>
                                        <label style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>MONTO OBJETIVO</label>
                                        <input type="number" step="any" value={targetAmount} onChange={e => setTargetAmount(e.target.value)} placeholder={`${currency.symbol} 0.00`} className="input-field" />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>YA TENGO</label>
                                        <input type="number" step="any" value={currentAmount} onChange={e => setCurrentAmount(e.target.value)} placeholder={`${currency.symbol} 0.00`} className="input-field" />
                                    </div>
                                </div>
                                <div>
                                    <label style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>FECHA LÍMITE (opcional)</label>
                                    <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} className="input-field" />
                                </div>
                                <motion.button
                                    whileTap={{ scale: 0.97 }}
                                    onClick={handleSave}
                                    style={{ padding: '16px', borderRadius: '16px', background: selectedColor, border: 'none', color: 'white', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '8px' }}
                                >
                                    <Check size={20} /> {editingGoal ? 'Guardar Cambios' : 'Crear Meta'}
                                </motion.button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Add Funds Modal */}
            <AnimatePresence>
                {showAddFunds && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            style={{ width: '100%', maxWidth: '340px', background: 'var(--modal-bg)', borderRadius: '28px', padding: '28px', textAlign: 'center', border: `1px solid ${showAddFunds.color}40` }}
                        >
                            <div style={{ fontSize: '40px', marginBottom: '12px' }}>{showAddFunds.icon}</div>
                            <h3 style={{ fontSize: '18px', fontWeight: '800', margin: '0 0 4px 0' }}>Agregar fondos</h3>
                            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 20px 0' }}>{showAddFunds.name}</p>
                            <input
                                type="number" step="any" value={fundAmount} onChange={e => setFundAmount(e.target.value)}
                                placeholder={`${currency.symbol} 0.00`} autoFocus
                                style={{ background: 'var(--glass-bg)', border: `1px solid ${showAddFunds.color}40`, color: 'var(--text-primary)', fontSize: '32px', textAlign: 'center', width: '100%', outline: 'none', fontWeight: '800', borderRadius: '16px', padding: '12px' }}
                            />
                            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                                <button onClick={() => { setShowAddFunds(null); setFundAmount(''); }} style={{ flex: 1, padding: '14px', borderRadius: '14px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', color: 'var(--text-secondary)', fontWeight: 'bold', cursor: 'pointer' }}>Cancelar</button>
                                <button onClick={handleAddFunds} style={{ flex: 1, padding: '14px', borderRadius: '14px', background: showAddFunds.color, border: 'none', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>Agregar</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default SavingsGoals;
