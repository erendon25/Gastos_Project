import React, { useState, useEffect } from 'react';
import { X, Plus, CheckCircle, Calendar, Info, Circle, Trash2 } from 'lucide-react';
import { addDoc, collection, serverTimestamp, Timestamp, onSnapshot, query, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import SpeechButton from './SpeechButton';
import { CATEGORIES as DEFAULT_CATEGORIES, getCategoryByText } from '../lib/categories';

interface AddExpenseModalProps {
    onClose: () => void;
    editItem?: any; // New prop for editing
    editType?: 'expense' | 'income' | 'recurring' | 'debt'; // New prop for editing
}

const AddExpenseModal: React.FC<AddExpenseModalProps> = ({ onClose, editItem, editType }) => {
    const [amount, setAmount] = useState(editItem ? editItem.amount.toString() : '');
    const [description, setDescription] = useState(editItem ? editItem.description : '');
    const [category, setCategory] = useState(editItem ? editItem.category : DEFAULT_CATEGORIES[0].name);
    const [type, setType] = useState<'expense' | 'income' | 'debt'>(
        editType === 'income' ? 'income' : (editType === 'debt' ? 'debt' : 'expense')
    );
    const [isRecurring, setIsRecurring] = useState(editType === 'recurring');
    const [autoDebit, setAutoDebit] = useState(editItem?.autoDebit ?? true);

    const [startDate, setStartDate] = useState(
        editItem?.startDate ? editItem.startDate.toDate().toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
    );
    const [dueDate, setDueDate] = useState(
        editItem?.dueDate ? editItem.dueDate.toDate().toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
    );

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
        if (!amount || !auth.currentUser) return;

        onClose();

        let collectionName = 'expenses';
        if (type === 'income') collectionName = 'income';
        else if (type === 'debt') collectionName = 'debts';
        else if (isRecurring) collectionName = 'recurring_expenses';

        const data: any = {
            amount: parseFloat(amount),
            description,
            category,
            isRecurring: type === 'debt' ? true : isRecurring,
            autoDebit: type === 'debt' ? false : (isRecurring ? autoDebit : false),
            paid: editItem ? editItem.paid : (type === 'income' || (isRecurring && autoDebit)) ? true : false,
        };

        if (!editItem) {
            data.date = serverTimestamp();
        }

        if (type === 'debt') {
            data.startDate = Timestamp.fromDate(new Date(startDate));
            data.dueDate = Timestamp.fromDate(new Date(dueDate));
        }

        try {
            if (editItem) {
                const docRef = doc(db, 'users', auth.currentUser.uid, editType === 'recurring' ? 'recurring_expenses' : (editType === 'debt' ? 'debts' : (editType === 'income' ? 'income' : 'expenses')), editItem.id);
                await updateDoc(docRef, data);
            } else {
                await addDoc(collection(db, 'users', auth.currentUser.uid, collectionName), data);
            }
        } catch (err) {
            console.error("Error saving:", err);
        }
    };

    const handleDelete = async () => {
        if (!editItem || !auth.currentUser) return;
        if (window.confirm('¿Estás seguro de que deseas eliminar este registro?')) {
            onClose();
            const col = editType === 'recurring' ? 'recurring_expenses' : (editType === 'debt' ? 'debts' : (editType === 'income' ? 'income' : 'expenses'));
            await deleteDoc(doc(db, 'users', auth.currentUser.uid, col, editItem.id));
        }
    };

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 2000, display: 'flex', alignItems: 'flex-end' }}>
            <div style={{ width: '100%', maxWidth: '450px', margin: '0 auto', background: '#1c1c1e', borderTopLeftRadius: '32px', borderTopRightRadius: '32px', padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: '20px', maxHeight: '95vh', overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: 'bold' }}>{editItem ? 'Editar Registro' : 'Nuevo Registro'}</h2>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {editItem && (
                            <button onClick={handleDelete} style={{ background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: '#ef4444', padding: '8px', borderRadius: '50%' }}>
                                <Trash2 size={18} />
                            </button>
                        )}
                        <button onClick={onClose} style={{ background: '#333', border: 'none', color: '#fff', padding: '8px', borderRadius: '50%' }}>
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {!editItem && (
                    <div style={{ display: 'flex', background: '#000', padding: '4px', borderRadius: '16px' }}>
                        <button type="button" onClick={() => { setType('expense'); setIsRecurring(false); }} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', background: type === 'expense' && !isRecurring ? '#fff' : 'transparent', color: type === 'expense' && !isRecurring ? '#000' : '#666', fontWeight: 'bold', fontSize: '11px' }}>Gasto</button>
                        <button type="button" onClick={() => { setType('expense'); setIsRecurring(true); }} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', background: isRecurring && type !== 'debt' ? '#818cf8' : 'transparent', color: isRecurring && type !== 'debt' ? '#fff' : '#666', fontWeight: 'bold', fontSize: '11px' }}>Fijo</button>
                        <button type="button" onClick={() => { setType('debt'); setIsRecurring(false); }} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', background: type === 'debt' ? '#ef4444' : 'transparent', color: type === 'debt' ? '#fff' : '#666', fontWeight: 'bold', fontSize: '11px' }}>Deuda</button>
                        <button type="button" onClick={() => { setType('income'); setIsRecurring(false); }} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', background: type === 'income' ? '#4ade80' : 'transparent', color: type === 'income' ? '#fff' : '#666', fontWeight: 'bold', fontSize: '11px' }}>Ingreso</button>
                    </div>
                )}

                <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ textAlign: 'center' }}>
                        <input type="number" step="any" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" style={{ background: 'none', border: 'none', color: '#fff', fontSize: '48px', textAlign: 'center', width: '100%', outline: 'none', fontWeight: '800' }} required autoFocus />
                    </div>

                    <input type="text" placeholder="¿En qué gastaste?" className="input-field" value={description} onChange={(e) => {
                        setDescription(e.target.value);
                        const detected = getCategoryByText(e.target.value);
                        setCategory(detected.name);
                    }} required />

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                        {allCategories.map((cat: any) => {
                            const Icon = cat.icon || Plus;
                            const isSelected = category === cat.name;
                            const color = cat.color || '#fff';
                            return (
                                <button key={cat.id || cat.name} type="button" onClick={() => setCategory(cat.name)}
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
                                <div style={{ flex: 1 }}><label style={{ fontSize: '10px', color: '#666' }}>Inicio</label><input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input-field" style={{ padding: '8px', fontSize: '12px' }} /></div>
                                <div style={{ flex: 1 }}><label style={{ fontSize: '10px', color: '#ef4444' }}>Vence</label><input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="input-field" style={{ padding: '8px', fontSize: '12px', borderColor: '#441111' }} /></div>
                            </div>
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                        {!editItem && <SpeechButton onResult={handleVoiceResult} />}
                        <button type="submit" className="btn-primary"
                            style={{ flex: 1, padding: '16px', background: type === 'income' ? '#4ade80' : (type === 'debt' ? '#ef4444' : (isRecurring ? '#818cf8' : '#fff')), color: type === 'income' || isRecurring || type === 'debt' ? '#fff' : '#000' }}>
                            {editItem ? 'Guardar Cambios' : 'Confirmar Registro'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddExpenseModal;
