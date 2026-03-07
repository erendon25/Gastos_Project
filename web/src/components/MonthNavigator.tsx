import React from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

interface MonthNavigatorProps {
    currentDate: Date;
    onChange: (offset: number) => void;
}

const MonthNavigator: React.FC<MonthNavigatorProps> = ({ currentDate, onChange }) => {
    const monthYearLabel = currentDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' });

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--glass-bg)',
            padding: '12px 16px',
            borderRadius: '16px',
            border: '1px solid var(--glass-border)',
            margin: '0 20px 20px 20px'
        }}>
            <button onClick={() => onChange(-1)} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ChevronLeft size={20} />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={16} color="#818cf8" />
                <span style={{ fontSize: '14px', fontWeight: 'bold', textTransform: 'capitalize' }}>{monthYearLabel}</span>
            </div>
            <button onClick={() => onChange(1)} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ChevronRight size={20} />
            </button>
        </div>
    );
};

export default MonthNavigator;
