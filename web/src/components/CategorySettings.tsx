import React, { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, onSnapshot, addDoc, deleteDoc, doc, query } from 'firebase/firestore';
import { CATEGORIES as DEFAULT_CATEGORIES } from '../lib/categories';
import { Plus, Trash2, Tag, Palette } from 'lucide-react';

const CategorySettings: React.FC = () => {
    const [userCategories, setUserCategories] = useState<any[]>([]);
    const [newCatName, setNewCatName] = useState('');
    const [newCatColor, setNewCatColor] = useState('#ffffff');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!auth.currentUser) return;

        const q = query(collection(db, 'users', auth.currentUser.uid, 'categories'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const cats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setUserCategories(cats);
        });

        return () => unsubscribe();
    }, []);

    const handleAddCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCatName || !auth.currentUser) return;

        try {
            setLoading(true);
            await addDoc(collection(db, 'users', auth.currentUser.uid, 'categories'), {
                name: newCatName,
                color: newCatColor,
                iconName: 'Tag', // Default icon for user categories for now
                keywords: [newCatName.toLowerCase()]
            });
            setNewCatName('');
        } catch (error) {
            console.error("Error adding category:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!auth.currentUser) return;
        await deleteDoc(doc(db, 'users', auth.currentUser.uid, 'categories', id));
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <form onSubmit={handleAddCategory} className="premium-card" style={{ padding: '20px', background: '#161616', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Plus size={18} /> Crear Nueva Categoría
                </h3>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <div style={{ flex: 1, position: 'relative' }}>
                        <Tag size={16} color="#666" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                        <input
                            type="text"
                            placeholder="Nombre (ej. Gimnasio)"
                            className="input-field"
                            style={{ paddingLeft: '40px' }}
                            value={newCatName}
                            onChange={(e) => setNewCatName(e.target.value)}
                        />
                    </div>
                    <input
                        type="color"
                        value={newCatColor}
                        onChange={(e) => setNewCatColor(e.target.value)}
                        style={{ width: '50px', height: '45px', border: 'none', background: 'none', cursor: 'pointer' }}
                    />
                </div>
                <button type="submit" className="btn-primary" disabled={loading || !newCatName}>
                    {loading ? 'Guardando...' : 'Agregar Categoría'}
                </button>
            </form>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h4 style={{ fontSize: '14px', color: '#666', fontWeight: 'bold' }}>MIS CATEGORÍAS PERSONALIZADAS</h4>
                {userCategories.length === 0 && <p style={{ fontSize: '13px', color: '#444' }}>Aún no has creado categorías propias.</p>}
                {userCategories.map((cat) => (
                    <div key={cat.id} className="premium-card" style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#111' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: cat.color }}></div>
                            <span style={{ fontSize: '14px', fontWeight: '500' }}>{cat.name}</span>
                        </div>
                        <button onClick={() => handleDelete(cat.id)} style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer' }}>
                            <Trash2 size={16} />
                        </button>
                    </div>
                ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
                <h4 style={{ fontSize: '14px', color: '#666', fontWeight: 'bold' }}>CATEGORÍAS DEL SISTEMA</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    {DEFAULT_CATEGORIES.map((cat) => (
                        <div key={cat.id} style={{ padding: '8px 12px', borderRadius: '12px', background: '#0a0a0a', border: '1px solid #1a1a1a', fontSize: '12px', color: '#666', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <cat.icon size={14} /> {cat.name}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default CategorySettings;
