import { useState, useEffect } from 'react'
import { onAuthStateChanged, getRedirectResult } from 'firebase/auth'
import { auth } from './lib/firebase'
import Dashboard from './components/Dashboard'
import Dock from './components/Dock'
import Login from './components/Login'
import TransactionsList from './components/TransactionsList'
import CategorySettings from './components/CategorySettings'
import { X } from 'lucide-react'

function App() {
  const [activeTab, setActiveTab] = useState('home')
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showSettings, setShowSettings] = useState(false)

  useEffect(() => {
    getRedirectResult(auth).catch(console.error);
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [])

  if (loading) return (
    <div style={{ maxWidth: '450px', margin: '0 auto', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-color)', color: '#fff' }}>
      <div className="loader"></div>
    </div>
  );

  if (!user) return <div style={{ maxWidth: '450px', margin: '0 auto', background: 'var(--bg-color)', minHeight: '100vh' }}><Login onLogin={() => { }} /></div>

  return (
    <div style={{ maxWidth: '450px', margin: '0 auto', minHeight: '100vh', position: 'relative', background: 'var(--bg-color)', color: '#fff' }}>

      {/* Settings Modal (Categorías) */}
      {showSettings && (
        <div style={{ position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '450px', height: '100vh', background: 'var(--bg-color)', zIndex: 2000, padding: '24px 20px', overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: '800' }}>Configuración</h2>
            <button onClick={() => setShowSettings(false)} style={{ background: '#222', border: 'none', color: '#fff', padding: '8px', borderRadius: '50%' }}>
              <X size={20} />
            </button>
          </div>
          <CategorySettings />
        </div>
      )}

      {/* Navegación por Pestañas */}
      <div style={{ paddingBottom: '120px' }}>
        {activeTab === 'home' && <Dashboard onOpenSettings={() => setShowSettings(true)} />}

        {activeTab === 'expenses' && (
          <div style={{ padding: '24px 20px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '8px' }}>Gastos Diarios</h2>
            <p style={{ color: '#666', fontSize: '14px', marginBottom: '24px' }}>Historial de consumos normales.</p>
            <TransactionsList type="expense" />
          </div>
        )}

        {activeTab === 'recurring' && (
          <div style={{ padding: '24px 20px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '8px' }}>Gastos Fijos</h2>
            <p style={{ color: '#666', fontSize: '14px', marginBottom: '24px' }}>Alquiler, servicios y mensualidades.</p>
            <TransactionsList type="recurring" />
          </div>
        )}

        {activeTab === 'debts' && (
          <div style={{ padding: '24px 20px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '8px' }}>Deudas y Seguros</h2>
            <p style={{ color: '#666', fontSize: '14px', marginBottom: '24px' }}>Préstamos bancarios y cronogramas de pago.</p>
            <TransactionsList type="debt" />
          </div>
        )}

        {activeTab === 'income' && (
          <div style={{ padding: '24px 20px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '8px' }}>Ingresos</h2>
            <p style={{ color: '#666', fontSize: '14px', marginBottom: '24px' }}>Tus entradas de dinero.</p>
            <TransactionsList type="income" />
          </div>
        )}
      </div>

      {!showSettings && <Dock activeTab={activeTab} onChange={setActiveTab} />}

      <style>{`
        .loader { border: 3px solid #1a1a1a; border-top: 3px solid #fff; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

export default App
