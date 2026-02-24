import React, { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, onSnapshot, deleteDoc, doc, query } from 'firebase/firestore';
import { Trash2, Layers } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import CreateCategoryModal from './CreateCategoryModal';

interface CategorySettingsProps {
    draftData?: any;
    onUpdateDraft?: (data: any) => void;
}

const CategorySettings: React.FC<CategorySettingsProps> = () => {
    const [userCategories, setUserCategories] = useState<any[]>([]);
    const [showCreateModal, setShowCreateModal] = useState(false);

    useEffect(() => {
        if (!auth.currentUser) return;

        const q = query(collection(db, 'users', auth.currentUser.uid, 'categorias'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const cats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setUserCategories(cats);
        });

        return () => unsubscribe();
    }, []);

    const handleDelete = async (id: string) => {
        if (!auth.currentUser) return;
        if (window.confirm('¿Eliminar esta categoría?')) {
            await deleteDoc(doc(db, 'users', auth.currentUser.uid, 'categorias', id));
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <button
                onClick={() => setShowCreateModal(true)}
                className="btn-primary"
                style={{
                    height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    fontSize: '16px', background: 'linear-gradient(135deg, #111, #222)', border: '1px solid #333'
                }}
            >
                <Layers size={20} /> Crear Nueva Categoría
            </button>

            <AnimatePresence>
                {showCreateModal && (
                    <CreateCategoryModal onClose={() => setShowCreateModal(false)} />
                )}
            </AnimatePresence>

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
                                    background: cat.color ? `${cat.color}22` : 'rgba(255,255,255,0.03)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '18px',
                                    border: `1px solid ${cat.color ? cat.color + '44' : 'rgba(255,255,255,0.05)'}`
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
