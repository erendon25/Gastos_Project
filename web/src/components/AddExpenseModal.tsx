import React, { useState, useEffect } from 'react';
import { X, Save, Repeat, CheckCircle, Circle, Calendar, Plus } from 'lucide-react';
import { addDoc, collection, serverTimestamp, Timestamp, onSnapshot, query } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import SpeechButton from './SpeechButton';
import { CATEGORIES as DEFAULT_CATEGORIES, getCategoryByText } from '../lib/categories';

interface AddExpenseModalProps {
    onClose: () => void;
}

const AddExpenseModal: React.FC<AddExpenseModalProps> = ({ onClose }) => {
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState(DEFAULT_CATEGORIES[0].name);
    const [type, setType] = useState<'expense' | 'income' | 'debt'>('expense');
    const [isRecurring, setIsRecurring] = useState(false);
    const [autoDebit, setAutoDebit] = useState(true);
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [allCategories, setAllCategories] = useState<any[]>(DEFAULT_CATEGORIES);

    useEffect(() => {
        if (!auth.currentUser) return;
        const q = query(collection(db, 'users', auth.currentUser.uid, 'categories'));
        const unsub = onSnapshot(q, (snap) => {
            const userCats = snap.docs.map(doc => ({ id: doc.id, ...doc.data(), isUserCat: true }));
            setAllCategories([...DEFAULT_CATEGORIES, ...userCats]);
        });
        return () => unsub();
    }, []);

    const handleVoiceResult = (text: string) => {
        const amountMatch = text.match(/\d+/);
        if (amountMatch) setAmount(amountMatch[0]);
        setDescription(text);
        const detected = getCategoryByText(text);
        setCategory(detected.name);
        if (detected.id === 'prestamos' || detected.id === 'seguros') setType('debt');
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (loading) return; // Prevent double clicks
        if (!amount || !auth.currentUser) return;

        try {
            setLoading(true);
            setError(null);

            let collectionName = 'expenses';
            if (type === 'income') collectionName = 'income';
            else if (type === 'debt') collectionName = 'debts';
            else if (isRecurring) collectionName = 'recurring_expenses';

            const data: any = {
                amount: parseFloat(amount),
                description,
                category,
                date: serverTimestamp(),
                isRecurring: type === 'debt' ? true : isRecurring,
                autoDebit: type === 'debt' ? false : (isRecurring ? autoDebit : false),
                paid: (type === 'income' || (isRecurring && autoDebit)) ? true : false,
            };

            if (type === 'debt') {
                data.startDate = Timestamp.fromDate(new Date(startDate));
                data.dueDate = Timestamp.fromDate(new Date(dueDate));
            }

            console.log(`Guardando en ${collectionName}...`, data);
            await addDoc(collection(db, 'users', auth.currentUser.uid, collectionName), data);
            console.log("Guardado con éxito!");

            // Es importante llamar a onClose() ANTES de que el componente intente 
            // actualizar su propio estado cargando si el componente se va a desmontar.
            onClose();
        } catch (err: any) {
            console.error("Error al guardar:", err);
            setError(err.message || "Error desconocido al guardar");
            setLoading(false); // Solo bajamos el loading si hubo error para que el usuario pueda reintentar
        }
    };

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 2000, display: 'flex', alignItems: 'flex-end' }}>
            <div style={{ width: '100%', maxWidth: '450px', margin: '0 auto', background: '#1c1c1e', borderTopLeftRadius: '32px', borderTopRightRadius: '32px', padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: '20px', maxHeight: '95vh', overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: 'bold' }}>{loading ? 'Guardando...' : 'Nuevo Registro'}</h2>
                    <button onClick={onClose} disabled={loading} style={{ background: '#333', border: 'none', color: '#fff', padding: '6px', borderRadius: '50%', opacity: loading ? 0.5 : 1 }}>
                        <X size={18} />
                    </button>
                </div>

                {error && (
                    <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', fontSize: '12px', textAlign: 'center' }}>
                        {error}
                    </div>
                )}

                <div style={{ display: 'flex', background: '#000', padding: '4px', borderRadius: '16px', opacity: loading ? 0.5 : 1, pointerEvents: loading ? 'none' : 'auto' }}>
                    <button type="button" onClick={() => { setType('expense'); setIsRecurring(false); }} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', background: type === 'expense' && !isRecurring ? '#fff' : 'transparent', color: type === 'expense' && !isRecurring ? '#000' : '#666', fontWeight: 'bold', fontSize: '11px' }}>Gasto</button>
                    <button type="button" onClick={() => { setType('expense'); setIsRecurring(true); }} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', background: isRecurring && type !== 'debt' ? '#818cf8' : 'transparent', color: isRecurring && type !== 'debt' ? '#fff' : '#666', fontWeight: 'bold', fontSize: '11px' }}>Recurrente</button>
                    <button type="button" onClick={() => { setType('debt'); setIsRecurring(false); }} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', background: type === 'debt' ? '#ef4444' : 'transparent', color: type === 'debt' ? '#fff' : '#666', fontWeight: 'bold', fontSize: '11px' }}>Deuda</button>
                    <button type="button" onClick={() => { setType('income'); setIsRecurring(false); }} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', background: type === 'income' ? '#4ade80' : 'transparent', color: type === 'income' ? '#fff' : '#666', fontWeight: 'bold', fontSize: '11px' }}>Ingreso</button>
                </div>

                <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px', opacity: loading ? 0.7 : 1, pointerEvents: loading ? 'none' : 'auto' }}>
                    <div style={{ textAlign: 'center' }}>
                        <input type="number" step="any" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" style={{ background: 'none', border: 'none', color: '#fff', fontSize: '48px', textAlign: 'center', width: '100%', outline: 'none', fontWeight: '800' }} required autoFocus disabled={loading} />
                    </div>

                    <input type="text" placeholder="¿En qué gastaste?" className="input-field" value={description} onChange={(e) => {
                        setDescription(e.target.value);
                        const detected = getCategoryByText(e.target.value);
                        setCategory(detected.name);
                    }} required disabled={loading} />

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                        {allCategories.map((cat: any) => {
                            const Icon = cat.icon || Plus;
                            const isSelected = category === cat.name;
                            const color = cat.color || '#fff';
                            return (
                                <button key={cat.id || cat.name} type="button" onClick={() => setCategory(cat.name)} disabled={loading}
                                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', padding: '10px 4px', borderRadius: '14px', border: '1px solid', borderColor: isSelected ? color : '#2c2c2e', background: isSelected ? `${color}15` : '#1c1c1e', cursor: 'pointer', transition: '0.2s' }}>
                                    <Icon size={18} color={isSelected ? color : '#555'} />
                                    <span style={{ fontSize: '9px', color: isSelected ? '#fff' : '#555', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>{cat.name}</span>
                                </button>
                            )
                        })}
                    </div>

                    {type === 'debt' && (
                        <div style={{ background: 'rgba(239, 68, 68, 0.05)', padding: '16px', borderRadius: '16px', border: '1px solid rgba(239, 68, 68, 0.2)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <div style={{ flex: 1 }}><label style={{ fontSize: '10px', color: '#666' }}>Inicio</label><input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input-field" style={{ padding: '8px', fontSize: '12px' }} disabled={loading} /></div>
                                <div style={{ flex: 1 }}><label style={{ fontSize: '10px', color: '#ef4444' }}>Vence</label><input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="input-field" style={{ padding: '8px', fontSize: '12px', borderColor: '#441111' }} disabled={loading} /></div>
                            </div>
                        </div>
                    )}

                    <button type="submit" className="btn-primary" disabled={loading}
                        style={{ padding: '16px', background: type === 'income' ? '#4ade80' : (type === 'debt' ? '#ef4444' : (isRecurring ? '#818cf8' : '#fff')), color: type === 'income' || isRecurring || type === 'debt' ? '#fff' : '#000' }}>
                        {loading ? 'Guardando...' : 'Confirmar Registro'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AddExpenseModal;
