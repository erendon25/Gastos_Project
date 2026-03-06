import React, { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, onSnapshot, deleteDoc, doc, query } from 'firebase/firestore';
import { Trash2, Layers } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import CreateCategoryModal from './CreateCategoryModal';

interface CategorySettingsProps {
    draftData?: any;
    onUpdateDraft?: (data: any) => void;
    user?: any;
}

const CategorySettings: React.FC<CategorySettingsProps> = ({ user }) => {
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
            <div style={{ display: 'flex', justifyContent: 'center' }}>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="btn-primary"
                    style={{
                        height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                        fontSize: '16px', background: 'var(--text-primary)', color: 'var(--bg-color)', border: 'none',
                        width: 'fit-content', minWidth: '280px', padding: '0 32px', borderRadius: '16px'
                    }}
                >
                    <Layers size={20} /> Crear Nueva Categoría
                </button>
            </div>

            <AnimatePresence>
                {showCreateModal && (
                    <CreateCategoryModal
                        onClose={() => setShowCreateModal(false)}
                        user={user}
                        categoriesCount={userCategories.length}
                    />
                )}
            </AnimatePresence>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h4 style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 'bold', letterSpacing: '0.05em' }}>MIS CATEGORÍAS</h4>
                {userCategories.length === 0 && <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', textAlign: 'center', padding: '20px' }}>Aún no has creado categorías propias.</p>}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
                    {userCategories.map((cat) => (
                        <div key={cat.id} className="premium-card" style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--card-bg-light)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                <div style={{
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '10px',
                                    background: cat.color ? `${cat.color}22` : 'var(--glass-bg)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '18px',
                                    border: `1px solid ${cat.color ? cat.color + '44' : 'var(--glass-bg)'}`
                                }}>
                                    {cat.emoji || '📦'}
                                </div>
                                <span style={{ fontSize: '15px', fontWeight: '500' }}>{cat.name}</span>
                            </div>
                            <button onClick={() => handleDelete(cat.id)} style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '8px' }}>
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
