import { useState, useEffect } from 'react'
import { onAuthStateChanged, getRedirectResult } from 'firebase/auth'
import { auth } from './lib/firebase'
import Dashboard from './components/Dashboard'
import Dock from './components/Dock'
import Login from './components/Login'
import GastosHub from './components/GastosHub'
import IngresosHub from './components/IngresosHub'
import CategorySettings from './components/CategorySettings'
import PasswordSettings from './components/PasswordSettings'
import AddExpenseModal from './components/AddExpenseModal'
import Superadmin from './components/Superadmin'
import SavingsGoals from './components/SavingsGoals'
import SharedWorkspace from './components/SharedWorkspace'
import { X, Plus } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from './lib/firebase'
import Onboarding from './components/Onboarding'
import TutorialOverlay from './components/TutorialOverlay'
import UpgradeModal from './components/UpgradeModal'
import InstallPWATutorial from './components/InstallPWATutorial'
import { fetchLiveRates } from './lib/currencies'

// Inicializar el tema local
const storedTheme = localStorage.getItem('theme');
if (storedTheme === 'light') {
  document.body.classList.add('light-theme');
} else {
  document.body.classList.remove('light-theme');
}

// Capturar link de referidos
const urlParams = new URLSearchParams(window.location.search);
const refCode = urlParams.get('ref');
if (refCode) {
  localStorage.setItem('fluxRefCode', refCode);
  window.history.replaceState({}, document.title, window.location.pathname);
}


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
  const [settingsTab, setSettingsTab] = useState<'categories' | 'profile' | 'admin'>('categories')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showTutorial, setShowTutorial] = useState(false)
  const [showUpgrade, setShowUpgrade] = useState(false)
  const [currency, setCurrency] = useState<{ code: string, symbol: string }>({ code: 'PEN', symbol: 'S/' })
  const [presetCategory, setPresetCategory] = useState<string | null>(null)
  const [currentDate, setCurrentDate] = useState(() => {
    const today = new Date();
    if (today.getDate() >= 24) {
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

  // Called by Login component after successful verification or login
  const handleLoginSuccess = async () => {
    if (auth.currentUser) {
      try {
        await auth.currentUser.reload();
        const freshUser = Object.assign(Object.create(Object.getPrototypeOf(auth.currentUser)), auth.currentUser);
        setUser(freshUser);
        // Write to global users_public collection for shared budget user lookup
        await setDoc(doc(db, 'users_public', auth.currentUser.uid), {
          displayName: auth.currentUser.displayName || auth.currentUser.email?.split('@')[0] || 'Usuario',
          email: auth.currentUser.email,
          photoURL: auth.currentUser.photoURL || null,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch {
        setUser(auth.currentUser);
      }
    }
  };

  useEffect(() => {
    // Fetch live exchange rates in the background on startup
    fetchLiveRates().catch(console.warn);
  }, []);

  useEffect(() => {
    getRedirectResult(auth).catch(console.error);

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        try {
          const userRef = doc(db, 'users', currentUser.uid);
          const userDoc = await getDoc(userRef);
          if (userDoc.exists()) {
            const userData = userDoc.data();

            // Sincronizar datos básicos si faltan o han cambiado
            if (userData.email !== currentUser.email || userData.displayName !== currentUser.displayName) {
              import('firebase/firestore').then(({ updateDoc }) => {
                updateDoc(userRef, {
                  email: currentUser.email || '',
                  displayName: currentUser.displayName || '',
                  photoURL: currentUser.photoURL || ''
                }).catch(console.error);
              });
            }

            // Sync Theme
            if (userData.theme) {
              localStorage.setItem('theme', userData.theme);
              if (userData.theme === 'light') {
                document.body.classList.add('light-theme');
              } else {
                document.body.classList.remove('light-theme');
              }
            } else {
              const currentLocalTheme = localStorage.getItem('theme') || 'dark';
              import('firebase/firestore').then(({ updateDoc }) => {
                updateDoc(userRef, { theme: currentLocalTheme }).catch(console.error);
              });
            }

            setShowOnboarding(!userData.onboardingCompleted);
            const isCreator = currentUser.email === 'erickrendon18@gmail.com';
            const proUntil = userData.proUntil ? new Date(userData.proUntil) : null;
            const validProUntil = proUntil && proUntil > new Date();
            const userIsPro = isCreator || userData.isPro || validProUntil;
            const userTutorialCompleted = userData.tutorialCompleted || false;
            const userCurrency = userData.currency || { code: 'PEN', symbol: 'S/' };
            const userTheme = userData.theme || localStorage.getItem('theme') || 'dark';

            setCurrency(userCurrency);
            setUser({ ...currentUser, isPro: userIsPro, tutorialCompleted: userTutorialCompleted, currency: userCurrency, theme: userTheme, hasAddedFirstExpense: userData.hasAddedFirstExpense });

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
      background: 'var(--bg-color)', color: 'var(--text-primary)', position: 'relative', overflow: 'hidden'
    }}>
      {/* Background glow */}
      <div style={{ position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%, -50%)', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(255,255,255,0.04) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(40px)', animation: 'pulse-glow 2s ease-in-out infinite' }} />

      {/* Logo area */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', animation: 'fadeSlideUp 0.6s ease forwards', opacity: 0 }}>
        <div style={{ fontSize: '64px', lineHeight: 1, filter: 'drop-shadow(0 0 24px rgba(255,255,255,0.3))' }}>⚡</div>
        <h1 style={{ fontSize: '42px', fontWeight: '900', letterSpacing: '-3px', color: 'var(--text-primary)', margin: 0 }}>FLUX</h1>
        <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', letterSpacing: '3px', textTransform: 'uppercase', margin: 0 }}>Finanza Inteligente</p>
      </div>

      {/* Progress bar */}
      <div style={{ position: 'absolute', bottom: '80px', width: '120px' }}>
        <div style={{ height: '2px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px', overflow: 'hidden' }}>
          <div style={{ height: '100%', background: 'var(--text-primary)', borderRadius: '2px', animation: 'progress-fill 1.6s ease-out forwards' }} />
        </div>
      </div>

      <style>{`
        @keyframes fadeSlideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse-glow { 0%, 100% { opacity: 0.5; transform: translate(-50%, -50%) scale(1); } 50% { opacity: 1; transform: translate(-50%, -50%) scale(1.1); } }
        @keyframes progress-fill { from { width: 0%; } to { width: 100%; } }
      `}</style>
    </div>
  );

  if (!user) return <Login onLogin={handleLoginSuccess} />

  // Block access if email/password user hasn't verified their email
  // Use auth.currentUser for live emailVerified status (not cached state)
  const isEmailProvider = user.providerData?.some((p: any) => p.providerId === 'password');
  const emailVerified = auth.currentUser?.emailVerified ?? user.emailVerified;
  if (isEmailProvider && !emailVerified) {
    return <Login onLogin={handleLoginSuccess} />;
  }

  if (showOnboarding) return <Onboarding onComplete={() => setShowOnboarding(false)} />

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <Dashboard
            currentDate={currentDate}
            changeMonth={changeMonth}
            onOpenSettings={() => {
              setSettingsTab('categories');
              setShowSettings(true);
            }}
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
      case 'gastos':
        return (
          <GastosHub
            currentDate={currentDate}
            changeMonth={changeMonth}
            currency={currency}
            user={user}
            onUpgrade={() => setShowUpgrade(true)}
          />
        );
      case 'ingresos':
        return (
          <IngresosHub
            currentDate={currentDate}
            changeMonth={changeMonth}
            currency={currency}
            user={user}
            onUpgrade={() => setShowUpgrade(true)}
          />
        );
      case 'savings':
        return <SavingsGoals currency={currency} user={user} onUpgrade={() => setShowUpgrade(true)} />;
      case 'shared':
        return <SharedWorkspace user={user} currency={currency} onUpgrade={() => setShowUpgrade(true)} />;
      default:
        return null;
    }
  };

  return (
    <div className="desktop-wrapper">
      <div className="app-container">

        {/* Settings Modal (Categorías) */}
        <AnimatePresence>
          {showSettings && (
            <div className="settings-modal-wrapper" onClick={() => setShowSettings(false)}>
              <motion.div
                drag={window.innerWidth > 1024 ? false : "y"}
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={0.2}
                onDragEnd={(_, info) => {
                  if (info.offset.y > 150) setShowSettings(false);
                }}
                initial={window.innerWidth > 1024 ? { opacity: 0, scale: 0.95 } : { y: '100%' }}
                animate={window.innerWidth > 1024 ? { opacity: 1, scale: 1 } : { y: 0 }}
                exit={window.innerWidth > 1024 ? { opacity: 0, scale: 0.95 } : { y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="settings-modal-content"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                style={{
                  position: window.innerWidth > 1024 ? 'relative' : 'absolute',
                  zIndex: 2000,
                  display: 'flex',
                  flexDirection: 'column'
                }}>

                {/* Draggable Header */}
                <div style={{ padding: '24px 20px 0 20px', flexShrink: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h2 style={{ fontSize: '24px', fontWeight: '800' }}>Configuración</h2>
                    <button onPointerDown={(e) => e.stopPropagation()} onClick={() => setShowSettings(false)} style={{ background: 'var(--border-color)', border: 'none', color: 'var(--text-primary)', padding: '8px', borderRadius: '50%', cursor: 'pointer' }}>
                      <X size={20} />
                    </button>
                  </div>

                  <div onPointerDown={(e) => e.stopPropagation()} style={{ display: 'flex', gap: '8px', marginBottom: '24px', background: 'var(--card-bg-light)', padding: '4px', borderRadius: '14px' }}>
                    <button
                      onClick={() => setSettingsTab('categories')}
                      style={{
                        flex: 1, padding: '10px', borderRadius: '10px', border: 'none', fontSize: '13px', fontWeight: 'bold',
                        background: settingsTab === 'categories' ? 'var(--border-color)' : 'transparent',
                        color: settingsTab === 'categories' ? 'var(--text-primary)' : 'var(--text-secondary)',
                        transition: 'all 0.2s'
                      }}>Categorías</button>
                    <button
                      onClick={() => setSettingsTab('profile')}
                      style={{
                        flex: 1, padding: '10px', borderRadius: '10px', border: 'none', fontSize: '13px', fontWeight: 'bold',
                        background: settingsTab === 'profile' ? 'var(--border-color)' : 'transparent',
                        color: settingsTab === 'profile' ? 'var(--text-primary)' : 'var(--text-secondary)'
                      }}>Perfil & Seguridad</button>
                    {user?.email === 'erickrendon18@gmail.com' && (
                      <button
                        onClick={() => setSettingsTab('admin')}
                        style={{
                          flex: 1, padding: '10px', borderRadius: '10px', border: 'none', fontSize: '13px', fontWeight: 'bold',
                          background: settingsTab === 'admin' ? 'var(--border-color)' : 'transparent',
                          color: settingsTab === 'admin' ? 'var(--text-primary)' : 'var(--text-secondary)'
                        }}>Admin</button>
                    )}
                  </div>
                </div>

                {/* Scrollable Content */}
                <div
                  onPointerDown={(e) => e.stopPropagation()}
                  style={{ flex: 1, overflowY: 'auto', padding: '0 20px 24px 20px' }}
                >
                  {settingsTab === 'admin' ? <Superadmin /> :
                    settingsTab === 'categories' ?
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
            </div>
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
                position: 'absolute', inset: 0, zIndex: 1500,
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

        {!showSettings && <Dock activeTab={activeTab} onChange={handleTabChange} />}

        {/* Navegación por Pestañas */}
        <div className="desktop-content-area" style={{ overflowX: 'hidden' }}>
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
          <div className="fab-container" style={{
            position: 'absolute',
            bottom: '144px',
            left: '0',
            width: '100%',
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

        <InstallPWATutorial />

      </div>

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

