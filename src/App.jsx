import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { api } from './api';
import calculatorImage from './assets/scientific-calculator.svg';
import wireStripperImage from './assets/wire-stripper.svg';
import screwdriverImage from './assets/dual-screwdriver.svg';
import pliersImage from './assets/combination-pliers.svg';

const SessionContext = createContext(null);
const useSession = () => useContext(SessionContext);

const toolVisuals = {
  'tool-1': { icon: 'calculate', image: calculatorImage },
  'tool-2': { icon: 'content_cut', image: wireStripperImage },
  'tool-3': { icon: 'build', image: screwdriverImage },
  'tool-4': { icon: 'handyman', image: pliersImage },
};
const getToolVisual = (toolId) => toolVisuals[toolId] || { icon: 'precision_manufacturing', image: '' };

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
    <div className="min-h-screen flex flex-col vignette-overlay bg-gradient-to-b from-[#FE0406] via-[#ff8f8f] to-white">
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
    <div className="text-on-background min-h-screen flex flex-col overflow-hidden bg-gradient-to-b from-[#FE0406] via-[#ff8f8f] to-white">
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
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#FE0406] via-[#ff8f8f] to-white">
      <TopBar />
      <main className="pt-24 px-lg pb-xl flex flex-col max-w-screen-2xl mx-auto w-full">
        <header className="mb-lg">
          <div className="flex items-center gap-sm text-secondary font-label-md text-label-md mb-sm"><span>Lab A</span><span className="material-symbols-outlined text-[14px]">chevron_right</span><span>Equipment Kiosk</span><span className="material-symbols-outlined text-[14px]">chevron_right</span><span className="text-primary font-bold">Tool Selection</span></div>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-md"><div><h1 className="font-headline-lg text-on-background">Select the tool you wish to borrow</h1><p className="font-body-lg text-secondary mt-xs">Choose from the available high-precision laboratory equipment.</p></div><div className="bg-surface-container-lowest border border-outline-variant p-md rounded-xl flex items-center gap-md shadow-sm"><div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container"><span className="material-symbols-outlined">verified_user</span></div><div><div className="font-label-md text-secondary">Student Access</div><div className="font-title-lg font-mono-data text-on-surface">VERIFIED</div></div></div></div>
        </header>
        {loading ? (
          <div className="p-lg bg-white rounded-xl shadow-sm text-center">Loading available tools...</div>
        ) : (
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-md flex-1">
            {tools.map((tool) => (
              <div
                key={tool.id}
                onClick={() => handleSelect(tool)}
                className="group relative flex flex-col bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden cursor-pointer hover:shadow-xl transition-all active:scale-[0.98]"
              >
                <div className="aspect-video relative overflow-hidden bg-surface-container"><img src={getToolVisual(tool.id).image} alt={tool.name} className="w-full h-full object-cover" /><div className={`${tool.availableQty ? 'bg-emerald-500' : 'bg-slate-500'} absolute top-md right-md text-white font-label-md px-md py-xs rounded-full shadow-lg`}>{tool.availableQty}/{tool.totalQty} Available</div></div>
                <div className="p-lg flex-1 flex flex-col">
                  <div className="flex items-center gap-md mb-sm"><span className="material-symbols-outlined text-primary bg-primary-fixed p-sm rounded-lg">{getToolVisual(tool.id).icon}</span><h3 className="font-title-lg text-on-surface">{tool.name}</h3></div>
                  <p className="font-body-md text-secondary mb-lg flex-1">{tool.description}</p>
                  <button className="w-full py-md bg-surface-container-high group-hover:bg-primary group-hover:text-on-primary font-label-md rounded-lg transition-all border border-outline-variant group-hover:border-primary">SELECT TOOL</button>
                </div>
              </div>
            ))}
          </section>
        )}
      </main>
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
      await api.borrow(selectedTool.id, selectedTool.slot, token);
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
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#FE0406] via-[#ff8f8f] to-white">
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
                <img src={getToolVisual(selectedTool.id).image} alt={selectedTool.name} className="w-full aspect-video object-cover rounded-lg mb-md" />
                <h3 className="font-headline-md mb-2">{selectedTool.name}</h3>
                <p className="text-secondary mb-1">{selectedTool.description}</p>
                <div className="font-mono-data text-label-md uppercase tracking-wide">Assigned slot: {selectedTool.slot}</div>
              </div>
              <div className="p-lg bg-white rounded-xl border border-outline-variant">
                <div className="font-label-md text-secondary uppercase mb-2">Checkout details</div>
                <div className="grid grid-cols-2 gap-4 text-sm text-secondary">
                  <div>
                    <span className="block font-bold text-on-surface">Student</span>
                    <span>Verified user</span>
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
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#FE0406] via-[#ff8f8f] to-white">
      <TopBar />
      <main className="pt-24 min-h-screen px-lg pb-xl flex flex-col max-w-screen-2xl mx-auto w-full">
        <header className="mb-lg">
          <div className="flex items-center gap-sm text-secondary font-label-md text-label-md mb-sm"><span>Lab A</span><span className="material-symbols-outlined text-[14px]">chevron_right</span><span>Equipment Kiosk</span><span className="material-symbols-outlined text-[14px]">chevron_right</span><span className="text-primary font-bold">Return Confirmation</span></div>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-md">
            <div><h1 className="font-headline-lg text-on-background">Confirm Equipment Return</h1><p className="font-body-lg text-secondary mt-xs">Verify the current transaction before opening the storage compartment.</p></div>
          </div>
        </header>
        <div className="w-full grid grid-cols-12 gap-gutter">
          {loading ? (
            <div className="col-span-12 p-lg bg-white border rounded-xl text-center">Loading active transaction…</div>
          ) : transaction ? (
            <>
              <div className="col-span-12 lg:col-span-7 flex flex-col gap-gutter">
                <div className="bg-surface-container-lowest border border-outline-variant p-lg rounded-xl flex items-center gap-lg shadow-sm">
                  <div className="w-24 h-24 bg-surface-container border-2 border-primary-fixed overflow-hidden flex-shrink-0 rounded-xl"><img src={getToolVisual(transaction.toolId).image} alt={transaction.toolName} className="w-full h-full object-cover" /></div>
                  <div className="flex-grow">
                    <span className="font-label-md text-secondary uppercase tracking-tighter">Authorized Borrower</span>
                    <h2 className="font-headline-md">{transaction.studentId}</h2>
                    <span className="font-mono-data text-secondary">Active return session</span>
                  </div>
                  <span className="font-label-md text-on-primary-fixed-variant bg-primary-fixed px-sm py-xs rounded">ACTIVE SESSION</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-gutter"><div className="bg-surface-container-lowest border border-outline-variant p-md rounded-xl flex flex-col justify-between min-h-[150px]"><div><span className="font-label-md text-secondary uppercase">Equipment</span><h3 className="font-title-lg mt-xs">{transaction.toolName}</h3></div><div className="flex items-center gap-xs text-primary font-bold"><span className="material-symbols-outlined">precision_manufacturing</span><span className="font-mono-data">Return inspection required</span></div></div><div className="bg-surface-container-lowest border border-outline-variant p-md rounded-xl flex flex-col justify-between min-h-[150px]"><div><span className="font-label-md text-secondary uppercase">Target Location</span><h3 className="font-title-lg mt-xs">Cabinet {transaction.compartmentId}</h3></div><div className="flex items-center gap-xs text-secondary"><span className="material-symbols-outlined">location_on</span><span className="font-body-md">Laboratory storage locker</span></div></div></div>
                <div className="bg-on-secondary-fixed text-on-primary p-lg flex justify-between items-center">
                  <div>
                    <span className="font-label-md text-secondary-fixed-dim uppercase">Due At</span>
                    <div className="font-title-lg font-mono-data">{new Date(transaction.dueAt).toLocaleString()}</div>
                  </div>
                  <div className="flex items-center gap-xs text-secondary-fixed text-right">
                    <span className="w-3 h-3 bg-emerald-500 rounded-full"></span>
                    <span className="font-title-lg">Ready for Return</span>
                  </div>
                </div>
              </div>
              <div className="col-span-12 lg:col-span-5 flex flex-col gap-gutter">
                <div className="min-h-[260px] relative overflow-hidden bg-surface-container-highest border border-outline-variant rounded-xl flex flex-col items-center justify-end text-center p-lg"><img src={getToolVisual(transaction.toolId).image} alt={transaction.toolName} className="absolute inset-0 w-full h-full object-cover opacity-70" /><div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" /><div className="relative text-white"><span className="font-label-md uppercase opacity-80">Verify Item Condition</span><h3 className="font-title-lg mt-xs">Ready for Return</h3><p className="mt-sm">Check the tool and accessories before opening the compartment.</p></div></div>
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
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#FE0406] via-[#ff8f8f] to-white">
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
    </div>
  );
};

const ScreenAdmin = () => {
  const navigate = useNavigate();
  const { logout } = useSession();
  const [token, setToken] = useState(() => sessionStorage.getItem('adminSessionToken') || '');
  const [accessCode, setAccessCode] = useState('');
  const [summary, setSummary] = useState(null);
  const [tools, setTools] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [error, setError] = useState('');

  const loadDashboard = async () => {
    if (!token) return;
    setError('');
    try {
      const [summaryResult, toolsResult, alertsResult] = await Promise.all([api.getAdminSummary(token), api.getTools(token), api.getAlerts(token)]);
      setSummary(summaryResult);
      setTools(toolsResult.tools || []);
      setAlerts(alertsResult.alerts || []);
    } catch (err) {
      sessionStorage.removeItem('adminSessionToken');
      setToken('');
      setError(err.message);
    }
  };

  useEffect(() => {
    if (!token) {
      setSummary(null);
      setTools([]);
      setAlerts([]);
      return;
    }
    loadDashboard();
  }, [token]);

  useEffect(() => {
    if (!token) return undefined;
    const refreshInterval = window.setInterval(loadDashboard, 60 * 1000);
    return () => window.clearInterval(refreshInterval);
  }, [token]);

  const handleAdminLogin = async (event) => {
    event.preventDefault();
    setError('');
    try {
      const result = await api.loginAdmin(accessCode.trim());
      sessionStorage.setItem('adminSessionToken', result.token);
      setToken(result.token);
      setAccessCode('');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAdminLogout = () => {
    sessionStorage.removeItem('adminSessionToken');
    setToken('');
    logout();
    navigate('/');
  };

  const isOverdue = (transaction) => new Date(transaction.dueAt).getTime() < Date.now();
  const transactions = summary?.activeTransactions || [];
  const compartments = Array.from({ length: 16 }, (_, index) => {
    const slot = `C-${String(index + 1).padStart(2, '0')}`;
    const tool = tools.find((item) => item.slot === slot);
    return {
      slot,
      name: tool?.name || 'Unassigned',
      occupied: transactions.some((transaction) => transaction.compartmentId === slot),
    };
  });
  const formatStatus = (transaction) => {
    const remainingMinutes = Math.round((new Date(transaction.dueAt).getTime() - Date.now()) / (60 * 1000));
    if (remainingMinutes < 0) return `Overdue (${remainingMinutes}m)`;
    if (remainingMinutes < 60) return `Active (${remainingMinutes}m left)`;
    return `Active (${Math.floor(remainingMinutes / 60)}h left)`;
  };
  const formatOverdueDuration = (dueAt) => {
    const minutes = Math.max(1, Math.floor((Date.now() - new Date(dueAt).getTime()) / (60 * 1000)));
    return minutes >= 60 ? `+${Math.floor(minutes / 60)}h ${minutes % 60}m` : `+${minutes}m`;
  };

  if (!token) {
    return (
      <div className="bg-background min-h-screen flex items-center justify-center p-lg">
        <form onSubmit={handleAdminLogin} className="w-full max-w-md bg-white border rounded-xl p-xl shadow-sm space-y-lg">
          <div>
            <h1 className="font-headline-lg text-primary">Admin Dashboard</h1>
            <p className="text-secondary mt-sm">Enter the administrator access code to view inventory activity.</p>
          </div>
          <input
            className="w-full border border-outline-variant rounded px-md py-sm"
            type="password"
            placeholder="Admin access code"
            value={accessCode}
            onChange={(event) => setAccessCode(event.target.value)}
            autoFocus
          />
          {error && <p className="text-error font-bold">{error}</p>}
          <div className="flex gap-md">
            <button type="button" onClick={() => navigate('/')} className="flex-1 border rounded px-md py-sm">Back</button>
            <button type="submit" className="flex-1 bg-primary text-white rounded px-md py-sm">Sign In</button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FE0406] via-[#ff8f8f] to-white">
      <header className="fixed top-0 w-full z-50 flex justify-between items-center px-lg py-md bg-surface border-b border-outline-variant">
        <div className="flex items-center gap-md">
          <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-white font-bold text-xs">TUP</div>
          <span className="font-headline-md text-headline-md font-bold text-primary">Admin Dashboard</span>
        </div>
        <div className="flex items-center gap-md">
          <div className="relative" title={`${alerts.length} overdue tool notification${alerts.length === 1 ? '' : 's'}`}>
            <span className={`material-symbols-outlined ${alerts.length ? 'text-primary' : 'text-secondary'}`}>notifications</span>
            {alerts.length > 0 && <span className="absolute -right-2 -top-2 min-w-4 h-4 px-1 rounded-full bg-error text-white text-[10px] font-bold flex items-center justify-center">{alerts.length}</span>}
          </div>
          <button onClick={handleAdminLogout} className="px-md py-sm bg-secondary text-white rounded">Exit Admin</button>
        </div>
      </header>
      <main className="pt-24 p-lg grid-dots min-h-screen">
        <div className="max-w-[1440px] mx-auto space-y-lg">
          {error && <p className="text-error font-bold">{error}</p>}
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
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-lg">
            <div className="lg:col-span-8 bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
              <div className="px-lg py-md border-b border-outline-variant flex justify-between items-center bg-surface-container-low">
                <h4 className="font-title-lg flex items-center gap-sm"><span className="material-symbols-outlined text-primary">grid_view</span>Storage Compartments Overview</h4>
                <div className="flex items-center gap-md text-label-md font-label-md"><span className="flex items-center gap-xs"><i className="w-3 h-3 bg-emerald-500 rounded-full" />Available</span><span className="flex items-center gap-xs"><i className="w-3 h-3 bg-slate-400 rounded-full" />Occupied</span></div>
              </div>
              <div className="p-lg grid grid-cols-2 sm:grid-cols-4 gap-md">
                {compartments.map((compartment) => <div key={compartment.slot} className={`relative group border p-md rounded-lg transition-all hover:shadow-md ${compartment.occupied ? 'border-outline-variant bg-surface-container-high' : 'border-emerald-100 bg-emerald-50/30'}`}><div className="flex justify-between items-start mb-sm"><span className={`font-mono-data font-bold ${compartment.occupied ? 'text-secondary' : 'text-emerald-700'}`}>{compartment.slot}</span><span className={`material-symbols-outlined text-[18px] ${compartment.occupied ? 'text-slate-400' : 'text-emerald-500'}`}>{compartment.occupied ? 'lock' : 'check_circle'}</span></div><p className="font-label-md truncate text-on-surface">{compartment.name}</p></div>)}
              </div>
            </div>
            <aside className="lg:col-span-4 flex flex-col gap-lg">
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm flex-1">
                <div className="px-lg py-md border-b border-outline-variant flex justify-between items-center bg-primary text-white"><h4 className="font-title-lg flex items-center gap-sm"><span className="material-symbols-outlined">warning</span>Overdue Alerts</h4><span className="px-sm py-xs bg-white/20 rounded font-label-md">{alerts.length} Alerts</span></div>
                <div className="p-md space-y-sm">{alerts.length ? alerts.map((item) => <div key={item.id} className="p-md bg-error-container/20 border-l-4 border-primary rounded-r-lg space-y-xs"><div className="flex justify-between items-start"><span className="font-body-md font-bold text-primary">{item.studentId}</span><span className="font-label-md text-primary font-bold">{formatOverdueDuration(item.dueAt)}</span></div><p className="text-body-md text-secondary">{item.toolName}</p><div className="flex justify-between items-center mt-sm"><span className="text-[11px] uppercase tracking-tighter text-secondary">Due: {new Date(item.dueAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span><button onClick={() => window.alert(`Overdue tool notification\nStudent: ${item.studentId}\nTool: ${item.toolName}`)} className="text-primary font-bold text-[12px] underline">Notify Student</button></div></div>) : <p className="p-md text-secondary text-body-md">No overdue tools. Great work!</p>}</div>
              </div>
            </aside>
          </section>
          <section className="bg-white border rounded-xl overflow-hidden shadow-sm">
            <div className="px-lg py-md border-b bg-slate-800 text-white flex justify-between items-center">
              <h4 className="font-bold uppercase tracking-wide">Active Tool Transactions</h4>
              <button onClick={loadDashboard} className="font-label-md uppercase text-secondary/80">Refresh</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-100 uppercase text-xs text-slate-600">
                  <tr>
                    <th className="p-4">Student ID</th>
                    <th className="p-4">Tool</th>
                    <th className="p-4">Compartment</th>
                    <th className="p-4">Time Borrowed</th>
                    <th className="p-4">Time Remaining</th>
                    <th className="p-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-sm">
                  {transactions.map((item) => (
                    <tr key={`active-${item.id}`}>
                      <td className={`p-4 font-bold ${isOverdue(item) ? 'text-primary' : ''}`}>{item.studentId}</td>
                      <td className="p-4">{item.toolName}</td>
                      <td className="p-4">{item.compartmentId}</td>
                      <td className="p-4">{new Date(item.borrowedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                      <td className={`p-4 ${isOverdue(item) ? 'text-primary' : 'text-emerald-600'}`}>{formatStatus(item)}</td>
                      <td className="p-4"><button onClick={() => window.alert(`Transaction ${item.id}\nTool: ${item.toolName}\nDue: ${new Date(item.dueAt).toLocaleString()}`)} className="text-primary font-bold">{isOverdue(item) ? 'Notify' : 'Details'}</button></td>
                    </tr>
                  ))}
                  {!transactions.length && <tr><td colSpan="6" className="p-4 text-center text-secondary">No active tool transactions.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>
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
