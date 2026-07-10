import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { api } from './api';

const SessionContext = createContext(null);
const useSession = () => useContext(SessionContext);

function AppProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem('sessionToken') || '');
  const [user, setUser] = useState(null);
  const [selectedTool, setSelectedTool] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setUser(null);
      localStorage.removeItem('sessionToken');
      return;
    }

    localStorage.setItem('sessionToken', token);
    api
      .getCurrentStudent(token)
      .then((result) => setUser(result.student))
      .catch(() => {
        setToken('');
        setUser(null);
      });
  }, [token]);

  const login = async (studentId, pin) => {
    const result = await api.login(studentId, pin);
    setToken(result.token);
    setUser(result.student);
    setError('');
    return result;
  };

  const scan = async (qrData) => {
    const result = await api.scan(qrData);
    setToken(result.token);
    setUser(result.student);
    setError('');
    return result;
  };

  const logout = () => {
    setToken('');
    setUser(null);
    setSelectedTool(null);
    setMessage('');
    setError('');
  };

  return (
    <SessionContext.Provider
      value={{
        token,
        user,
        selectedTool,
        setSelectedTool,
        login,
        scan,
        logout,
        message,
        setMessage,
        error,
        setError,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

function useAuthGuard() {
  const { token } = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      navigate('/');
    }
  }, [token, navigate]);
}

const TopBar = ({ title = 'TUP-Manila Inventory' }) => {
  const { user } = useSession();
  const [timeLeft, setTimeLeft] = useState(119);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const timerStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  const isDanger = timeLeft < 30;

  return (
    <header className="fixed top-0 w-full z-50 flex justify-between items-center px-lg py-md bg-surface border-b border-outline-variant">
      <div className="flex items-center gap-md">
        <div className="w-10 h-10 bg-primary flex items-center justify-center rounded-lg shadow-sm">
          <span className="material-symbols-outlined text-white" style={{ fontVariationSettings: "'FILL' 1" }}>
            precision_manufacturing
          </span>
        </div>
        <div>
          <h1 className="font-headline-md text-headline-md font-bold text-primary tracking-tight">{title}</h1>
          {user && <p className="font-label-md text-label-md text-secondary uppercase tracking-widest">{user.name}</p>}
        </div>
      </div>
      <div className="flex items-center gap-lg">
        <div className={`flex items-center gap-sm px-md py-xs rounded-full border border-outline-variant ${isDanger ? 'bg-error-container border-error' : 'bg-surface-container'}`}>
          <span className={`material-symbols-outlined text-[20px] ${isDanger ? 'text-error animate-pulse' : 'text-primary'}`}>timer</span>
          <span className={`font-mono-data text-mono-data font-bold ${isDanger ? 'text-error' : 'text-primary'}`}>{timerStr}</span>
        </div>
        <div className="h-8 w-[1px] bg-outline-variant"></div>
        <div className="flex items-center gap-md">
          <div className="flex flex-col items-end">
            <span className="font-label-md text-label-md text-secondary uppercase">Station</span>
            <span className="font-title-lg text-title-lg text-on-background font-bold">LAB-KIO-04</span>
          </div>
        </div>
      </div>
    </header>
  );
};

const Footer = () => (
  <footer className="w-full h-12 bg-surface-container-highest border-t border-outline-variant flex items-center px-lg justify-between fixed bottom-0">
    <div className="flex items-center gap-lg text-secondary">
      <div className="flex items-center gap-xs">
        <span className="material-symbols-outlined text-[18px]">wifi</span>
        <span className="font-label-md text-label-md">TUPM-Secure-Grid</span>
      </div>
      <div className="flex items-center gap-xs">
        <span className="material-symbols-outlined text-[18px]">update</span>
        <span className="font-label-md text-label-md">Last Sync: Just Now</span>
      </div>
    </div>
    <div className="flex items-center gap-sm">
      <span className="font-label-md text-label-md text-secondary uppercase tracking-widest">Industrial Precision Interface</span>
      <span className="w-2 h-2 rounded-full bg-primary"></span>
      <span className="font-mono-data text-mono-data text-[10px] text-secondary">v2.4.0-REL</span>
    </div>
  </footer>
);

const ScreenWelcome = () => {
  const navigate = useNavigate();
  const { login, scan, user, message, setMessage, error, setError } = useSession();
  const [studentId, setStudentId] = useState('');
  const [pin, setPin] = useState('4321');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) {
      navigate('/commands');
    }
  }, [user, navigate]);

  const handleScan = async () => {
    const qrData = window.prompt('Enter QR payload (e.g. TUPM-23-1111)');
    if (!qrData) {
      return;
    }

    setBusy(true);
    setError('');
    try {
      await scan(qrData.trim());
      setMessage('Student recognized. Redirecting to commands...');
      navigate('/commands');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleLogin = async () => {
    if (!studentId.trim() || !pin.trim()) {
      setError('Enter Student ID and PIN.');
      return;
    }

    setBusy(true);
    setError('');
    try {
      await login(studentId.trim(), pin.trim());
      setMessage('Login successful. Redirecting...');
      navigate('/commands');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="text-on-background min-h-screen flex flex-col">
      <header className="fixed top-0 w-full z-50 flex justify-between items-start px-lg py-md bg-surface border-b border-outline-variant">
        <div className="flex items-center gap-md">
          <div className="w-12 h-12 bg-primary flex items-center justify-center rounded">
            <span className="material-symbols-outlined text-white text-3xl">precision_manufacturing</span>
          </div>
          <div>
            <h1 className="font-headline-md text-headline-md font-bold text-primary leading-tight">TUP-Manila Inventory</h1>
            <p className="font-label-md text-label-md text-secondary tracking-widest uppercase">Automated Lab Tools System</p>
          </div>
        </div>
        <div className="text-right">
          <div className="font-mono-data text-headline-md font-bold text-on-background">{new Date().toLocaleTimeString('en-GB')}</div>
          <div className="font-label-md text-label-md text-secondary uppercase tracking-wider">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).toUpperCase()}</div>
        </div>
      </header>
      <main className="flex-1 relative flex flex-col items-center justify-center p-xl pt-32">
        <div className="absolute inset-0 industrial-grid pointer-events-none opacity-20"></div>
        <div className="relative z-10 text-center max-w-4xl w-full flex flex-col items-center">
          <div className="mb-xl">
            <h2 className="font-display-lg text-display-lg text-on-background mb-sm">Welcome to the TUPM Lab Locker</h2>
            <p className="font-body-lg text-body-lg text-secondary">Scan your student QR code or sign in to start a borrow or return transaction.</p>
          </div>
          <div className="relative group cursor-pointer" onClick={handleScan}>
            <div className="absolute -top-4 -left-4 w-12 h-12 border-t-4 border-l-4 border-primary"></div>
            <div className="absolute -top-4 -right-4 w-12 h-12 border-t-4 border-r-4 border-primary"></div>
            <div className="absolute -bottom-4 -left-4 w-12 h-12 border-b-4 border-l-4 border-primary"></div>
            <div className="absolute -bottom-4 -right-4 w-12 h-12 border-b-4 border-r-4 border-primary"></div>
            <div className="w-80 bg-surface-container-lowest border border-outline p-md relative overflow-hidden flex items-center justify-center h-64">
              <div className="scan-line absolute top-0 left-0 w-full z-20"></div>
              <div className="w-full h-full flex flex-col items-center justify-center text-outline-variant opacity-40">
                <span className="material-symbols-outlined text-[160px]">qr_code_scanner</span>
              </div>
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-on-background/5 backdrop-blur-[1px]">
                <div className="bg-primary px-lg py-sm text-on-primary font-label-md rounded-full shadow-lg">Tap to scan</div>
              </div>
            </div>
          </div>
          <div className="w-full max-w-md mt-lg flex flex-col items-center">
            <div className="flex items-center w-full gap-md mb-lg">
              <div className="flex-1 h-px bg-outline-variant"></div>
              <span className="font-mono-data text-label-md text-secondary uppercase tracking-widest">OR</span>
              <div className="flex-1 h-px bg-outline-variant"></div>
            </div>
            <div className="w-full bg-surface-container-low border border-outline-variant p-lg rounded-lg">
              <div className="space-y-lg">
                <div className="flex gap-sm">
                  <input
                    className="flex-1 bg-surface-container-lowest border border-outline-variant px-md py-sm font-body-md text-on-background focus:outline-none focus:border-primary rounded"
                    placeholder="Student ID"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                  />
                  <input
                    className="w-32 bg-surface-container-lowest border border-outline-variant px-md py-sm font-body-md text-on-background focus:outline-none focus:border-primary rounded"
                    placeholder="PIN"
                    type="password"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                  />
                </div>
                <button
                  onClick={handleLogin}
                  disabled={busy}
                  className="w-full bg-primary text-on-primary px-lg py-sm font-label-md uppercase tracking-wider rounded hover:bg-primary-container transition-colors"
                >
                  {busy ? 'Signing in...' : 'Continue'}
                </button>
                {message && <p className="text-emerald-700 font-bold">{message}</p>}
                {error && <p className="text-error font-bold">{error}</p>}
              </div>
            </div>
          </div>
        </div>
      </main>
      <footer className="p-md bg-surface-container-low border-t border-outline-variant flex justify-center gap-xl">
        <div className="flex items-center gap-sm">
          <span className="material-symbols-outlined text-secondary text-sm">security</span>
          <span className="font-label-md text-label-md text-secondary">Encrypted Connection</span>
        </div>
        <div className="flex items-center gap-sm" onClick={() => navigate('/admin')}>
          <span className="material-symbols-outlined text-secondary text-sm">admin_panel_settings</span>
          <span className="font-label-md text-label-md text-secondary cursor-pointer">Admin Panel</span>
        </div>
      </footer>
    </div>
  );
};

const ScreenCommands = () => {
  const navigate = useNavigate();
  const { user, logout } = useSession();
  useAuthGuard();

  return (
    <div className="industrial-grid min-h-screen flex flex-col vignette-overlay">
      <TopBar />
      <main className="flex-grow flex flex-col items-center justify-center pt-xl px-lg mt-16 relative">
        <div className="w-full max-w-6xl z-10 py-xl">
          <div className="mb-xl text-center">
            <h2 className="font-headline-lg text-headline-lg text-on-background">Welcome back, {user?.name || 'Student'}</h2>
            <div className="flex items-center justify-center gap-sm mt-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-label-md text-label-md text-secondary uppercase tracking-widest">Authenticated & Validated System Access</span>
            </div>
          </div>
          <div className="flex items-center gap-md mb-lg">
            <div className="h-[1px] flex-grow bg-outline-variant"></div>
            <p className="font-title-lg text-title-lg text-secondary uppercase tracking-widest whitespace-nowrap px-md">Select a transaction to proceed</p>
            <div className="h-[1px] flex-grow bg-outline-variant"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-xl max-w-5xl mx-auto h-[440px]">
            <button
              onClick={() => navigate('/deposit')}
              className="group relative flex flex-col items-center justify-center bg-white border-2 border-outline-variant rounded-xl p-xl shadow-sm hover:border-primary hover:shadow-2xl transition-all duration-300 overflow-hidden text-left"
            >
              <div className="absolute top-0 left-0 w-2 h-full bg-primary opacity-20 group-hover:opacity-100 transition-opacity"></div>
              <div className="mb-lg w-24 h-24 bg-primary-fixed rounded-2xl flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-[64px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  outbound
                </span>
              </div>
              <span className="font-display-lg text-display-lg text-on-background tracking-tighter mb-sm">BORROW</span>
              <p className="font-body-lg text-body-lg text-secondary max-w-[320px] text-center">Checkout laboratory equipment and automatically unlock the assigned compartment.</p>
              <span className="absolute -bottom-4 -right-4 font-display-lg text-[140px] text-surface-container opacity-5 select-none pointer-events-none">01</span>
            </button>
            <button
              onClick={() => navigate('/return-confirm')}
              className="group relative flex flex-col items-center justify-center bg-white border-2 border-outline-variant rounded-xl p-xl shadow-sm hover:border-on-secondary-container hover:shadow-2xl transition-all duration-300 overflow-hidden text-left"
            >
              <div className="absolute top-0 right-0 w-2 h-full bg-secondary opacity-20 group-hover:opacity-100 transition-opacity"></div>
              <div className="mb-lg w-24 h-24 bg-secondary-container rounded-2xl flex items-center justify-center text-secondary group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-[64px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  inventory_2
                </span>
              </div>
              <span className="font-display-lg text-display-lg text-on-background tracking-tighter mb-sm">RETURN</span>
              <p className="font-body-lg text-body-lg text-secondary max-w-[320px] text-center">Log items back into the inventory system and reopen the storage compartment.</p>
              <span className="absolute -bottom-4 -right-4 font-display-lg text-[140px] text-surface-container opacity-5 select-none pointer-events-none">02</span>
            </button>
          </div>
          <div className="mt-xl flex justify-between items-center px-md max-w-5xl mx-auto">
            <button
              onClick={logout}
              className="flex items-center gap-md px-lg py-md border-2 border-outline text-on-surface-variant font-bold rounded-lg hover:bg-error-container hover:text-on-error-container hover:border-error transition-all duration-200"
            >
              <span className="material-symbols-outlined">cancel</span>
              <span className="font-title-lg text-title-lg uppercase">Sign Out</span>
            </button>
            <div className="flex items-center gap-lg">
              <div className="flex flex-col items-end">
                <span className="font-label-md text-label-md text-secondary uppercase">Station</span>
                <span className="font-title-lg text-title-lg text-on-background font-bold">LAB-KIO-04</span>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

const ScreenDeposit = () => {
  const navigate = useNavigate();
  const { setMessage } = useSession();
  const [status, setStatus] = useState('Authorizing session...');

  useAuthGuard();

  useEffect(() => {
    const timer1 = setTimeout(() => setStatus('Validating account and tool access...'), 1200);
    const timer2 = setTimeout(() => setStatus('Preparing available tool list...'), 2600);
    const timer3 = setTimeout(() => {
      setStatus('Ready to select a tool');
      setMessage('Session verified. Choose a tool to borrow.');
      navigate('/tool-selection');
    }, 4200);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [navigate, setMessage]);

  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col overflow-hidden">
      <TopBar />
      <main className="flex-grow flex items-center justify-center pt-24 px-lg relative">
        <div className="absolute inset-0 opacity-5 pointer-events-none overflow-hidden">
          <div className="grid grid-cols-12 h-full w-full">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="border-r border-outline h-full"></div>
            ))}
          </div>
        </div>
        <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-xl items-center z-10">
          <div className="space-y-lg">
            <h2 className="font-display-lg text-display-lg text-on-surface leading-tight">Session confirmed</h2>
            <p className="font-body-lg text-body-lg text-secondary max-w-md">
              Your student credential is valid. The system is preparing the current tool inventory and compartment mapping.
            </p>
            <div className="p-md rounded-xl border bg-surface-container-highest border-outline-variant">
              <div className="font-title-lg text-title-lg text-on-surface mb-sm">{status}</div>
              <div className="font-label-md text-label-md text-secondary uppercase">Please wait while the system loads the available tools.</div>
            </div>
          </div>
          <div className="relative flex flex-col items-center">
            <div className="w-72 h-72 relative flex items-center justify-center">
              <div className="absolute inset-0 border-2 border-dashed border-outline-variant rounded-full animate-[spin_20s_linear_infinite]"></div>
              <div className="w-60 h-60 rounded-full border-4 border-outline-variant bg-surface-container-highest flex items-center justify-center shadow-2xl">
                <span className="material-symbols-outlined text-[120px] text-primary">inventory_2</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

const ScreenToolSelection = () => {
  const navigate = useNavigate();
  const { token, setSelectedTool, setError } = useSession();
  const [tools, setTools] = useState([]);
  const [loading, setLoading] = useState(true);

  useAuthGuard();

  useEffect(() => {
    api
      .getTools(token)
      .then((result) => setTools(result.tools || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token, setError]);

  const handleSelect = (tool) => {
    setSelectedTool(tool);
    navigate('/tool-release');
  };

  return (
    <div className="min-h-screen flex flex-col">
      <TopBar />
      <main className="pt-24 px-lg pb-xl flex flex-col max-w-screen-2xl mx-auto w-full">
        <header className="mb-lg">
          <h1 className="font-headline-lg text-headline-lg text-on-background">Select the tool you wish to borrow</h1>
          <p className="font-body-lg text-body-lg text-secondary mt-xs">Choose from the available high-precision laboratory equipment.</p>
        </header>
        {loading ? (
          <div className="p-lg bg-white rounded-xl shadow-sm text-center">Loading available tools...</div>
        ) : (
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-md flex-1">
            {tools.map((tool) => (
              <div
                key={tool.id}
                onClick={() => handleSelect(tool)}
                className="group flex flex-col bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden cursor-pointer hover:shadow-xl transition-all"
              >
                <div className="aspect-video relative bg-surface-container flex items-center justify-center text-center p-md">
                  <div>
                    <span className="font-title-lg text-title-lg text-on-background">{tool.name}</span>
                    <div className="text-secondary mt-sm">Slot {tool.slot}</div>
                  </div>
                </div>
                <div className="p-lg flex-1 flex flex-col">
                  <p className="font-body-md text-secondary mb-lg flex-1">{tool.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="font-label-md uppercase tracking-wide text-secondary">Available {tool.availableQty}/{tool.totalQty}</span>
                    <button className="py-md bg-primary text-on-primary font-label-md rounded-lg transition-all hover:bg-primary-container">SELECT</button>
                  </div>
                </div>
              </div>
            ))}
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
};

const ScreenToolRelease = () => {
  const navigate = useNavigate();
  const { token, selectedTool, setError, setMessage } = useSession();
  const [busy, setBusy] = useState(false);

  useAuthGuard();

  useEffect(() => {
    if (!selectedTool) {
      navigate('/tool-selection');
    }
  }, [selectedTool, navigate]);

  const handleBorrow = async () => {
    if (!selectedTool) {
      setError('No tool selected.');
      return;
    }

    setBusy(true);
    setError('');

    try {
      const borrowResult = await api.borrow(selectedTool.id, selectedTool.slot, token);
      await api.openCompartment(selectedTool.slot, token);
      setMessage(`Borrow confirmed. ${selectedTool.name} assigned to ${selectedTool.slot}.`);
      navigate('/commands');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (!selectedTool) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <TopBar />
      <main className="max-w-6xl mx-auto pt-32 pb-12 px-lg">
        <div className="text-center mb-xl">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-100 mb-md">
            <span className="material-symbols-outlined text-emerald-600 text-5xl">lock_open</span>
          </div>
          <h2 className="font-display-lg text-display-lg text-on-surface mb-xs">Compartment Unlock Ready</h2>
          <p className="text-secondary">Please confirm the selected tool and complete the checkout.</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-xl">
          <div className="lg:col-span-7 bg-surface-container-lowest p-lg rounded-xl border border-outline-variant shadow-sm">
            <h3 className="font-title-lg text-primary flex items-center gap-sm mb-lg">Selected Tool</h3>
            <div className="space-y-md">
              <div className="p-lg bg-white rounded-xl border border-outline-variant">
                <h3 className="font-headline-md mb-2">{selectedTool.name}</h3>
                <p className="text-secondary mb-1">{selectedTool.description}</p>
                <div className="font-mono-data text-label-md uppercase tracking-wide">Assigned slot: {selectedTool.slot}</div>
              </div>
              <div className="p-lg bg-white rounded-xl border border-outline-variant">
                <div className="font-label-md text-secondary uppercase mb-2">Checkout details</div>
                <div className="grid grid-cols-2 gap-4 text-sm text-secondary">
                  <div>
                    <span className="block font-bold text-on-surface">Student</span>
                    <span>{selectedTool.name ? 'Verified user' : 'Student'}</span>
                  </div>
                  <div>
                    <span className="block font-bold text-on-surface">Compartment</span>
                    <span>{selectedTool.slot}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="lg:col-span-5 space-y-lg">
            <div className="bg-surface-container p-lg rounded-xl">
              <h3 className="font-headline-md mb-md">Steps to Complete</h3>
              <ul className="space-y-4">
                <li className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold">1</div>
                  <p className="text-on-surface">Confirm tool check-out and open the assigned compartment.</p>
                </li>
                <li className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold">2</div>
                  <p className="text-on-surface">Retrieve the tool and follow safety instructions.</p>
                </li>
              </ul>
            </div>
            <button
              onClick={handleBorrow}
              disabled={busy}
              className="w-full py-lg bg-primary hover:bg-primary-container text-white font-bold rounded-xl transition-all shadow-lg"
            >
              {busy ? 'Completing borrow...' : 'Confirm and Unlock'}
            </button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

const ScreenReturnConfirm = () => {
  const navigate = useNavigate();
  const { token, setError } = useSession();
  const [transaction, setTransaction] = useState(null);
  const [loading, setLoading] = useState(true);

  useAuthGuard();

  useEffect(() => {
    api
      .getActiveTransactions(token)
      .then((result) => setTransaction(result.transactions?.[0] || null))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token, setError]);

  const handleOpen = async () => {
    if (!transaction) {
      return;
    }
    setError('');
    try {
      await api.openCompartment(transaction.compartmentId || 'ID-01', token);
      navigate('/return-action');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="industrial-grid min-h-screen flex flex-col">
      <TopBar />
      <main className="flex-grow pt-[80px] px-lg pb-lg flex flex-col items-center justify-center">
        <div className="w-full max-w-6xl grid grid-cols-12 gap-gutter">
          <div className="col-span-12 mb-md">
            <h1 className="font-headline-lg text-on-surface">Confirm Equipment Return</h1>
            <p className="font-body-md text-secondary">Verify the current transaction before opening the storage compartment.</p>
          </div>
          {loading ? (
            <div className="col-span-12 p-lg bg-white border rounded-xl text-center">Loading active transaction…</div>
          ) : transaction ? (
            <>
              <div className="col-span-12 lg:col-span-7 flex flex-col gap-gutter">
                <div className="bg-surface-container-lowest border p-lg flex items-center gap-lg">
                  <div className="w-24 h-24 bg-surface-container border-2 border-primary-fixed overflow-hidden flex-shrink-0 rounded-xl flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary text-4xl">inventory_2</span>
                  </div>
                  <div className="flex-grow">
                    <h2 className="font-headline-md">{transaction.studentId}</h2>
                    <span className="font-mono-data text-secondary">Tool: {transaction.toolName}</span>
                    <div className="mt-2 font-label-md text-secondary">Due at: {new Date(transaction.dueAt).toLocaleString()}</div>
                  </div>
                </div>
                <div className="bg-on-secondary-fixed text-on-primary p-lg flex justify-between items-center">
                  <div>
                    <span className="font-label-md text-secondary-fixed-dim uppercase">Return window</span>
                    <div className="font-display-lg text-display-lg font-mono-data">3 hours</div>
                  </div>
                  <div className="flex items-center gap-xs text-secondary-fixed">
                    <span className="w-3 h-3 bg-emerald-500 rounded-full"></span>
                    <span className="font-title-lg">Ready</span>
                  </div>
                </div>
              </div>
              <div className="col-span-12 lg:col-span-5 flex flex-col gap-gutter">
                <button
                  onClick={handleOpen}
                  className="group relative bg-primary text-on-primary h-24 flex items-center justify-center gap-md rounded shadow-xl hover:bg-surface-tint transition-all"
                >
                  <span className="material-symbols-outlined text-4xl">meeting_room</span>
                  <div className="text-left">
                    <span className="font-headline-md block">OPEN COMPARTMENT</span>
                    <span className="font-label-md uppercase opacity-80">{transaction.compartmentId || 'ID-01'} will unlock immediately</span>
                  </div>
                </button>
                <button onClick={() => navigate('/commands')} className="bg-surface-container-high text-secondary h-14 flex items-center justify-center gap-sm">
                  <span className="material-symbols-outlined">cancel</span>
                  <span>Cancel Return</span>
                </button>
              </div>
            </>
          ) : (
            <div className="col-span-12 p-lg bg-white border rounded-xl text-center">No active borrow transaction found for your account.</div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

const ScreenReturnAction = () => {
  const navigate = useNavigate();
  const { token, setError, setMessage } = useSession();
  const [transaction, setTransaction] = useState(null);
  const [busy, setBusy] = useState(false);

  useAuthGuard();

  useEffect(() => {
    api
      .getActiveTransactions(token)
      .then((result) => setTransaction(result.transactions?.[0] || null))
      .catch((err) => setError(err.message));
  }, [token, setError]);

  const handleReturn = async () => {
    if (!transaction) {
      return;
    }

    setBusy(true);
    setError('');

    try {
      await api.openCompartment(transaction.compartmentId || 'ID-01', token);
      await api.returnTransaction(transaction.id, transaction.compartmentId || 'ID-01', token);
      setMessage('Return completed. Thank you!');
      navigate('/commands');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-background min-h-screen flex flex-col">
      <TopBar />
      <main className="flex-grow pt-24 pb-lg px-xl flex gap-lg container-max mx-auto w-full">
        <section className="w-1/2">
          <div className="bg-white p-lg rounded-xl h-full flex flex-col">
            <h2 className="font-title-lg mb-lg">Locker Status</h2>
            <div className="grid grid-cols-4 gap-2 flex-grow">
              <div className="col-span-4 h-16 border rounded flex items-center justify-between px-md unlocked-highlight">
                <span className="font-mono-data font-bold">{transaction?.compartmentId || 'ID-01'}</span>
                <span className="text-primary font-bold">UNLOCKED</span>
                <span className="material-symbols-outlined text-primary">lock_open</span>
              </div>
              {[...Array(8)].map((_, i) => (
                <div key={i} className={`h-24 border rounded flex flex-col items-center justify-center ${i === 2 ? 'unlocked-highlight' : 'opacity-20'}`}>
                  <span className="font-mono-data">C-0{i + 1}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
        <section className="w-1/2 flex flex-col gap-lg">
          <h1 className="font-headline-lg">Return Tool & <br />
            <span className="text-primary">Retrieve ID</span>
          </h1>
          <div className="flex flex-col gap-md">
            <div className="p-md bg-white border rounded-xl flex gap-md">
              <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold">1</div>
              <p>Place tool back into compartment {transaction?.compartmentId || 'ID-01'}.</p>
            </div>
            <div className="p-md bg-white border rounded-xl flex gap-md">
              <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold">2</div>
              <p>Press Finish to close the return and store the log.</p>
            </div>
          </div>
          <button onClick={handleReturn} disabled={busy} className="w-full bg-primary text-white py-lg rounded-xl font-bold text-headline-md shadow-lg mt-auto">
            {busy ? 'Completing return...' : 'Finish Return'}
          </button>
        </section>
      </main>
      <Footer />
    </div>
  );
};

const ScreenAdmin = () => {
  const navigate = useNavigate();
  const { token, logout, setError } = useSession();
  const [summary, setSummary] = useState(null);

  useAuthGuard();

  useEffect(() => {
    api
      .getAdminSummary(token)
      .then((result) => setSummary(result))
      .catch((err) => setError(err.message));
  }, [token, setError]);

  return (
    <div className="bg-background min-h-screen">
      <header className="fixed top-0 w-full z-50 flex justify-between items-center px-lg py-md bg-surface border-b border-outline-variant">
        <div className="flex items-center gap-md">
          <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-white font-bold text-xs">TUP</div>
          <span className="font-headline-md text-headline-md font-bold text-primary">Admin Dashboard</span>
        </div>
        <div className="flex items-center gap-md">
          <button onClick={logout} className="px-md py-sm bg-secondary text-white rounded">Sign Out</button>
          <button onClick={() => navigate('/commands')} className="px-md py-sm bg-surface-container text-secondary rounded">Back</button>
        </div>
      </header>
      <main className="pt-24 p-lg grid-dots min-h-screen">
        <div className="max-w-[1440px] mx-auto space-y-lg">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-lg">
            <div className="bg-white border p-lg rounded-xl shadow-sm">
              <p className="text-secondary uppercase text-xs">Total Tools Out</p>
              <h3 className="text-4xl font-bold mt-2">{summary ? summary.activeCount : '—'}</h3>
            </div>
            <div className="bg-white border p-lg rounded-xl shadow-sm">
              <p className="text-secondary uppercase text-xs">Overdue Today</p>
              <h3 className="text-4xl font-bold mt-2 text-primary">{summary ? summary.overdueCount : '—'}</h3>
            </div>
            <div className="bg-white border p-lg rounded-xl shadow-sm">
              <p className="text-secondary uppercase text-xs">System Health</p>
              <h3 className="text-4xl font-bold mt-2 text-emerald-600">98.4%</h3>
            </div>
          </div>
          <section className="bg-white border rounded-xl overflow-hidden shadow-sm">
            <div className="px-lg py-md border-b bg-slate-800 text-white flex justify-between">
              <h4 className="font-bold uppercase tracking-wide">Active Tool Transactions</h4>
              <button onClick={() => window.location.reload()} className="font-label-md uppercase text-secondary/80">Refresh</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-100 uppercase text-xs text-slate-600">
                  <tr>
                    <th className="p-4">Student ID</th>
                    <th className="p-4">Tool</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Due At</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-sm">
                  {(summary?.activeTransactions || []).map((item) => (
                    <tr key={`active-${item.id}`}>
                      <td className="p-4 font-bold">{item.studentId}</td>
                      <td className="p-4">{item.toolName}</td>
                      <td className="p-4 text-emerald-600">Active</td>
                      <td className="p-4">{new Date(item.dueAt).toLocaleString()}</td>
                    </tr>
                  ))}
                  {(summary?.overdueTransactions || []).map((item) => (
                    <tr key={`overdue-${item.id}`}>
                      <td className="p-4 font-bold text-primary">{item.studentId}</td>
                      <td className="p-4">{item.toolName}</td>
                      <td className="p-4 text-primary">Overdue</td>
                      <td className="p-4">{new Date(item.dueAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <Routes>
          <Route path="/" element={<ScreenWelcome />} />
          <Route path="/commands" element={<ScreenCommands />} />
          <Route path="/deposit" element={<ScreenDeposit />} />
          <Route path="/tool-selection" element={<ScreenToolSelection />} />
          <Route path="/tool-release" element={<ScreenToolRelease />} />
          <Route path="/return-confirm" element={<ScreenReturnConfirm />} />
          <Route path="/return-action" element={<ScreenReturnAction />} />
          <Route path="/admin" element={<ScreenAdmin />} />
        </Routes>
      </AppProvider>
    </BrowserRouter>
  );
}
