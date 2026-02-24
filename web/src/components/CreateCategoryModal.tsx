import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Check } from 'lucide-react';
import { db, auth } from '../lib/firebase';
import { addDoc, collection } from 'firebase/firestore';
import { getEmojiForCategory } from '../lib/categories';

interface CreateCategoryModalProps {
    onClose: () => void;
}

const CreateCategoryModal: React.FC<CreateCategoryModalProps> = ({ onClose }) => {
    const [name, setName] = useState('');
    const [emoji, setEmoji] = useState('🍕');
    const [saving, setSaving] = useState(false);

    const [dirtyEmoji, setDirtyEmoji] = useState(false);

    const handleNameChange = (val: string) => {
        setName(val);
        if (!dirtyEmoji) {
            const suggested = getEmojiForCategory(val);
            if (suggested && suggested !== '📦') {
                setEmoji(suggested);
            }
        }
    };

    const handleSave = async () => {
        if (!name.trim() || !auth.currentUser) return;
        setSaving(true);
        try {
            await addDoc(collection(db, 'users', auth.currentUser.uid, 'categorias'), {
                name: name.trim(),
                color: '#538da8', // Color estático como se pidió sin selector
                emoji: emoji,
                iconName: 'Tag',
                keywords: [name.trim().toLowerCase()]
            });
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setSaving(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: '#111',
                zIndex: 3000,
                display: 'flex',
                flexDirection: 'column',
                color: '#fff',
                paddingTop: 'env(safe-area-inset-top)',
            }}
        >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '16px 20px' }}>
                <button onClick={onClose} style={{ background: '#222', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', cursor: 'pointer' }}>
                    <X size={20} />
                </button>
            </div>

            <div style={{ padding: '0 24px', display: 'flex', flex: 1, flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px', flexShrink: 0, width: '100%', maxWidth: '300px' }}>

                    {/* Native Emoji Input Container */}
                    <div style={{
                        width: '120px',
                        height: '120px',
                        borderRadius: '32px',
                        background: 'linear-gradient(180deg, #6ba6c4 0%, #3e738d 100%)', // Match screenshot "Agua" teal/blue color roughly, fixed as per request
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                        boxShadow: `0 20px 40px rgba(0,0,0,0.4), inset 0 2px 4px rgba(255,255,255,0.2)`
                    }}>
                        <input
                            type="text"
                            value={emoji}
                            onChange={(e) => {
                                const val = e.target.value;
                                if (val.length > 0) {
                                    if (typeof Intl !== 'undefined' && Intl.Segmenter) {
                                        const segmenter = new Intl.Segmenter('es', { granularity: 'grapheme' });
                                        const segments = Array.from(segmenter.segment(val));
                                        setEmoji(segments[segments.length - 1].segment);
                                    } else {
                                        const chars = Array.from(val);
                                        setEmoji(chars[chars.length - 1]);
                                    }
                                    setDirtyEmoji(true);
                                } else {
                                    setEmoji('🍕');
                                }
                            }}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#fff', // Real emoji color
                                fontSize: '56px',
                                outline: 'none',
                                textAlign: 'center',
                                width: '100%',
                                height: '100%',
                                position: 'absolute',
                                cursor: 'pointer',
                                zIndex: 10
                            }}
                        />
                    </div>

                    <input
                        type="text"
                        placeholder="Nombre de categoría"
                        value={name}
                        onChange={(e) => handleNameChange(e.target.value)}
                        autoFocus
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#fff',
                            fontSize: '36px',
                            fontWeight: '800',
                            textAlign: 'center',
                            outline: 'none',
                            width: '100%',
                            letterSpacing: '-1px'
                        }}
                    />

                    <button
                        onClick={handleSave}
                        disabled={saving || !name.trim()}
                        style={{
                            background: '#222',
                            color: name.trim() ? '#fff' : '#666',
                            border: 'none',
                            borderRadius: '16px',
                            padding: '16px',
                            width: '100%',
                            fontSize: '16px',
                            fontWeight: 'bold',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            cursor: name.trim() ? 'pointer' : 'default',
                            transition: 'all 0.2s'
                        }}
                    >
                        <Check size={20} /> {saving ? 'Guardando...' : 'Guardar'}
                    </button>

                </div>
            </div>
        </motion.div>
    );
};

export default CreateCategoryModal;
