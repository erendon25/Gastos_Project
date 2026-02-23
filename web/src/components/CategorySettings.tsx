import React, { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, onSnapshot, addDoc, deleteDoc, doc, query } from 'firebase/firestore';
import { getEmojiForCategory } from '../lib/categories';
import { Plus, Trash2, Tag } from 'lucide-react';

const CategorySettings: React.FC = () => {
    const [userCategories, setUserCategories] = useState<any[]>([]);
    const [newCatName, setNewCatName] = useState('');
    const [newCatEmoji, setNewCatEmoji] = useState('📦');
    const [loading, setLoading] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);

    const QUICK_EMOJIS = ['💰', '🍱', '🚕', '🏥', '🎮', '🎓', '💪', '🛒', '👕', '💅', '🎁', '✈️', '🐶', '💼', '📱', '🛠️', '🎬', '👗', '💇', '🍕', '🍻', '🍰', '⚽', '🎨', '🚀', '💧', '⚡', '📶', '🔥', '🧹', '☕', '🎟️', '🏠', '🍎', '🍫', '🥩'];

    useEffect(() => {
        if (!auth.currentUser) return;

        const q = query(collection(db, 'users', auth.currentUser.uid, 'categorias'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const cats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setUserCategories(cats);
        });

        return () => unsubscribe();
    }, []);

    const handleNameChange = (val: string) => {
        setNewCatName(val);
        const emoji = getEmojiForCategory(val);
        setNewCatEmoji(emoji);
    };

    const handleAddCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCatName || !auth.currentUser) return;

        try {
            setLoading(true);
            await addDoc(collection(db, 'users', auth.currentUser.uid, 'categorias'), {
                name: newCatName,
                color: '#818cf8', // Default color since selector is removed
                emoji: newCatEmoji,
                iconName: 'Tag',
                keywords: [newCatName.toLowerCase()]
            });
            setNewCatName('');
            setNewCatEmoji('📦');
            setShowEmojiPicker(false);
        } catch (error) {
            console.error("Error adding category:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!auth.currentUser) return;
        if (window.confirm('¿Eliminar esta categoría?')) {
            await deleteDoc(doc(db, 'users', auth.currentUser.uid, 'categorias', id));
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <form onSubmit={handleAddCategory} className="premium-card" style={{ padding: '20px', background: '#161616', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Plus size={18} /> Crear Nueva Categoría
                </h3>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ flex: 1, position: 'relative' }}>
                        <Tag size={16} color="#666" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                        <input
                            type="text"
                            placeholder="Nombre (ej. Gimnasio)"
                            className="input-field"
                            style={{ paddingLeft: '40px' }}
                            value={newCatName}
                            onChange={(e) => handleNameChange(e.target.value)}
                        />
                    </div>

                    <button
                        type="button"
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        style={{
                            width: '50px',
                            height: '45px',
                            background: showEmojiPicker ? 'rgba(129, 138, 248, 0.2)' : '#222',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '22px',
                            border: showEmojiPicker ? '1px solid #818cf8' : '1px solid #333',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        {newCatEmoji}
                    </button>
                </div>

                {showEmojiPicker && (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(6, 1fr)',
                        gap: '8px',
                        background: '#0a0a0a',
                        padding: '12px',
                        borderRadius: '16px',
                        border: '1px solid #1a1a1a'
                    }}>
                        {QUICK_EMOJIS.map(emoji => (
                            <button
                                key={emoji}
                                type="button"
                                onClick={() => {
                                    setNewCatEmoji(emoji);
                                    setShowEmojiPicker(false);
                                }}
                                style={{
                                    fontSize: '20px',
                                    padding: '8px',
                                    background: newCatEmoji === emoji ? '#222' : 'transparent',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: 'pointer'
                                }}
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>
                )}

                <button type="submit" className="btn-primary" style={{ height: '48px' }} disabled={loading || !newCatName}>
                    {loading ? 'Guardando...' : 'Agregar Categoría'}
                </button>
            </form>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h4 style={{ fontSize: '13px', color: '#666', fontWeight: 'bold', letterSpacing: '0.05em' }}>MIS CATEGORÍAS</h4>
                {userCategories.length === 0 && <p style={{ fontSize: '13px', color: '#444', textAlign: 'center', padding: '20px' }}>Aún no has creado categorías propias.</p>}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
                    {userCategories.map((cat) => (
                        <div key={cat.id} className="premium-card" style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#111' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                <div style={{
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '10px',
                                    background: 'rgba(255,255,255,0.03)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '18px',
                                    border: '1px solid rgba(255,255,255,0.05)'
                                }}>
                                    {cat.emoji || '📦'}
                                </div>
                                <span style={{ fontSize: '15px', fontWeight: '500' }}>{cat.name}</span>
                            </div>
                            <button onClick={() => handleDelete(cat.id)} style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer', padding: '8px' }}>
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

        </div>
    );
};

export default CategorySettings;
