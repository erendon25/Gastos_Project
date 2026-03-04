import React, { useState, useEffect, useRef } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, onSnapshot, query, where, Timestamp, setDoc, doc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { getFiscalRange } from '../lib/dateUtils';

interface CategoryBudgetProps {
    currentDate: Date;
    onAddExpense: (category: string) => void;
}

const CategoryBudget: React.FC<CategoryBudgetProps> = ({ currentDate, onAddExpense }) => {
    const [categories, setCategories] = useState<any[]>([]);
    const [budgets, setBudgets] = useState<Record<string, number>>({});
    const [expenses, setExpenses] = useState<Record<string, number>>({});
    const [editingBudget, setEditingBudget] = useState<{ id: string, name: string, current: number } | null>(null);
    const [newBudgetValue, setNewBudgetValue] = useState('');

    // Press & Swipe Logic
    const startY = useRef<number>(0);
    const startX = useRef<number>(0);
    const isPressing = useRef<boolean>(false);
    const swipeDirection = useRef<'h' | 'v' | null>(null);

    useEffect(() => {
        if (!auth.currentUser) return;

        const uid = auth.currentUser.uid;
        const { startTimestamp, endTimestamp } = getFiscalRange(currentDate);

        // 1. Fetch Categories
        const unsubCats = onSnapshot(collection(db, 'users', uid, 'categorias'), (snap) => {
            setCategories(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        // 2. Fetch Budgets
        const unsubBudgets = onSnapshot(collection(db, 'users', uid, 'presupuestos'), (snap) => {
            const bData: Record<string, number> = {};
            snap.docs.forEach(d => {
                bData[d.id] = d.data().amount || 0;
            });
            setBudgets(bData);
        });

        // 3. Fetch Regular Expenses (Only non-recurring)
        const qExp = query(
            collection(db, 'users', uid, 'gastos'),
            where('date', '>=', startTimestamp),
            where('date', '<=', endTimestamp)
        );

        const unsubExp = onSnapshot(qExp, (snap) => {
            const eData: Record<string, number> = {};
            snap.docs.forEach(d => {
                const data = d.data();
                const cat = data.category;
                const amt = data.amount || 0;
                eData[cat] = (eData[cat] || 0) + amt;
            });
            setExpenses(eData);
        });

        return () => { unsubCats(); unsubBudgets(); unsubExp(); };
    }, [currentDate]);

    const handleSaveBudget = async () => {
        if (!editingBudget || !auth.currentUser) return;
        const amt = parseFloat(newBudgetValue) || 0;
        await setDoc(doc(db, 'users', auth.currentUser.uid, 'presupuestos', editingBudget.id), {
            categoryName: editingBudget.name,
            amount: amt,
            updatedAt: Timestamp.now()
        });
        setEditingBudget(null);
        setNewBudgetValue('');
    };

    const [yOffset, setYOffset] = useState<Record<string, number>>({});
    const [activeId, setActiveId] = useState<string | null>(null);

    // Sort categories by spent amount DESC
    const sortedCategories = [...categories].sort((a, b) => {
        const spentA = expenses[a.name] || 0;
        const spentB = expenses[b.name] || 0;
        return spentB - spentA;
    });

    const handleTouchStart = (id: string, e: React.TouchEvent) => {
        startY.current = e.touches[0].clientY;
        startX.current = e.touches[0].clientX;
        isPressing.current = true;
        swipeDirection.current = null;
        setActiveId(id);
    };

    const handleTouchMove = (id: string, e: React.TouchEvent) => {
        if (!isPressing.current) return;

        const currentY = e.touches[0].clientY;
        const currentX = e.touches[0].clientX;
        const diffY = startY.current - currentY;
        const diffX = startX.current - currentX;

        // Determine direction on first significant movement
        if (!swipeDirection.current) {
            if (Math.abs(diffX) > 10) {
                swipeDirection.current = 'h';
                isPressing.current = false; // Allow horizontal scroll
                setActiveId(null);
                return;
            } else if (Math.abs(diffY) > 10) {
                swipeDirection.current = 'v';
            } else {
                return; // Not enough movement yet
            }
        }

        if (swipeDirection.current === 'v') {
            // Dampen the movement
            setYOffset({ [id]: -diffY * 0.5 });
        }
    };

    const handleTouchEnd = (catId: string, catName: string, budget: number, e: React.TouchEvent) => {
        const endY = e.changedTouches[0].clientY;
        const diffY = startY.current - endY;

        if (isPressing.current && swipeDirection.current === 'v') {
            if (diffY > 80) { // Swipe up
                setEditingBudget({ id: catId, name: catName, current: budget });
                setNewBudgetValue(budget.toString());
            } else if (diffY < -80) { // Swipe down
                onAddExpense(catName);
            }
        }
        isPressing.current = false;
        swipeDirection.current = null;
        setActiveId(null);
        setYOffset({});
    };

    return (
        <div style={{ padding: '20px 0', overflowX: 'auto', display: 'flex', gap: '16px', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {sortedCategories.map(cat => {
                const spent = expenses[cat.name] || 0;
                const budget = budgets[cat.id] || 0;
                const percent = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0;
                const hasBudget = budget > 0;
                const isCurrentActive = activeId === cat.id;

                return (
                    <motion.div
                        key={cat.id}
                        onTouchStart={(e) => handleTouchStart(cat.id, e)}
                        onTouchMove={(e) => handleTouchMove(cat.id, e)}
                        onTouchEnd={(e) => handleTouchEnd(cat.id, cat.name, budget, e)}
                        animate={{
                            y: yOffset[cat.id] || 0,
                            scale: isCurrentActive ? 0.95 : 1,
                            borderColor: isCurrentActive ? '#818cf8' : (hasBudget ? 'var(--text-tertiary)' : 'var(--border-color)')
                        }}
                        style={{
                            minWidth: '100px',
                            height: '160px',
                            background: 'var(--card-bg)',
                            borderRadius: '24px',
                            position: 'relative',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'flex-end',
                            padding: '16px 8px',
                            border: '1px solid',
                            borderStyle: hasBudget ? 'dashed' : 'solid',
                            overflow: 'hidden',
                            touchAction: 'pan-x'
                        }}
                    >
                        {/* Fill Progress */}
                        <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: `${percent}%` }}
                            style={{
                                position: 'absolute',
                                bottom: 0,
                                left: 0,
                                right: 0,
                                background: percent > 100 ? 'rgba(248, 113, 113, 0.2)' : 'rgba(129, 138, 248, 0.15)',
                                zIndex: 0
                            }}
                        />

                        {/* Content */}
                        <div style={{ zIndex: 1, textAlign: 'center' }}>
                            {percent >= 100 && hasBudget && (
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    style={{ position: 'absolute', top: 8, right: 8 }}
                                >
                                    <AlertTriangle size={16} color="#ef4444" />
                                </motion.div>
                            )}
                            <span style={{ fontSize: '24px', display: 'block', marginBottom: '8px' }}>{cat.emoji}</span>
                            <p style={{ fontSize: '14px', fontWeight: 'bold' }}>{spent.toLocaleString()}</p>
                            {hasBudget && (
                                <p style={{ fontSize: '10px', color: percent >= 100 ? '#ef4444' : 'var(--text-secondary)', fontWeight: percent >= 100 ? 'bold' : 'normal' }}>
                                    {Math.round(percent)}% de {budget}
                                </p>
                            )}
                            <p style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{cat.name}</p>
                        </div>
                    </motion.div>
                );
            })}

            {/* Edit Budget Modal */}
            <AnimatePresence>
                {editingBudget && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="premium-card"
                            style={{ width: '100%', maxWidth: '320px', background: 'var(--card-bg)' }}
                        >
                            <h3 style={{ marginBottom: '16px', fontSize: '16px' }}>Presupuesto: {editingBudget.name}</h3>
                            <input
                                type="number"
                                className="input-field"
                                autoFocus
                                value={newBudgetValue}
                                onChange={(e) => setNewBudgetValue(e.target.value)}
                                placeholder="Monto mensual"
                                style={{ marginBottom: '20px' }}
                            />
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button onClick={() => setEditingBudget(null)} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid var(--glass-border)', background: 'none', color: 'var(--text-primary)' }}>Cancelar</button>
                                <button onClick={handleSaveBudget} className="btn-primary" style={{ flex: 1, padding: '12px' }}>Guardar</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default CategoryBudget;
