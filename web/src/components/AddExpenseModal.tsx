import React, { useState, useEffect } from 'react';
import { X, Trash2, ChevronRight, Repeat, CheckCircle, Circle } from 'lucide-react';
import { motion } from 'framer-motion';
import { addDoc, collection, Timestamp, onSnapshot, query, updateDoc, doc, deleteDoc, getDocs } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import SpeechButton from './SpeechButton';
import { CATEGORIES as DEFAULT_CATEGORIES, getCategoryByText } from '../lib/categories';

interface AddExpenseModalProps {
    onClose: () => void;
    editItem?: any;
    editType?: 'expense' | 'income' | 'recurring' | 'debt';
    presetCategory?: string | null;
    draftData?: any;
    onUpdateDraft?: (data: any) => void;
    user?: any;
    currency?: { code: string, symbol: string };
}

// Helper to avoid timezone shifts when parsing YYYY-MM-DD
const parseLocalDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
};

// Helper to format Date to YYYY-MM-DD in local time
const formatLocalDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const AddExpenseModal: React.FC<AddExpenseModalProps> = ({ onClose, editItem, editType, presetCategory, draftData, onUpdateDraft, user, currency = { code: 'PEN', symbol: 'S/' } }) => {
    const [amount, setAmount] = useState(editItem ? editItem.amount.toString() : (draftData?.amount || ''));
    const [description, setDescription] = useState(editItem ? editItem.description : (draftData?.description || ''));
    const [type, setType] = useState<'expense' | 'income' | 'debt'>(() => {
        if (editItem) {
            if (editItem.collection?.includes('ingresos') || editItem.type === 'income') return 'income';
            if (editItem.collection === 'prestamos' || editItem.type === 'debt') return 'debt';
            return 'expense';
        }
        if (draftData?.type) return draftData.type;
        return editType === 'income' ? 'income' : (editType === 'debt' ? 'debt' : 'expense');
    });
    const [isRecurring, setIsRecurring] = useState(() => {
        if (editItem) return editItem.collection?.includes('recurrentes') || editType === 'recurring' || !!editItem.recurringDay;
        if (draftData?.isRecurring !== undefined) return draftData.isRecurring;
        return editType === 'recurring';
    });
    const [category, setCategory] = useState(() => {
        if (editItem) return editItem.category;
        if (presetCategory) return presetCategory;
        if (draftData?.category) return draftData.category;
        if (editType === 'income' || type === 'income') return 'Ingresos';
        return DEFAULT_CATEGORIES[0].name;
    });
    const [autoDebit, setAutoDebit] = useState(editItem?.autoDebit ?? (draftData?.autoDebit ?? true));
    const [selectedDate, setSelectedDate] = useState(() => {
        if (editItem?.date) return formatLocalDate(editItem.date.toDate());
        if (draftData?.date) return draftData.date;
        return formatLocalDate(new Date());
    });
    const [selectedTime, setSelectedTime] = useState(() => {
        if (editItem?.date) {
            const d = editItem.date.toDate();
            return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        }
        const now = new Date();
        return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    });

    const [totalLoanAmount, setTotalLoanAmount] = useState(editItem?.totalLoanAmount?.toString() || (draftData?.totalLoanAmount || ''));
    const [paidQuotas, setPaidQuotas] = useState(editItem?.paidQuotas?.toString() || (draftData?.paidQuotas || '0'));
    const [remainingAmount, setRemainingAmount] = useState(editItem?.remainingAmount?.toString() || (draftData?.remainingAmount || ''));

    const [startDate, setStartDate] = useState(
        editItem?.startDate ? formatLocalDate(editItem.startDate.toDate()) : (draftData?.startDate || formatLocalDate(new Date()))
    );
    const [dueDate, setDueDate] = useState(
        editItem?.dueDate ? formatLocalDate(editItem.dueDate.toDate()) : (draftData?.dueDate || formatLocalDate(new Date()))
    );
    const [recurringDay, setRecurringDay] = useState(editItem?.recurringDay?.toString() || (draftData?.recurringDay || new Date().getDate().toString()));
    const [debtSubtype, setDebtSubtype] = useState<'loan' | 'insurance'>(editItem?.debtSubtype || (draftData?.debtSubtype || 'loan'));

    const [allCategories, setAllCategories] = useState<any[]>(DEFAULT_CATEGORIES);
    const [showRecurringChoice, setShowRecurringChoice] = useState(false);
    const [pendingData, setPendingData] = useState<any>(null);

    useEffect(() => {
        if (!auth.currentUser) return;
        const q = query(collection(db, 'users', auth.currentUser.uid, 'categorias'));
        const unsub = onSnapshot(q, (snap: any) => {
            const userCats = snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data(), isUserCat: true }));
            // Si el usuario tiene categorías propias, NO mostramos las del sistema (como solicitó el usuario)
            if (userCats.length > 0) {
                setAllCategories(userCats);
            } else {
                setAllCategories(DEFAULT_CATEGORIES);
            }
        });
        return () => unsub();
    }, []);

    useEffect(() => {
        if (onUpdateDraft && !editItem) {
            onUpdateDraft({
                amount, description, type, isRecurring, category, autoDebit,
                totalLoanAmount, paidQuotas, remainingAmount, startDate, dueDate,
                recurringDay, debtSubtype
            });
        }
    }, [amount, description, type, isRecurring, category, autoDebit, totalLoanAmount, paidQuotas, remainingAmount, startDate, dueDate, recurringDay, debtSubtype]);

    const handleVoiceResult = (text: string) => {
        // Advanced Amount Detection (handles decimals and common separators)
        const amountMatch = text.replace(',', '.').match(/\d+(\.\d*)?/);
        if (amountMatch) setAmount(amountMatch[0]);

        // Clean description (remove common filler words for better display)
        let cleanText = text.charAt(0).toUpperCase() + text.slice(1);
        setDescription(cleanText);

        // Advanced Category Detection
        const normalizedText = text.toLowerCase();

        // Check all current categories (System + User)
        const match = allCategories.find(cat => {
            const nameMatch = normalizedText.includes(cat.name.toLowerCase());
            const keywordMatch = cat.keywords?.some((k: string) => normalizedText.includes(k.toLowerCase()));
            return nameMatch || keywordMatch;
        });

        if (normalizedText.includes('ingreso') || normalizedText.includes('gane') || normalizedText.includes('recibi')) {
            setType('income');
            setCategory('Ingresos');
        } else if (match) {
            setCategory(match.name);
            // Auto-switch type based on category or keywords
            if (match.id === 'prestamos' || normalizedText.includes('prestamo') || normalizedText.includes('deuda')) {
                setType('debt');
            }
        } else {
            // Fallback to library detection
            const detected = getCategoryByText(text);
            setCategory(detected.name);
            if (detected.id === 'prestamos') setType('debt');
        }
    };

    const handleSave = async (scope: 'single' | 'future' = 'future') => {
        if (!amount || !auth.currentUser) return;

        onClose();
        if (onUpdateDraft) onUpdateDraft(null);

        // Encontrar el emoji de la categoría seleccionada
        const selectedCat = allCategories.find(c => c.name === category);
        const categoryEmoji = selectedCat?.emoji || (selectedCat?.icon ? null : '📦');

        const data: any = pendingData || {
            amount: parseFloat(amount),
            description,
            category,
            categoryEmoji,
            isRecurring: type === 'debt' ? true : isRecurring,
            autoDebit: type === 'debt' ? false : (isRecurring ? autoDebit : false),
            paid: editItem ? editItem.paid : (type === 'income' ? (!isRecurring) : (isRecurring && autoDebit)),
            recurringDay: isRecurring ? parseInt(recurringDay) : null
        };

        // Date Handling
        const [year, month, day] = selectedDate.split('-').map(Number);
        const [hours, mins] = selectedTime.split(':').map(Number);
        const finalDate = new Date(year, month - 1, day, hours, mins);
        data.date = Timestamp.fromDate(finalDate);

        if (type === 'debt') {
            data.startDate = Timestamp.fromDate(parseLocalDate(startDate));
            data.dueDate = Timestamp.fromDate(parseLocalDate(dueDate));
            data.debtSubtype = debtSubtype;
            if (debtSubtype === 'loan') {
                data.totalLoanAmount = parseFloat(totalLoanAmount || '0');
                data.remainingAmount = parseFloat(remainingAmount || '0');
                data.paidQuotas = parseInt(paidQuotas || '0');
            } else {
                data.totalLoanAmount = 0;
                data.remainingAmount = 0;
                data.paidQuotas = 0;
                data.autoDebit = true;
            }
        }

        try {
            if (editItem) {
                if (editType === 'recurring' && scope === 'single') {
                    // "Solo este registro": Mover a la colección de gastos normales para este mes
                    // y dejar el recurrente original intacto (o podrías marcarlo como 'saltado')
                    // Por ahora, simplemente lo guardamos como un gasto normal y el usuario verá el cambio solo ahí.

                    if (!user?.isPro) {
                        // Check if they are over global limits before allowing to add an exception
                        const snapRec = await getDocs(query(collection(db, 'users', auth.currentUser.uid, 'gastos_recurrentes')));
                        if (snapRec.size > 3) {
                            alert('Tienes más gastos fijos de los que permite la versión Gratis. ¡Actualízate a Flux PRO para continuar usándolos!');
                            return;
                        }
                    }

                    await addDoc(collection(db, 'users', auth.currentUser.uid, 'gastos'), {
                        ...data,
                        description: `${data.description} (Excepción ${new Date().toLocaleString('es-ES', { month: 'short' })})`
                    });
                    return;
                }

                const colMap: any = {
                    'recurring': 'gastos_recurrentes',
                    'recurring_income': 'ingresos_recurrentes',
                    'debt': 'prestamos',
                    'income': 'ingresos',
                    'expense': 'gastos'
                };

                // Prioritize collection stored in item, fallback to mapping
                const col = editItem.collection || (
                    editType === 'recurring' ? (type === 'income' ? 'ingresos_recurrentes' : 'gastos_recurrentes') :
                        colMap[editType || type || 'expense'] || 'gastos'
                );

                if (!user?.isPro) {
                    if (col === 'gastos_recurrentes') {
                        const snapRec = await getDocs(query(collection(db, 'users', auth.currentUser.uid, 'gastos_recurrentes')));
                        if (snapRec.size > 3) {
                            alert('Tienes más suscripciones/gastos fijos de los que permite la versión Gratis. ¡Actualízate a Flux PRO para poder editarlos y continuar!');
                            return;
                        }
                    }
                    if (col === 'prestamos') {
                        const snapDebt = await getDocs(query(collection(db, 'users', auth.currentUser.uid, 'prestamos')));
                        if (snapDebt.size > 1) {
                            alert('Tienes más deudas/seguros de los que permite la versión Gratis. ¡Actualízate a Flux PRO para poder editarlos y continuar!');
                            return;
                        }
                    }
                }

                const docRef = doc(db, 'users', auth.currentUser.uid, col, editItem.id);
                await updateDoc(docRef, data);
            } else {
                let collectionName = 'gastos';
                const isPro = user?.isPro || false;

                // Validación general de límites caídos en Tier Free
                if (!isPro) {
                    const snapRec = await getDocs(query(collection(db, 'users', auth.currentUser.uid, 'gastos_recurrentes')));
                    const snapDebt = await getDocs(query(collection(db, 'users', auth.currentUser.uid, 'prestamos')));

                    if (snapRec.size > 3 || snapDebt.size > 1) {
                        alert('Tienes más registros activos (Fijos/Deudas) de los que permite la versión Gratis. ¡Actualízate a Flux PRO para continuar registrando movimientos!');
                        return;
                    }
                }

                if (type === 'income') {
                    collectionName = isRecurring ? 'ingresos_recurrentes' : 'ingresos';
                }
                else if (type === 'debt') {
                    if (!isPro) {
                        const snap = await getDocs(query(collection(db, 'users', auth.currentUser.uid, 'prestamos')));
                        if (snap.size >= 1) {
                            alert('Límite de la versión Gratis alcanzado: Solo puedes tener 1 deuda o seguro. ¡Actualízate a Flux PRO para deudas ilimitadas!');
                            return;
                        }
                    }
                    collectionName = 'prestamos';
                }
                else if (isRecurring) {
                    if (!isPro) {
                        const snap = await getDocs(query(collection(db, 'users', auth.currentUser.uid, 'gastos_recurrentes')));
                        if (snap.size >= 3) {
                            alert('Límite de la versión Gratis alcanzado: Solo puedes tener 3 suscripciones o gastos fijos automatizados. ¡Pásate a Flux PRO!');
                            return;
                        }
                    }
                    collectionName = 'gastos_recurrentes';
                }

                await addDoc(collection(db, 'users', auth.currentUser.uid, collectionName), data);

                // Lógica de referido para el primer gasto
                if (user && !user.hasAddedFirstExpense) {
                    try {
                        await updateDoc(doc(db, 'users', auth.currentUser.uid), { hasAddedFirstExpense: true });
                        await updateDoc(doc(db, 'referrals', auth.currentUser.uid), {
                            status: 'completed',
                            completedAt: new Date().toISOString()
                        });
                    } catch (e) {
                        // Ignoramos el error si no hay documento de referido
                    }
                }
            }
        } catch (err) {
            console.error("Error saving:", err);
        }
    };

    const onFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editItem && editType === 'recurring') {
            setPendingData({
                amount: parseFloat(amount),
                description,
                category,
                autoDebit,
                isRecurring: true
            });
            setShowRecurringChoice(true);
        } else {
            handleSave('future');
        }
    };

    const handleDelete = async () => {
        if (!editItem || !auth.currentUser) return;
        if (window.confirm('¿Estás seguro de que deseas eliminar este registro?')) {
            onClose();
            const col = editType === 'recurring' ? 'gastos_recurrentes' : (editType === 'debt' ? 'prestamos' : (editType === 'income' ? 'ingresos' : 'gastos'));
            await deleteDoc(doc(db, 'users', auth.currentUser.uid, col, editItem.id));
        }
    };

    if (showRecurringChoice) {
        return (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(15px)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                <div style={{ width: '100%', maxWidth: '380px', background: '#1c1c1e', borderRadius: '24px', padding: '32px', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                    <div style={{ width: '64px', height: '64px', background: 'rgba(129, 138, 248, 0.1)', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px auto' }}>
                        <Repeat size={32} color="#818cf8" />
                    </div>
                    <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '12px' }}>¿Cómo aplicar el cambio?</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.5', marginBottom: '32px' }}>
                        Estás editando un gasto fijo. ¿Deseas que este nuevo monto se aplique a todos los meses futuros o solo como una excepción para este mes?
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <button
                            onClick={() => handleSave('future')}
                            style={{ width: '100%', padding: '16px', borderRadius: '14px', background: '#818cf8', color: 'var(--text-primary)', border: 'none', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>Todos los meses</span>
                            <ChevronRight size={18} />
                        </button>
                        <button
                            onClick={() => handleSave('single')}
                            style={{ width: '100%', padding: '16px', borderRadius: '14px', background: 'var(--glass-bg)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', fontWeight: '500', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>Solo este mes</span>
                            <ChevronRight size={18} />
                        </button>
                        <button
                            onClick={() => setShowRecurringChoice(false)}
                            style={{ width: '100%', padding: '12px', marginTop: '8px', color: 'var(--text-secondary)', background: 'none', border: 'none', fontSize: '14px' }}>
                            Cancelar
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 3000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
            <motion.div
                drag="y"
                dragConstraints={{ top: 0 }}
                dragElastic={0.2}
                onDragEnd={(_, info) => {
                    if (info.offset.y > 150) onClose();
                }}
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                style={{
                    width: '100%',
                    maxWidth: '450px',
                    background: '#1c1c1e',
                    borderTopLeftRadius: '32px',
                    borderTopRightRadius: '32px',
                    padding: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '20px',
                    maxHeight: '92vh',
                    position: 'relative'
                }}>

                {/* Fixed Header with Close Button */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingBottom: '10px',
                    borderBottom: '1px solid var(--glass-bg)'
                }}>
                    <h2 style={{ fontSize: '18px', fontWeight: 'bold' }}>{editItem ? 'Editar Registro' : 'Nuevo Registro'}</h2>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {editItem && (
                            <button onClick={handleDelete} style={{ background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: '#ef4444', padding: '8px', borderRadius: '50%' }}>
                                <Trash2 size={18} />
                            </button>
                        )}
                        <button onClick={onClose} style={{ background: 'var(--glass-border)', border: 'none', color: 'var(--text-primary)', padding: '10px', borderRadius: '50%', cursor: 'pointer' }}>
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Scrollable Content */}
                <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '20px' }}>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', background: 'var(--bg-color)', padding: '6px', borderRadius: '20px', gap: '6px' }}>
                        <button type="button" onClick={() => { setType('expense'); setIsRecurring(false); }}
                            style={{ padding: '12px 4px', borderRadius: '14px', border: 'none', background: type === 'expense' && !isRecurring ? 'var(--text-primary)' : 'transparent', color: type === 'expense' && !isRecurring ? 'var(--bg-color)' : 'var(--text-secondary)', fontWeight: 'bold', fontSize: '11px', transition: '0.2s' }}>Gasto</button>

                        <button type="button" onClick={() => { setType('expense'); setIsRecurring(true); }}
                            style={{ padding: '12px 4px', borderRadius: '14px', border: 'none', background: isRecurring && type === 'expense' ? '#818cf8' : 'transparent', color: isRecurring && type === 'expense' ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: 'bold', fontSize: '11px', transition: '0.2s' }}>G. Fijo</button>

                        <button type="button" onClick={() => { setType('debt'); setIsRecurring(false); }}
                            style={{ padding: '12px 4px', borderRadius: '14px', border: 'none', background: type === 'debt' ? '#ef4444' : 'transparent', color: type === 'debt' ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: 'bold', fontSize: '11px', transition: '0.2s' }}>Deuda</button>

                        <button type="button" onClick={() => { setType('income'); setIsRecurring(false); setCategory('Ingresos'); }}
                            style={{ padding: '12px 4px', borderRadius: '14px', border: 'none', background: type === 'income' && !isRecurring ? '#4ade80' : 'transparent', color: type === 'income' && !isRecurring ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: 'bold', fontSize: '11px', transition: '0.2s' }}>Ingreso</button>

                        <button type="button" onClick={() => { setType('income'); setIsRecurring(true); setCategory('Ingresos'); }}
                            style={{ padding: '12px 4px', borderRadius: '14px', background: type === 'income' && isRecurring ? '#22c55e' : 'transparent', color: type === 'income' && isRecurring ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: 'bold', fontSize: '11px', transition: '0.2s', border: type === 'income' && isRecurring ? '2px solid var(--text-primary)' : 'none' }}>I. Fijo</button>
                    </div>

                    <form onSubmit={onFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ textAlign: 'center' }}>
                            <input type="number" step="any" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" style={{ background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: '48px', textAlign: 'center', width: '100%', outline: 'none', fontWeight: '800' }} required autoFocus />
                        </div>

                        <input
                            type="text"
                            placeholder={type === 'income' ? "¿De qué es este ingreso?" : (presetCategory ? "¿Detalle o local?" : "¿En qué gastaste?")}
                            className="input-field"
                            value={description}
                            onChange={(e) => {
                                const val = e.target.value;
                                setDescription(val);
                                if (type !== 'income' && !presetCategory && val.length > 2) {
                                    const normalizedText = val.toLowerCase();
                                    const match = allCategories.find((cat: any) => {
                                        const nameMatch = normalizedText.includes(cat.name.toLowerCase());
                                        const keywordMatch = cat.keywords?.some((k: string) => normalizedText.includes(k.toLowerCase()));
                                        return nameMatch || keywordMatch;
                                    });
                                    if (match) {
                                        setCategory(match.name);
                                    }
                                }
                            }} required
                        />

                        <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '12px', background: 'var(--glass-bg)', padding: '12px', borderRadius: '16px', border: '1px solid var(--glass-border)' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <label style={{ fontSize: '10px', color: 'var(--text-secondary)', marginLeft: '4px' }}>Fecha</label>
                                <input
                                    type="date"
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    style={{ background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }}
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <label style={{ fontSize: '10px', color: 'var(--text-secondary)', marginLeft: '4px' }}>Hora</label>
                                <input
                                    type="time"
                                    value={selectedTime}
                                    onChange={(e) => setSelectedTime(e.target.value)}
                                    style={{ background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }}
                                />
                            </div>
                        </div>

                        {type !== 'income' && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                                {allCategories.map((cat: any) => {
                                    const isSelected = category === cat.name;
                                    const color = cat.color || 'var(--text-primary)';
                                    const Icon = cat.icon;

                                    return (
                                        <button key={cat.id || cat.name} type="button" onClick={() => setCategory(cat.name)}
                                            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', padding: '10px 4px', borderRadius: '14px', border: '1px solid', borderColor: isSelected ? color : 'var(--border-color)', background: isSelected ? `${color}15` : '#1c1c1e', cursor: 'pointer', transition: '0.2s' }}>
                                            {cat.emoji ? (
                                                <span style={{ fontSize: '18px' }}>{cat.emoji}</span>
                                            ) : (
                                                <Icon size={18} color={isSelected ? color : 'var(--text-tertiary)'} />
                                            )}
                                            <span style={{ fontSize: '9px', color: isSelected ? 'var(--text-primary)' : 'var(--text-tertiary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>{cat.name}</span>
                                        </button>
                                    )
                                })}
                            </div>
                        )}
                        {type === 'debt' && (
                            <div style={{ background: 'rgba(239, 68, 68, 0.05)', padding: '16px', borderRadius: '16px', border: '1px solid rgba(239, 68, 68, 0.2)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div style={{ display: 'flex', background: '#1c1c1e', padding: '4px', borderRadius: '12px', gap: '4px' }}>
                                    <button type="button" onClick={() => setDebtSubtype('loan')} style={{ flex: 1, padding: '8px', borderRadius: '10px', border: 'none', background: debtSubtype === 'loan' ? '#ef4444' : 'transparent', color: 'var(--text-primary)', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>Préstamo</button>
                                    <button type="button" onClick={() => setDebtSubtype('insurance')} style={{ flex: 1, padding: '8px', borderRadius: '10px', border: 'none', background: debtSubtype === 'insurance' ? '#ef4444' : 'transparent', color: 'var(--text-primary)', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>Seguro</button>
                                </div>

                                {debtSubtype === 'loan' && (
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                        <div>
                                            <label style={{ fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>Monto Préstamo Total</label>
                                            <input type="number" step="any" value={totalLoanAmount} onChange={(e) => setTotalLoanAmount(e.target.value)} className="input-field" style={{ padding: '8px', fontSize: '12px' }} placeholder={`${currency.symbol} 0.00`} />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>Saldo Restante</label>
                                            <input type="number" step="any" value={remainingAmount} onChange={(e) => setRemainingAmount(e.target.value)} className="input-field" style={{ padding: '8px', fontSize: '12px', borderColor: '#441111' }} placeholder={`${currency.symbol} 0.00`} />
                                        </div>
                                    </div>
                                )}

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    <div>
                                        <label style={{ fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>Inicio</label>
                                        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input-field" style={{ padding: '8px', fontSize: '12px' }} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '10px', color: '#ef4444', marginBottom: '4px', display: 'block' }}>{debtSubtype === 'insurance' ? 'Fin Vigencia' : 'Prox. Pago'}</label>
                                        <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="input-field" style={{ padding: '8px', fontSize: '12px', borderColor: '#441111' }} />
                                    </div>
                                </div>

                                {debtSubtype === 'loan' && (
                                    <div>
                                        <label style={{ fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>Cuotas Pagadas</label>
                                        <input type="number" value={paidQuotas} onChange={(e) => setPaidQuotas(e.target.value)} className="input-field" style={{ padding: '8px', fontSize: '12px' }} placeholder="0" />
                                    </div>
                                )}
                            </div>
                        )}

                        {(isRecurring || type === 'debt') && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {isRecurring && type !== 'debt' && (
                                    <div style={{ background: '#1c1c1e', padding: '16px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                                        <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px', display: 'block' }}>Día del mes para el registro</label>
                                        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px' }}>
                                            {[...Array(31)].map((_, i) => (
                                                <button
                                                    key={i + 1}
                                                    type="button"
                                                    onClick={() => setRecurringDay((i + 1).toString())}
                                                    style={{
                                                        minWidth: '40px',
                                                        height: '40px',
                                                        borderRadius: '10px',
                                                        border: '1px solid',
                                                        borderColor: recurringDay === (i + 1).toString() ? (type === 'income' ? '#4ade80' : '#818cf8') : 'var(--border-color)',
                                                        background: recurringDay === (i + 1).toString() ? (type === 'income' ? 'rgba(74, 222, 128, 0.1)' : 'rgba(129, 138, 248, 0.1)') : 'transparent',
                                                        color: recurringDay === (i + 1).toString() ? 'var(--text-primary)' : 'var(--text-secondary)',
                                                        fontSize: '14px',
                                                        fontWeight: 'bold',
                                                        flexShrink: 0
                                                    }}
                                                >
                                                    {i + 1}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {!presetCategory?.includes('Ocio') && (
                                    <div onClick={() => setAutoDebit(!autoDebit)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', borderRadius: '16px', background: autoDebit ? (type === 'income' ? 'rgba(74, 222, 128, 0.1)' : 'rgba(129, 138, 248, 0.1)') : '#1c1c1e', border: '1px solid', borderColor: autoDebit ? (type === 'income' ? '#4ade80' : '#818cf8') : 'var(--border-color)', cursor: 'pointer' }}>
                                        {autoDebit ? <CheckCircle size={20} color={type === 'income' ? '#4ade80' : '#818cf8'} /> : <Circle size={20} color="#666" />}
                                        <div style={{ flex: 1 }}>
                                            <p style={{ fontSize: '14px', fontWeight: 'bold', color: autoDebit ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{type === 'income' ? 'Ingreso Automático' : 'Pago Automático'}</p>
                                            <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{autoDebit ? 'Se resta/suma solo sin confirmar' : 'Solo se restará si le das al "check"'}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                            {!editItem && <SpeechButton onResult={handleVoiceResult} />}
                            <button type="submit" className="btn-primary"
                                style={{ flex: 1, padding: '16px', background: type === 'income' ? '#4ade80' : (type === 'debt' ? '#ef4444' : (isRecurring ? '#818cf8' : 'var(--text-primary)')), color: type === 'income' || isRecurring || type === 'debt' ? 'var(--text-primary)' : 'var(--bg-color)' }}>
                                {editItem ? 'Guardar Cambios' : 'Confirmar Registro'}
                            </button>
                        </div>
                    </form>
                </div>
            </motion.div>
        </div>
    );
};

export default AddExpenseModal;
