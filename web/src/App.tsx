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
import SubscriptionsSection from './components/SubscriptionsSection'
import { X, Plus, ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { doc, getDoc } from 'firebase/firestore'
import { db } from './lib/firebase'
import Onboarding from './components/Onboarding'
import TutorialOverlay from './components/TutorialOverlay'
import UpgradeModal from './components/UpgradeModal'

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
  const [splashDone, setSplashDone] = useState(false)
  const [tabChanging, setTabChanging] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [settingsTab, setSettingsTab] = useState<'categories' | 'profile'>('categories')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showTutorial, setShowTutorial] = useState(false)
  const [showUpgrade, setShowUpgrade] = useState(false)
  const [currency, setCurrency] = useState<{ code: string, symbol: string }>({ code: 'PEN', symbol: 'S/' })
  const [presetCategory, setPresetCategory] = useState<string | null>(null)
  const [currentDate, setCurrentDate] = useState(() => {
    const today = new Date();
    if (today.getDate() >= 25) {
      return new Date(today.getFullYear(), today.getMonth() + 1, 1);
    }
    return today;
  });
  const [draftExpense, setDraftExpense] = useState<any>(null)
  const [draftCategories, setDraftCategories] = useState<any>(null)
  const [draftProfile, setDraftProfile] = useState<any>(null)
  const [showOnboarding, setShowOnboarding] = useState(false)

  const changeMonth = (offset: number) => {
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1);
    setCurrentDate(newDate);
  };

  const handleTabChange = (tab: string) => {
    if (tab === activeTab) return;
    setTabChanging(true);
    setTimeout(() => {
      setActiveTab(tab);
      setTabChanging(false);
    }, 350);
  };

  useEffect(() => {
    getRedirectResult(auth).catch(console.error);
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setShowOnboarding(!userData.onboardingCompleted);
            const isCreator = currentUser.email === 'erickrendon18@gmail.com';
            const userIsPro = isCreator || userData.isPro || false;
            const userTutorialCompleted = userData.tutorialCompleted || false;
            const userCurrency = userData.currency || { code: 'PEN', symbol: 'S/' };

            setCurrency(userCurrency);
            setUser({ ...currentUser, isPro: userIsPro, tutorialCompleted: userTutorialCompleted, currency: userCurrency });

            if (!userTutorialCompleted && userData.onboardingCompleted) {
              setShowTutorial(true);
            }
          } else {
            setShowOnboarding(true);
            setUser({ ...currentUser, isPro: currentUser.email === 'erickrendon18@gmail.com', tutorialCompleted: false, currency: { code: 'PEN', symbol: 'S/' } });
          }
        } catch (err) {
          console.error("Error fetching user profile:", err);
          setShowOnboarding(false);
          setUser({ ...currentUser, isPro: currentUser.email === 'erickrendon18@gmail.com' });
        }
      } else {
        setShowOnboarding(false);
      }

      // Show splash for at least 1.8s for premium feel
      setTimeout(() => {
        setLoading(false);
        setTimeout(() => setSplashDone(true), 600);
      }, 1800);
    });
    return () => unsubscribe();
  }, [])

  if (loading || !splashDone) return (
    <div style={{
      maxWidth: '450px', margin: '0 auto', height: '100vh',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      background: '#0a0a0a', color: '#fff', position: 'relative', overflow: 'hidden'
    }}>
      {/* Background glow */}
      <div style={{ position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%, -50%)', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(255,255,255,0.04) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(40px)', animation: 'pulse-glow 2s ease-in-out infinite' }} />

      {/* Logo area */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', animation: 'fadeSlideUp 0.6s ease forwards', opacity: 0 }}>
        <div style={{ fontSize: '64px', lineHeight: 1, filter: 'drop-shadow(0 0 24px rgba(255,255,255,0.3))' }}>⚡</div>
        <h1 style={{ fontSize: '42px', fontWeight: '900', letterSpacing: '-3px', color: '#fff', margin: 0 }}>FLUX</h1>
        <p style={{ fontSize: '13px', color: '#444', letterSpacing: '3px', textTransform: 'uppercase', margin: 0 }}>Finanza Inteligente</p>
      </div>

      {/* Progress bar */}
      <div style={{ position: 'absolute', bottom: '80px', width: '120px' }}>
        <div style={{ height: '2px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px', overflow: 'hidden' }}>
          <div style={{ height: '100%', background: '#fff', borderRadius: '2px', animation: 'progress-fill 1.6s ease-out forwards' }} />
        </div>
      </div>

      <style>{`
        @keyframes fadeSlideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse-glow { 0%, 100% { opacity: 0.5; transform: translate(-50%, -50%) scale(1); } 50% { opacity: 1; transform: translate(-50%, -50%) scale(1.1); } }
        @keyframes progress-fill { from { width: 0%; } to { width: 100%; } }
      `}</style>
    </div>
  );

  if (!user) return <div style={{ maxWidth: '450px', margin: '0 auto', background: 'var(--bg-color)', minHeight: '100vh' }}><Login onLogin={() => { }} /></div>

  if (showOnboarding) return <div style={{ maxWidth: '450px', margin: '0 auto', background: 'var(--bg-color)', minHeight: '100vh', position: 'relative' }}><Onboarding onComplete={() => setShowOnboarding(false)} /></div>

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
            user={user}
            onUpgrade={() => setShowUpgrade(true)}
            currency={currency}
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
              <TransactionsList type="expense" currentDate={currentDate} currency={currency} />
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
              <TransactionsList type="recurring" currentDate={currentDate} currency={currency} />
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
              <TransactionsList type="debt" currentDate={currentDate} currency={currency} />
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
              <TransactionsList type="income" currentDate={currentDate} currency={currency} />
            </div>
          </div>
        );
      case 'subscriptions':
        return (
          <div style={{ padding: '24px 0' }}>
            <div style={{ padding: '0 20px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '8px' }}>Suscripciones</h2>
              <p style={{ color: '#666', fontSize: '14px', marginBottom: '24px' }}>Gestiona tus servicios digitales y membresías.</p>
            </div>
            <MonthNavigator currentDate={currentDate} onChange={changeMonth} />
            <SubscriptionsSection currentDate={currentDate} user={user} onUpgrade={() => setShowUpgrade(true)} currency={currency} />
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
            dragConstraints={{ top: 0, bottom: 0 }}
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
              display: 'flex',
              flexDirection: 'column'
            }}>

            {/* Draggable Header */}
            <div style={{ padding: '24px 20px 0 20px', flexShrink: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '24px', fontWeight: '800' }}>Configuración</h2>
                <button onPointerDown={(e) => e.stopPropagation()} onClick={() => setShowSettings(false)} style={{ background: '#222', border: 'none', color: '#fff', padding: '8px', borderRadius: '50%', cursor: 'pointer' }}>
                  <X size={20} />
                </button>
              </div>

              <div onPointerDown={(e) => e.stopPropagation()} style={{ display: 'flex', gap: '8px', marginBottom: '24px', background: '#111', padding: '4px', borderRadius: '14px' }}>
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
            </div>

            {/* Scrollable Content */}
            <div
              onPointerDown={(e) => e.stopPropagation()}
              style={{ flex: 1, overflowY: 'auto', padding: '0 20px 24px 20px' }}
            >
              {settingsTab === 'categories' ?
                <CategorySettings user={user} draftData={draftCategories} onUpdateDraft={setDraftCategories} /> :
                <PasswordSettings
                  draftData={draftProfile}
                  onUpdateDraft={setDraftProfile}
                  user={user}
                  onCurrencyChange={(newCurrency) => {
                    setCurrency(newCurrency);
                    if (user) setUser({ ...user, currency: newCurrency });
                  }}
                />
              }
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tab changing loader */}
      <AnimatePresence>
        {tabChanging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 1500,
              background: 'rgba(10,10,10,0.75)',
              backdropFilter: 'blur(4px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
              <div className="tab-loader" />
            </div>
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

      {!showSettings && <Dock activeTab={activeTab} onChange={handleTabChange} />}

      <AnimatePresence>
        {showAddModal && (
          <AddExpenseModal
            onClose={() => {
              setShowAddModal(false);
              setPresetCategory(null);
            }}
            presetCategory={presetCategory}
            user={user}
            editType={
              activeTab === 'income' ? 'income' :
                activeTab === 'recurring' ? 'recurring' :
                  activeTab === 'debts' ? 'debt' : 'expense'
            }
            draftData={draftExpense}
            onUpdateDraft={setDraftExpense}
            currency={currency}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showTutorial && (
          <TutorialOverlay onComplete={() => setShowTutorial(false)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showUpgrade && (
          <UpgradeModal onClose={() => setShowUpgrade(false)} />
        )}
      </AnimatePresence>

      <style>{`
        .loader { border: 3px solid #1a1a1a; border-top: 3px solid #fff; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; }
        .tab-loader {
          width: 36px; height: 36px; border-radius: 50%;
          border: 2.5px solid rgba(255,255,255,0.1);
          border-top-color: rgba(255,255,255,0.8);
          animation: spin 0.7s linear infinite;
        }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        ::-webkit-scrollbar { width: 0px; background: transparent; }
      `}</style>
    </div>
  )
}

export default App

