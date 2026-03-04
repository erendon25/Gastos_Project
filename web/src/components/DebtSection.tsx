import React from 'react';

interface Debt {
    name: string;
    startDate: string;
    totalAmount: number;
    monthlyQuota: number;
    paidQuotas: number;
}

interface DebtSectionProps {
    currency?: { code: string, symbol: string };
}

const DebtSection: React.FC<DebtSectionProps> = ({ currency = { code: 'PEN', symbol: 'S/' } }) => {
    const debt: Debt = {
        name: "Préstamo Banco",
        startDate: "3 de Enero, 2026",
        totalAmount: 7000,
        monthlyQuota: 350,
        paidQuotas: 2
    };

    const totalPaid = debt.monthlyQuota * debt.paidQuotas;
    const pendingAmount = debt.totalAmount - totalPaid;
    const progressPercent = (totalPaid / debt.totalAmount) * 100;

    return (
        <div className="premium-card" style={{ background: 'var(--card-bg)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 'bold' }}>{debt.name}</h3>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Inició: {debt.startDate}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '14px', fontWeight: 'bold' }}>Faltan: {currency.symbol} {pendingAmount}</p>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{debt.paidQuotas} cuotas pagadas</p>
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                    <span>Progreso de pago</span>
                    <span>{progressPercent.toFixed(1)}%</span>
                </div>
                <div style={{ height: '8px', width: '100%', background: 'var(--glass-border)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div
                        style={{
                            height: '100%',
                            width: `${progressPercent}%`,
                            background: 'var(--text-primary)',
                            borderRadius: '4px',
                            transition: 'width 1s ease-in-out'
                        }}
                    />
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', paddingTop: '8px', borderTop: '1px solid var(--border-color)' }}>
                <div>
                    <p style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Cuota Mensual</p>
                    <p style={{ fontSize: '14px', fontWeight: 'bold' }}>{currency.symbol} {debt.monthlyQuota}</p>
                </div>
                <div>
                    <p style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Monto Total</p>
                    <p style={{ fontSize: '14px', fontWeight: 'bold' }}>{currency.symbol} {debt.totalAmount}</p>
                </div>
            </div>
        </div>
    );
};

export default DebtSection;
