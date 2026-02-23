import { useState, useEffect } from 'react'
import { onAuthStateChanged, getRedirectResult } from 'firebase/auth'
import { auth } from './lib/firebase'
import Dashboard from './components/Dashboard'
import Dock from './components/Dock'
import Login from './components/Login'
import TransactionsList from './components/TransactionsList'
import CategorySettings from './components/CategorySettings'
import PasswordSettings from './components/PasswordSettings'
import AddExpenseModal from './components/AddExpenseModal'
import { X, Plus, ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const MonthNavigator: React.FC<{ currentDate: Date; onChange: (offset: number) => void }> = ({ currentDate, onChange }) => {
  const monthYearLabel = currentDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' });

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      background: 'rgba(255,255,255,0.03)',
      padding: '12px 16px',
      borderRadius: '16px',
      border: '1px solid rgba(255,255,255,0.05)',
      margin: '0 20px 20px 20px'
    }}>
      <button onClick={() => onChange(-1)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <ChevronLeft size={20} />
      </button>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Calendar size={16} color="#818cf8" />
        <span style={{ fontSize: '14px', fontWeight: 'bold', textTransform: 'capitalize' }}>{monthYearLabel}</span>
      </div>
      <button onClick={() => onChange(1)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <ChevronRight size={20} />
      </button>
    </div>
  );
};

const pageVariants = {
  initial: { opacity: 0, x: 20, scale: 0.98 },
  animate: { opacity: 1, x: 0, scale: 1 },
  exit: { opacity: 0, x: -20, scale: 0.98 },
};

const pageTransition = {
  type: "spring" as const,
  stiffness: 300,
  damping: 25,
};

function App() {
  const [activeTab, setActiveTab] = useState('home')
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const [settingsTab, setSettingsTab] = useState<'categories' | 'profile'>('categories')
  const [showAddModal, setShowAddModal] = useState(false)
  const [presetCategory, setPresetCategory] = useState<string | null>(null)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [draftExpense, setDraftExpense] = useState<any>(null)
  const [draftCategories, setDraftCategories] = useState<any>(null)
  const [draftProfile, setDraftProfile] = useState<any>(null)

  const changeMonth = (offset: number) => {
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1);
    setCurrentDate(newDate);
  };

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

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <Dashboard
            currentDate={currentDate}
            changeMonth={changeMonth}
            onOpenSettings={() => setShowSettings(true)}
            onNavigate={setActiveTab}
            onAddFromCategory={(cat) => {
              setPresetCategory(cat);
              setShowAddModal(true);
            }}
          />
        );
      case 'expenses':
        return (
          <div style={{ padding: '24px 0' }}>
            <div style={{ padding: '0 20px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '8px' }}>Gastos Diarios</h2>
              <p style={{ color: '#666', fontSize: '14px', marginBottom: '24px' }}>Historial de consumos normales.</p>
            </div>
            <MonthNavigator currentDate={currentDate} onChange={changeMonth} />
            <div style={{ padding: '0 20px' }}>
              <TransactionsList type="expense" currentDate={currentDate} />
            </div>
          </div>
        );
      case 'recurring':
        return (
          <div style={{ padding: '24px 0' }}>
            <div style={{ padding: '0 20px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '8px' }}>Gastos Fijos</h2>
              <p style={{ color: '#666', fontSize: '14px', marginBottom: '24px' }}>Alquiler, servicios y mensualidades.</p>
            </div>
            <MonthNavigator currentDate={currentDate} onChange={changeMonth} />
            <div style={{ padding: '0 20px' }}>
              <TransactionsList type="recurring" currentDate={currentDate} />
            </div>
          </div>
        );
      case 'debts':
        return (
          <div style={{ padding: '24px 0' }}>
            <div style={{ padding: '0 20px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '8px' }}>Deudas y Seguros</h2>
              <p style={{ color: '#666', fontSize: '14px', marginBottom: '24px' }}>Préstamos bancarios y cronogramas de pago.</p>
            </div>
            <MonthNavigator currentDate={currentDate} onChange={changeMonth} />
            <div style={{ padding: '0 20px' }}>
              <TransactionsList type="debt" currentDate={currentDate} />
            </div>
          </div>
        );
      case 'income':
        return (
          <div style={{ padding: '24px 0' }}>
            <div style={{ padding: '0 20px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '8px' }}>Ingresos</h2>
              <p style={{ color: '#666', fontSize: '14px', marginBottom: '24px' }}>Tus entradas de dinero.</p>
            </div>
            <MonthNavigator currentDate={currentDate} onChange={changeMonth} />
            <div style={{ padding: '0 20px' }}>
              <TransactionsList type="income" currentDate={currentDate} />
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div style={{
      maxWidth: '450px',
      margin: '0 auto',
      minHeight: '100vh',
      position: 'relative',
      background: 'var(--bg-color)',
      color: '#fff'
    }}>

      {/* Settings Modal (Categorías) */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, info) => {
              if (info.offset.y > 150) setShowSettings(false);
            }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              width: '100%',
              height: '100vh',
              background: 'var(--bg-color)',
              zIndex: 2000,
              padding: '24px 20px',
              overflowY: 'auto'
            }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: '800' }}>Configuración</h2>
              <button onClick={() => setShowSettings(false)} style={{ background: '#222', border: 'none', color: '#fff', padding: '8px', borderRadius: '50%', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', background: '#111', padding: '4px', borderRadius: '14px' }}>
              <button
                onClick={() => setSettingsTab('categories')}
                style={{
                  flex: 1, padding: '10px', borderRadius: '10px', border: 'none', fontSize: '13px', fontWeight: 'bold',
                  background: settingsTab === 'categories' ? '#222' : 'transparent',
                  color: settingsTab === 'categories' ? '#fff' : '#666',
                  transition: 'all 0.2s'
                }}>Categorías</button>
              <button
                onClick={() => setSettingsTab('profile')}
                style={{
                  flex: 1, padding: '10px', borderRadius: '10px', border: 'none', fontSize: '13px', fontWeight: 'bold',
                  background: settingsTab === 'profile' ? '#222' : 'transparent',
                  color: settingsTab === 'profile' ? '#fff' : '#666'
                }}>Perfil & Seguridad</button>
            </div>

            {settingsTab === 'categories' ?
              <CategorySettings draftData={draftCategories} onUpdateDraft={setDraftCategories} /> :
              <PasswordSettings draftData={draftProfile} onUpdateDraft={setDraftProfile} />
            }
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navegación por Pestañas */}
      <div style={{ paddingBottom: '180px', overflowX: 'hidden' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial="initial"
            animate="animate"
            exit="exit"
            variants={pageVariants}
            transition={pageTransition}
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* (+) Floating Action Button Container */}
      {!showSettings && (
        <div style={{
          position: 'fixed',
          bottom: '112px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100%',
          maxWidth: '450px',
          pointerEvents: 'none',
          zIndex: 1001,
          display: 'flex',
          justifyContent: 'flex-end',
          padding: '0 24px'
        }}>
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowAddModal(true)}
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '18px',
              background: 'linear-gradient(135deg, #ffffff 0%, #e0e0e0 100%)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.1)',
              cursor: 'pointer',
              pointerEvents: 'auto'
            }}
          >
            <Plus size={28} color="#000000" strokeWidth={3} />
          </motion.button>
        </div>
      )}

      {!showSettings && <Dock activeTab={activeTab} onChange={setActiveTab} />}

      <AnimatePresence>
        {showAddModal && (
          <AddExpenseModal
            onClose={() => {
              setShowAddModal(false);
              setPresetCategory(null);
            }}
            presetCategory={presetCategory}
            editType={
              activeTab === 'income' ? 'income' :
                activeTab === 'recurring' ? 'recurring' :
                  activeTab === 'debts' ? 'debt' : 'expense'
            }
            draftData={draftExpense}
            onUpdateDraft={setDraftExpense}
          />
        )}
      </AnimatePresence>

      <style>{`
        .loader { border: 3px solid #1a1a1a; border-top: 3px solid #fff; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        ::-webkit-scrollbar { width: 0px; background: transparent; }
      `}</style>
    </div>
  )
}

export default App

