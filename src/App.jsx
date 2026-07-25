  import React, { useState, useEffect, useRef, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import jsQR from 'jsqr';
import { api } from './api';
import calculatorImage from './assets/calculator.jpg';
import wireStripperImage from './assets/wirestripper.jpg';
import screwdriverImage from './assets/screwdriver.jpg';
import pliersImage from './assets/pliers.jpg';
import pesoOld from './assets/peso-old.jpg';
import pesoNew from './assets/peso-new.jpg';

const SessionContext = createContext(null);
const useSession = () => useContext(SessionContext);

const toolVisuals = {
  'tool-1': { icon: 'calculate', image: calculatorImage },
  'tool-2': { icon: 'content_cut', image: wireStripperImage },
  'tool-3': { icon: 'build', image: screwdriverImage },
  'tool-4': { icon: 'handyman', image: pliersImage },
};
const getToolVisual = (toolId) => toolVisuals[toolId] || { icon: 'precision_manufacturing', image: '' };

function QrScannerOverlay({ open, onClose, onScan, onFallback, error, setError }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const frameRef = useRef(null);
  const onScanRef = useRef(onScan);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    let cancelled = false;

    const stopCamera = () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };

    const scanFrame = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (!video || !canvas || video.readyState < 2) {
        frameRef.current = requestAnimationFrame(scanFrame);
        return;
      }

      const width = video.videoWidth;
      const height = video.videoHeight;

      if (!width || !height) {
        frameRef.current = requestAnimationFrame(scanFrame);
        return;
      }

      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) {
        frameRef.current = requestAnimationFrame(scanFrame);
        return;
      }

      context.drawImage(video, 0, 0, width, height);
      const imageData = context.getImageData(0, 0, width, height);
      const code = jsQR(imageData.data, width, height, { inversionAttempts: 'dontInvert' });

      if (code?.data) {
        onScanRef.current(code.data.trim());
        return;
      }

      frameRef.current = requestAnimationFrame(scanFrame);
    };

    const startCamera = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('This browser does not support webcam access.');
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: 'environment' },
          },
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        setError('');
        scanFrame();
      } catch (err) {
        setError(err.message || 'Unable to access the webcam.');
      }
    };

    if (open) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [open, setError]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[70] bg-on-background/85 backdrop-blur-xl flex items-center justify-center px-md py-lg">
      <div className="w-full max-w-5xl bg-surface-container-lowest border border-outline-variant shadow-2xl rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-lg py-md border-b border-outline-variant bg-surface-container-low">
          <div>
            <h3 className="font-title-lg text-on-background">Scan Student QR</h3>
            <p className="font-label-md text-secondary uppercase tracking-widest">Allow camera access to continue</p>
          </div>
          <button onClick={onClose} className="px-md py-sm rounded-full bg-surface-container-high text-secondary hover:text-on-background transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
          <div className="lg:col-span-8 p-lg bg-surface-container-lowest">
            <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-outline-variant bg-black">
              <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" playsInline muted autoPlay />
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-black/20" />
                <div className="absolute inset-[14%] rounded-2xl border-2 border-dashed border-white/70" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-32 h-32 border-4 border-primary rounded-3xl shadow-[0_0_0_9999px_rgba(0,0,0,0.18)]" />
                </div>
                <div className="absolute left-0 top-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent scan-line opacity-80" />
              </div>
              <canvas ref={canvasRef} className="hidden" />
            </div>
          </div>
          <div className="lg:col-span-4 p-lg bg-surface-container-low border-t lg:border-t-0 lg:border-l border-outline-variant flex flex-col justify-between gap-lg">
            <div className="space-y-md">
              <div className="p-md rounded-xl border border-outline-variant bg-white">
                <div className="font-label-md text-secondary uppercase tracking-widest mb-xs">How it works</div>
                <p className="font-body-md text-on-background">Point the camera at the student QR code. Once detected, the system will verify the student record before PIN entry.</p>
              </div>
              {error ? (
                <div className="p-md rounded-xl border border-error bg-error-container text-error font-body-md">{error}</div>
              ) : (
                <div className="p-md rounded-xl border border-outline-variant bg-surface-container-lowest text-secondary font-body-md">
                  Make sure the QR code is fully inside the frame and well lit.
                </div>
              )}
            </div>
            <div className="flex flex-col gap-sm">
              <button onClick={onFallback} className="w-full py-md bg-primary text-on-primary font-label-md uppercase tracking-wider rounded-lg hover:bg-primary-container transition-colors">
                Use manual login instead
              </button>
              <button onClick={onClose} className="w-full py-md bg-surface-container-high text-secondary font-label-md uppercase tracking-wider rounded-lg hover:text-on-background transition-colors">
                Cancel scanning
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StudentConfirmationModal({ student, open, pin, setPin, onConfirm, onCancel, busy, error }) {
  if (!open || !student) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[80] bg-on-background/75 backdrop-blur-lg flex items-center justify-center px-md py-lg">
      <div className="w-full max-w-2xl bg-surface-container-lowest border border-outline-variant shadow-2xl rounded-xl overflow-hidden">
        <div className="px-lg py-md bg-surface-container-low border-b border-outline-variant flex items-center justify-between">
          <div>
            <h3 className="font-title-lg text-on-background">Confirm Student</h3>
            <p className="font-label-md text-secondary uppercase tracking-widest">Second validation before PIN entry</p>
          </div>
          <button onClick={onCancel} className="px-md py-sm rounded-full bg-surface-container-high text-secondary hover:text-on-background transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="p-lg grid grid-cols-1 md:grid-cols-2 gap-lg">
          <div className="space-y-md">
            <div className="p-md rounded-xl border border-outline-variant bg-surface-container-low">
              <div className="font-label-md text-secondary uppercase tracking-widest mb-xs">Student ID</div>
              <div className="font-headline-md text-on-background">{student.id}</div>
            </div>
            <div className="p-md rounded-xl border border-outline-variant bg-surface-container-low">
              <div className="font-label-md text-secondary uppercase tracking-widest mb-xs">Student Name</div>
              <div className="font-title-lg text-on-background">{student.name}</div>
            </div>
            <div className="p-md rounded-xl border border-outline-variant bg-surface-container-low">
              <div className="font-label-md text-secondary uppercase tracking-widest mb-xs">Email</div>
              <div className="font-body-md text-on-background break-words">{student.email}</div>
            </div>
          </div>
          <div className="flex flex-col justify-between gap-lg">
            <div className="p-md rounded-xl border border-outline-variant bg-white space-y-md">
              <div>
                <div className="font-label-md text-secondary uppercase tracking-widest mb-xs">Enter PIN</div>
                <p className="font-body-md text-secondary">Continue only if the scanned student details are correct.</p>
              </div>
              <input
                autoFocus
                className="w-full bg-surface-container-lowest border border-outline-variant px-md py-sm font-body-md text-on-background focus:outline-none focus:border-primary rounded"
                placeholder="Student PIN"
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
              />
              {error && <p className="text-error font-bold">{error}</p>}
            </div>
            <div className="flex gap-sm">
              <button onClick={onCancel} className="flex-1 py-md bg-surface-container-high text-secondary font-label-md uppercase tracking-wider rounded-lg hover:text-on-background transition-colors">
                Back
              </button>
              <button onClick={onConfirm} disabled={busy} className="flex-1 py-md bg-primary text-on-primary font-label-md uppercase tracking-wider rounded-lg hover:bg-primary-container transition-colors disabled:opacity-60">
                {busy ? 'Verifying...' : 'Confirm PIN'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TransactionSuccessModal({ open, title, message, details = [], actionLabel = 'Close', onClose }) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[90] bg-on-background/75 backdrop-blur-lg flex items-center justify-center px-md py-lg">
      <div className="w-full max-w-2xl bg-surface-container-lowest border border-outline-variant shadow-2xl rounded-xl overflow-hidden">
        <div className="px-lg py-md bg-surface-container-low border-b border-outline-variant flex items-center gap-md">
          <div className="w-12 h-12 rounded-full bg-primary-fixed flex items-center justify-center text-primary shrink-0">
            <span className="material-symbols-outlined text-[30px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              verified
            </span>
          </div>
          <div>
            <h3 className="font-title-lg text-on-background">{title}</h3>
            <p className="font-label-md text-secondary uppercase tracking-widest">Transaction complete</p>
          </div>
        </div>
        <div className="p-lg space-y-lg">
          <div className="p-md rounded-xl border border-outline-variant bg-surface-container-low">
            <p className="font-body-md text-on-background">{message}</p>
          </div>
          {details.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
              {details.map((detail) => (
                <div key={`${detail.label}-${detail.value}`} className="p-md rounded-xl border border-outline-variant bg-white">
                  <div className="font-label-md text-secondary uppercase tracking-widest mb-xs">{detail.label}</div>
                  <div className="font-title-lg text-on-background">{detail.value}</div>
                </div>
              ))}
            </div>
          )}
          <button onClick={onClose} className="w-full py-md bg-primary text-on-primary font-label-md uppercase tracking-wider rounded-lg hover:bg-primary-container transition-colors">
            {actionLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfirmationModal({ open, title, message, confirmLabel = 'Confirm', onConfirm, onCancel, busy }) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[85] bg-on-background/75 backdrop-blur-lg flex items-center justify-center px-md py-lg">
      <div className="w-full max-w-xl bg-surface-container-lowest border border-outline-variant shadow-2xl rounded-xl overflow-hidden">
        <div className="px-lg py-md bg-surface-container-low border-b border-outline-variant">
          <h3 className="font-title-lg text-on-background">{title}</h3>
          <p className="font-body-md text-secondary mt-xs">{message}</p>
        </div>
        <div className="p-lg space-y-lg">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
            <button onClick={onCancel} className="w-full py-md bg-surface-container-high text-secondary border border-outline rounded-lg font-bold hover:bg-surface-container transition-colors">
              Cancel
            </button>
            <button onClick={onConfirm} disabled={busy} className="w-full py-md bg-error text-white rounded-lg font-bold disabled:opacity-60 hover:bg-error-container transition-colors">
              {busy ? 'Deleting...' : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

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
  const { login, user, message, setMessage, error, setError } = useSession();
  const [studentId, setStudentId] = useState('');
  const [pin, setPin] = useState('4321');
  const [busy, setBusy] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerError, setScannerError] = useState('');
  const [pendingStudent, setPendingStudent] = useState(null);
  const [pendingPin, setPendingPin] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (user) {
      navigate('/commands');
    }
  }, [user, navigate]);

  const handleScan = () => {
    setScannerError('');
    setError('');
    setScannerOpen(true);
  };

  const handleQrDetected = async (qrData) => {
    if (!qrData) {
      return;
    }

    setBusy(true);
    setError('');
    setScannerError('');

    try {
      const result = await api.validateQr(qrData.trim());
      setPendingStudent(result.student);
      setPendingPin('');
      setScannerOpen(false);
      setConfirmOpen(true);
      setMessage('Student verified. Please confirm the details and enter the PIN.');
    } catch (err) {
      setScannerError(err.message);
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleUseManualLogin = () => {
    setScannerOpen(false);
    setScannerError('');
  };

  const handleConfirmPin = async () => {
    if (!pendingStudent) {
      return;
    }

    if (!pendingPin.trim()) {
      setScannerError('Enter the student PIN to continue.');
      return;
    }

    setBusy(true);
    setError('');
    setScannerError('');

    try {
      await login(pendingStudent.id, pendingPin.trim());
      setConfirmOpen(false);
      setPendingStudent(null);
      setPendingPin('');
      setMessage('Login successful. Redirecting...');
      navigate('/commands');
    } catch (err) {
      setScannerError(err.message);
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleCancelConfirm = () => {
    setConfirmOpen(false);
    setPendingStudent(null);
    setPendingPin('');
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
          <div className="font-mono-data text-headline-md font-bold text-on-background">{currentTime.toLocaleTimeString('en-GB')}</div>
          <div className="font-label-md text-label-md text-secondary uppercase tracking-wider">{currentTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).toUpperCase()}</div>
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
      <QrScannerOverlay
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={handleQrDetected}
        onFallback={handleUseManualLogin}
        error={scannerError}
        setError={setScannerError}
      />
      <StudentConfirmationModal
        open={confirmOpen}
        student={pendingStudent}
        pin={pendingPin}
        setPin={setPendingPin}
        onConfirm={handleConfirmPin}
        onCancel={handleCancelConfirm}
        busy={busy}
        error={scannerError}
      />
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
  const { user, logout, token } = useSession();
  const [activeTransactions, setActiveTransactions] = useState([]);
  const [loadingActive, setLoadingActive] = useState(true);
  const location = useLocation();
  useAuthGuard();

  useEffect(() => {
    if (!token) return setLoadingActive(false);
    setLoadingActive(true);
    api
      .getActiveTransactions(token)
      .then((res) => setActiveTransactions(res.transactions || []))
      .catch(() => setActiveTransactions([]))
      .finally(() => setLoadingActive(false));
  }, [token, location.key]);
  useEffect(() => {
    console.debug('ScreenCommands: token=', token, 'activeTransactions=', activeTransactions);
  }, [token, activeTransactions]);

  return (
    <div className="min-h-screen flex flex-col vignette-overlay bg-gradient-to-b from-[#FE0406] via-[#ff8f8f] to-white">
      <TopBar />
      <main className="flex-grow flex flex-col items-center justify-center pt-xl px-lg mt-16 relative">
        <div className="w-full max-w-6xl z-10 py-xl">
          <div className="mb-xl text-center">
            <h2 className="font-headline-lg text-headline-lg text-white">Welcome back, {user?.id || 'Student'}</h2>
            <div className="flex items-center justify-center gap-sm mt-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-label-md text-label-md text-white uppercase tracking-widest">Authenticated & Validated System Access</span>
            </div>
          </div>
            <div className="flex items-center gap-md mb-lg">
            <div className="h-[1px] flex-grow bg-outline-variant"></div>
            <p className="font-title-lg text-title-lg text-white uppercase tracking-widest whitespace-nowrap px-md">Select a transaction to proceed</p>
            <div className="h-[1px] flex-grow bg-outline-variant"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-xl max-w-5xl mx-auto h-[440px]">
            <div
              role="button"
              tabIndex={0}
              onClick={() => { if (activeTransactions.length === 0) navigate('/deposit'); }}
              onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && activeTransactions.length === 0) navigate('/deposit'); }}
              aria-disabled={activeTransactions.length > 0}
              className={`group relative flex flex-col items-center justify-center bg-white border-2 border-outline-variant rounded-xl p-xl shadow-sm transition-all duration-300 overflow-hidden text-left ${activeTransactions.length > 0 ? 'opacity-80 cursor-not-allowed' : 'hover:border-primary hover:shadow-2xl cursor-pointer'}`}
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
              {activeTransactions.length > 0 && (
                <>
                  <div className="absolute inset-0 bg-on-background/60 backdrop-blur-sm z-40" />
                  <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-auto">
                    <div className="text-center p-lg bg-transparent">
                      <div className="font-title-lg text-white mb-md">You have an active borrow</div>
                      <button onClick={() => navigate('/return-confirm')} className="px-lg py-md bg-primary text-on-primary rounded-lg font-bold">Return item</button>
                    </div>
                  </div>
                </>
              )}
            </div>
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
            <div className="flex gap-md items-center">
              <button onClick={() => navigate('/')} className="flex items-center gap-md px-lg py-md border-2 border-outline rounded-lg">Back</button>
              <button
                onClick={() => { logout(); navigate('/'); }}
                className="flex items-center gap-md px-lg py-md border-2 border-outline text-on-surface-variant font-bold rounded-lg hover:bg-error-container hover:text-on-error-container hover:border-error transition-all duration-200"
              >
                <span className="material-symbols-outlined">cancel</span>
                <span className="font-title-lg text-title-lg uppercase">Sign Out</span>
              </button>
            </div>
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
  const { setMessage, token } = useSession();
  const [status, setStatus] = useState('Please insert a single ₱10.00 coin');
  const [loading, setLoading] = useState(false);

  useAuthGuard();

  const handleInsert = async () => {
    setLoading(true);
    setStatus('Processing coin...');
    try {
      // verify session / credentials against backend
      await api.getCurrentStudent(token);
      setMessage('Coin received. Session verified.');
      // ensure student has no active borrow before proceeding
      try {
        const active = await api.getActiveTransactions(token);
        if (active.transactions && active.transactions.length > 0) {
          setStatus('You have an active borrow. Redirecting to return...');
          navigate('/return-confirm');
          return;
        }
      } catch (err) {
        // ignore and proceed to selection
      }
      navigate('/tool-selection');
    } catch (err) {
      setStatus(err.message || 'Unable to verify session.');
    } finally {
      setLoading(false);
    }
  };

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
            <h2 className="font-display-lg text-display-lg text-on-surface leading-tight">Please Insert</h2>
            <h3 className="font-headline-lg text-4xl text-on-surface">₱10.00</h3>
            <p className="font-body-lg text-body-lg text-secondary max-w-md">
              To proceed with the equipment rental, please insert a single ten-peso coin into the coin slot located to your right.
            </p>

            <div className="mt-md p-md rounded-xl border bg-surface-container-highest border-outline-variant">
              <div className="font-title-lg text-title-lg text-on-surface mb-sm">{status}</div>
              <div className="font-label-md text-label-md text-secondary uppercase">Please insert ₱10.00 to proceed</div>
            </div>

            <div className="mt-lg">
              <button onClick={() => navigate('/')} className="px-md py-sm border rounded mr-md">Cancel Transaction</button>
            </div>
          </div>

          <div className="relative flex flex-col items-center">
            <div className="flex items-center gap-md">
              <button onClick={handleInsert} disabled={loading} className="flex flex-col items-center">
                <div className="w-40 h-40 rounded-full bg-white flex items-center justify-center shadow-md overflow-hidden border">
                  <img src={pesoOld} alt="old-₱10" className="w-32 h-32 object-contain" />
                </div>
                <div className="mt-sm font-label-md text-secondary">Old ₱10</div>
              </button>

              <button onClick={handleInsert} disabled={loading} className="flex flex-col items-center">
                <div className="w-40 h-40 rounded-full bg-white flex items-center justify-center shadow-md overflow-hidden border">
                  <img src={pesoNew} alt="new-₱10" className="w-32 h-32 object-contain" />
                </div>
                <div className="mt-sm font-label-md text-secondary">New ₱10</div>
              </button>
            </div>

            <div className="mt-lg w-80">
              <div className="p-md bg-white rounded-lg border border-outline flex items-center gap-md">
                <span className="material-symbols-outlined text-secondary">query_builder</span>
                <div className="font-label-md">{loading ? 'Processing coin...' : 'Waiting for coin...'}</div>
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
  const { token, setSelectedTool, setError, logout } = useSession();
  const [tools, setTools] = useState([]);
  const [activeTransactions, setActiveTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useAuthGuard();

  useEffect(() => {
    setLoading(true);
    Promise.all([api.getTools(token), api.getActiveTransactions(token)])
      .then(([toolsResult, activeResult]) => {
        setTools(toolsResult.tools || []);
        setActiveTransactions(activeResult.transactions || []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token, setError]);
  useEffect(() => {
    console.debug('ScreenToolSelection: token=', token, 'activeTransactions=', activeTransactions);
  }, [token, activeTransactions]);

  

  const handleSelect = (tool) => {
    (async () => {
      try {
        const live = await api.getActiveTransactions(token);
        const liveCount = (live.transactions || []).length;
        console.debug('handleSelect: live active count=', liveCount, 'client active count=', activeTransactions.length);
        if (liveCount > 0) {
          setError('You have an active borrow. Please return it before borrowing another tool.');
          navigate('/return-confirm');
          return;
        }
        setSelectedTool(tool);
        navigate('/tool-release');
      } catch (err) {
        // if the live check fails, fall back to client-side state
        if (activeTransactions.length > 0) {
          setError('You have an active borrow. Please return it before borrowing another tool.');
          return;
        }
        setSelectedTool(tool);
        navigate('/tool-release');
      }
    })();
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#FE0406] via-[#ff8f8f] to-white">
      <TopBar />
      <main className="pt-24 px-lg pb-xl flex flex-col max-w-screen-2xl mx-auto w-full">
        <div className="flex justify-between items-center mb-md">
          <div>
            <button onClick={() => navigate('/commands')} className="px-md py-sm border rounded mr-md">Back</button>
          </div>
          <div>
            <button onClick={() => { logout(); navigate('/'); }} className="px-md py-sm border rounded bg-white">Sign Out</button>
          </div>
        </div>
        <header className="mb-lg">
          <div className="flex items-center gap-sm font-label-md text-label-md mb-sm text-white"><span>Lab A</span><span className="material-symbols-outlined text-[14px] text-white">chevron_right</span><span>Equipment Kiosk</span><span className="material-symbols-outlined text-[14px] text-white">chevron_right</span><span className="text-white font-bold">Tool Selection</span></div>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-md"><div><h1 className="font-headline-lg text-white">Select the tool you wish to borrow</h1><p className="font-body-lg text-white mt-xs">Choose from the available high-precision laboratory equipment.</p></div><div className="bg-surface-container-lowest border border-outline-variant p-md rounded-xl flex items-center gap-md shadow-sm"><div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container"><span className="material-symbols-outlined">verified_user</span></div><div><div className="font-label-md text-secondary">Student Access</div><div className="font-title-lg font-mono-data text-on-surface">VERIFIED</div></div></div></div>
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
                <div className="aspect-video relative overflow-hidden bg-surface-container"><img src={getToolVisual(tool.id).image} alt={tool.name} className="w-full h-full object-contain object-center bg-white" /><div className={`${tool.availableQty ? 'bg-emerald-500' : 'bg-slate-500'} absolute top-md right-md text-white font-label-md px-md py-xs rounded-full shadow-lg`}>{tool.availableQty}/{tool.totalQty} Available</div></div>
                <div className="p-lg flex-1 flex flex-col">
                  <div className="flex items-center gap-md mb-sm"><span className="material-symbols-outlined text-primary bg-primary-fixed p-sm rounded-lg">{getToolVisual(tool.id).icon}</span><h3 className="font-title-lg text-on-surface">{tool.name}</h3></div>
                  <p className="font-body-md text-secondary mb-sm flex-1">{tool.description}</p>
                  <div className="font-label-md text-secondary mb-lg">Compartments: {tool.compartments?.join(', ') || tool.slot}</div>
                  <button
                    className="w-full py-md bg-surface-container-high group-hover:bg-primary group-hover:text-on-primary font-label-md rounded-lg transition-all border border-outline-variant group-hover:border-primary"
                    onClick={(e) => { e.stopPropagation(); handleSelect(tool); }}
                    disabled={activeTransactions.length > 0}
                  >
                    {activeTransactions.length > 0 ? 'Return current tool first' : 'SELECT TOOL'}
                  </button>
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
  const { token, selectedTool, setSelectedTool, setError, setMessage, logout } = useSession();
  const [busy, setBusy] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [successPayload, setSuccessPayload] = useState(null);

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

    const compartmentId = selectedTool.slot || 'Unassigned';
    setBusy(true);
    setError('');

    try {
      const borrowResult = await api.borrow(selectedTool.id, compartmentId, token);
      const assignedCompartmentId = borrowResult?.transaction?.compartmentId || compartmentId;
      setSelectedTool({ ...selectedTool, slot: assignedCompartmentId });
      await api.openCompartment(assignedCompartmentId, token);
      setSuccessPayload({
        title: 'Borrow Successful',
        message: `Borrow confirmed. ${selectedTool.name} has been assigned and the locker opened at ${assignedCompartmentId}.`,
        details: [
          { label: 'Tool', value: selectedTool.name },
          { label: 'Compartment', value: assignedCompartmentId },
        ],
      });
      setSuccessOpen(true);
      setMessage(`Borrow confirmed. ${selectedTool.name} assigned to ${selectedTool.slot}.`);
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
        <div className="flex justify-between items-center mb-md">
          <div>
            <button onClick={() => { setSelectedTool(null); navigate('/tool-selection'); }} className="px-md py-sm border rounded mr-md">Back</button>
          </div>
          <div>
            <button onClick={() => { logout(); navigate('/'); }} className="px-md py-sm border rounded bg-white">Sign Out</button>
          </div>
        </div>
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
                <div className="w-full h-56 overflow-hidden rounded-lg mb-md bg-white"><img src={getToolVisual(selectedTool.id).image} alt={selectedTool.name} className="w-full h-full object-contain object-center" /></div>
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
        <TransactionSuccessModal
          open={successOpen}
          title={successPayload?.title || 'Transaction Successful'}
          message={successPayload?.message || ''}
          details={successPayload?.details || []}
          actionLabel="Return to Home"
          onClose={() => {
            setSuccessOpen(false);
            setSuccessPayload(null);
            navigate('/commands');
          }}
        />
      </main>
    </div>
  );
};

const ScreenReturnConfirm = () => {
  const navigate = useNavigate();
  const { token, setError, logout } = useSession();
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
    const compartmentId = transaction.compartmentId || transaction.returnCompartmentId || 'Unassigned';
    setError('');
    try {
      await api.openCompartment(compartmentId, token);
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
          <div className="flex items-center gap-sm font-label-md text-label-md mb-sm text-white"><span>Lab A</span><span className="material-symbols-outlined text-[14px] text-white">chevron_right</span><span>Equipment Kiosk</span><span className="material-symbols-outlined text-[14px] text-white">chevron_right</span><span className="text-white font-bold">Return Confirmation</span></div>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-md">
            <div><h1 className="font-headline-lg text-white">Confirm Equipment Return</h1><p className="font-body-lg text-white mt-xs">Verify the current transaction before opening the storage compartment.</p></div>
          </div>
        </header>
        <div className="w-full grid grid-cols-12 gap-gutter">
          {loading ? (
            <div className="col-span-12 p-lg bg-white border rounded-xl text-center">Loading active transaction…</div>
          ) : transaction ? (
            <>
              <div className="col-span-12 lg:col-span-7 flex flex-col gap-gutter">
                <div className="bg-surface-container-lowest border border-outline-variant p-lg rounded-xl flex items-center gap-lg shadow-sm">
                  <div className="w-24 h-24 bg-surface-container border-2 border-primary-fixed overflow-hidden flex-shrink-0 rounded-xl"><img src={getToolVisual(transaction.toolId).image} alt={transaction.toolName} className="w-full h-full object-contain object-center bg-white" /></div>
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
                <div className="min-h-[260px] relative overflow-hidden bg-white border border-outline-variant rounded-xl flex flex-col items-center justify-end text-center p-lg"><img src={getToolVisual(transaction.toolId).image} alt={transaction.toolName} className="absolute inset-0 w-full h-full object-contain object-center opacity-90" /><div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" /><div className="relative text-white"><span className="font-label-md uppercase opacity-80">Verify Item Condition</span><h3 className="font-title-lg mt-xs">Ready for Return</h3><p className="mt-sm">Check the tool and accessories before opening the compartment.</p></div></div>
                <button
                  onClick={handleOpen}
                  className="group relative bg-primary text-on-primary h-24 flex items-center justify-center gap-md rounded shadow-xl hover:bg-surface-tint transition-all"
                >
                  <span className="material-symbols-outlined text-4xl">meeting_room</span>
                  <div className="text-left">
                    <span className="font-headline-md block">OPEN COMPARTMENT</span>
                    <span className="font-label-md uppercase opacity-80">{transaction?.compartmentId || transaction?.returnCompartmentId || 'Assigned compartment'} will unlock immediately</span>
                  </div>
                </button>
                <button onClick={() => navigate('/commands')} className="bg-surface-container-high text-secondary h-14 flex items-center justify-center gap-sm">
                  <span className="material-symbols-outlined">cancel</span>
                  <span>Cancel Return</span>
                </button>
              </div>
            </>
          ) : (
            <div className="col-span-12 p-lg bg-white border rounded-xl text-center space-y-md">
              <p>No active borrow transaction found for your account.</p>
              <div className="flex flex-wrap justify-center gap-sm">
                <button onClick={() => navigate('/commands')} className="px-md py-sm rounded bg-surface-container-high text-secondary font-bold">Back to Home</button>
                <button onClick={() => {
                  logout();
                  navigate('/');
                }} className="px-md py-sm rounded bg-primary text-white font-bold">Sign Out</button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

const ScreenReturnAction = () => {
  const navigate = useNavigate();
  const { token, setError, setMessage, logout } = useSession();
  const [transaction, setTransaction] = useState(null);
  const [busy, setBusy] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [successPayload, setSuccessPayload] = useState(null);

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

    const compartmentId = transaction.compartmentId || transaction.returnCompartmentId || 'Unassigned';
    setBusy(true);
    setError('');

    try {
      await api.openCompartment(compartmentId, token);
      await api.returnTransaction(transaction.id, compartmentId, token);
      // refresh active transactions to ensure server state is up-to-date before navigating
      try { await api.getActiveTransactions(token); } catch (_) {}
      setSuccessPayload({
        title: 'Return Successful',
        message: 'Return completed. Thank you for using the lab inventory kiosk.',
        details: [
          { label: 'Transaction', value: transaction.id },
          { label: 'Compartment', value: compartmentId },
        ],
      });
      setSuccessOpen(true);
      setMessage('Return completed. Thank you!');
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
        <div className="flex justify-between items-center mb-md">
          <div>
            <button onClick={() => navigate('/commands')} className="px-md py-sm border rounded mr-md">Back</button>
          </div>
          <div>
            <button onClick={() => { logout(); navigate('/'); }} className="px-md py-sm border rounded bg-white">Sign Out</button>
          </div>
        </div>
        {!transaction ? (
          <section className="w-full flex items-center justify-center">
            <div className="bg-white p-lg rounded-xl text-center space-y-md max-w-md w-full">
              <h2 className="font-title-lg">No active transaction to return</h2>
              <p className="text-secondary">There is no borrowed tool to finish returning right now.</p>
              <div className="flex flex-wrap justify-center gap-sm">
                <button onClick={() => navigate('/commands')} className="px-md py-sm rounded bg-surface-container-high text-secondary font-bold">Back to Home</button>
                <button onClick={() => {
                  logout();
                  navigate('/');
                }} className="px-md py-sm rounded bg-primary text-white font-bold">Sign Out</button>
              </div>
            </div>
          </section>
        ) : (
          <>
        <section className="w-1/2">
          <div className="bg-white p-lg rounded-xl h-full flex flex-col">
            <h2 className="font-title-lg mb-lg">Locker Status</h2>
            <div className="grid grid-cols-4 gap-2 flex-grow">
              <div className="col-span-4 h-16 border rounded flex items-center justify-between px-md unlocked-highlight">
                <span className="font-mono-data font-bold">{transaction?.compartmentId || transaction?.returnCompartmentId || 'Assigned compartment'}</span>
                <span className="text-primary font-bold">UNLOCKED</span>
                <span className="material-symbols-outlined text-primary">lock_open</span>
              </div>
              {(() => {
                const activeSlot = transaction?.compartmentId || transaction?.returnCompartmentId;
                return [...Array(8)].map((_, i) => {
                  const slot = `C-${String(i + 1).padStart(2, '0')}`;
                  const isActive = slot === activeSlot;
                  return (
                    <div key={slot} className={`h-24 border rounded flex flex-col items-center justify-center ${isActive ? 'unlocked-highlight' : 'opacity-20'}`}>
                      <span className="font-mono-data">{slot}</span>
                    </div>
                  );
                });
              })()}
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
              <p>Place tool back into compartment {transaction?.compartmentId || transaction?.returnCompartmentId || 'the assigned compartment'}.</p>
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
        </>
        )}
      </main>
      <TransactionSuccessModal
        open={successOpen}
        title={successPayload?.title || 'Transaction Successful'}
        message={successPayload?.message || ''}
        details={successPayload?.details || []}
        actionLabel="Return to Home"
        onClose={() => {
          setSuccessOpen(false);
          setSuccessPayload(null);
          navigate('/commands', { state: { refresh: Date.now() } });
        }}
      />
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
  const [students, setStudents] = useState([]);
  const [auditTransactions, setAuditTransactions] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedStudentHistory, setSelectedStudentHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [studentSearch, setStudentSearch] = useState('');
  const [studentStatus, setStudentStatus] = useState('all');
  const [auditSearch, setAuditSearch] = useState('');
  const [auditStatus, setAuditStatus] = useState('all');
  const [studentFormMode, setStudentFormMode] = useState('create');
  const [studentForm, setStudentForm] = useState({ id: '', name: '', pin: '', email: '' });
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTargetStudent, setDeleteTargetStudent] = useState(null);
  const [selectedCompartment, setSelectedCompartment] = useState(null);
  const [assignmentBusy, setAssignmentBusy] = useState(false);
  const [selectedCompartmentToolIdState, setSelectedCompartmentToolIdState] = useState('');

  const clearAdminState = () => {
    setSummary(null);
    setTools([]);
    setAlerts([]);
    setStudents([]);
    setAuditTransactions([]);
    setSelectedStudent(null);
    setSelectedStudentHistory([]);
    setStudentFormMode('create');
    setStudentForm({ id: '', name: '', pin: '', email: '' });
    setSuccessMessage('');
  };

  const loadDashboard = async () => {
    if (!token) return;
    setError('');
    try {
      const [summaryResult, toolsResult, alertsResult] = await Promise.all([
        api.getAdminSummary(token),
        api.getTools(token),
        api.getAlerts(token),
      ]);
      setSummary(summaryResult);
      setTools(toolsResult.tools || []);
      setAlerts(alertsResult.alerts || []);
    } catch (err) {
      sessionStorage.removeItem('adminSessionToken');
      setToken('');
      clearAdminState();
      setError(err.message);
    }
  };

  const loadStudents = async () => {
    if (!token) return;
    try {
      const result = await api.getAdminStudents(token, { search: studentSearch, status: studentStatus });
      setStudents(result.students || []);
    } catch (err) {
      setError(err.message);
    }
  };

  const loadAuditTransactions = async () => {
    if (!token) return;
    try {
      const result = await api.getAuditTransactions(token, { search: auditSearch, status: auditStatus });
      setAuditTransactions(result.transactions || []);
    } catch (err) {
      setError(err.message);
    }
  };

  const loadStudentHistory = async (studentId) => {
    if (!token || !studentId) return;
    try {
      const result = await api.getAdminStudentHistory(studentId, token);
      setSelectedStudentHistory(result.transactions || []);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    if (!token) {
      clearAdminState();
      return;
    }
    loadDashboard();
  }, [token]);

  useEffect(() => {
    if (token && activeTab === 'students') {
      loadStudents();
    }
  }, [token, activeTab, studentSearch, studentStatus]);

  useEffect(() => {
    if (token && activeTab === 'audit') {
      loadAuditTransactions();
    }
  }, [token, activeTab, auditSearch, auditStatus]);

  useEffect(() => {
    if (!successMessage) {
      return undefined;
    }

    const timer = window.setTimeout(() => setSuccessMessage(''), 4000);
    return () => window.clearTimeout(timer);
  }, [successMessage]);

  const isOverdue = (transaction) => Boolean(transaction?.status === 'overdue' || (!transaction?.returnedAt && new Date(transaction?.dueAt).getTime() < Date.now()));

  const transactions = summary?.activeTransactions || [];
  const compartments = Array.from({ length: 16 }, (_, index) => {
    const slot = `C-${String(index + 1).padStart(2, '0')}`;
    const tool = tools.find((item) => item.compartments?.includes(slot));
    return {
      slot,
      name: tool?.name || 'Unassigned',
      tool,
      occupied: transactions.some((transaction) => transaction.compartmentId === slot),
      statusLabel: transactions.some((transaction) => transaction.compartmentId === slot) ? 'Not available' : 'Available',
    };
  });
  const selectedCompartmentInfo = compartments.find((compartment) => compartment.slot === selectedCompartment) || null;
  const selectedCompartmentToolId = selectedCompartmentInfo?.tool?.id || '';
  const assignmentToolOptions = tools.filter((tool) => ['tool-1', 'tool-2', 'tool-3', 'tool-4'].includes(tool.id));

  useEffect(() => {
    // keep a dedicated state for the select control so changes show immediately
    if (!selectedCompartment) {
      setSelectedCompartmentToolIdState('');
      return;
    }
    const info = compartments.find((c) => c.slot === selectedCompartment) || null;
    setSelectedCompartmentToolIdState(info?.tool?.id || '');
  }, [selectedCompartment, tools, transactions]);

  const formatStatus = (transaction) => {
    if (transaction.status === 'returned') return 'Returned';
    const remainingMinutes = Math.round((new Date(transaction.dueAt).getTime() - Date.now()) / (60 * 1000));
    if (remainingMinutes < 0) return `Overdue (${Math.abs(remainingMinutes)}m)`;
    if (remainingMinutes < 60) return `Active (${remainingMinutes}m left)`;
    return `Active (${Math.floor(remainingMinutes / 60)}h left)`;
  };

  const formatOverdueDuration = (dueAt) => {
    const minutes = Math.max(1, Math.floor((Date.now() - new Date(dueAt).getTime()) / (60 * 1000)));
    return minutes >= 60 ? `+${Math.floor(minutes / 60)}h ${minutes % 60}m` : `+${minutes}m`;
  };

  const formatDateTime = (value) => (value ? new Date(value).toLocaleString() : '—');

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
    clearAdminState();
    logout();
    navigate('/');
  };

  const handleStudentSubmit = async (event) => {
    event.preventDefault();
    setFormError('');
    setBusy(true);
    try {
      if (studentFormMode === 'edit') {
        const result = await api.updateAdminStudent(studentForm.id, studentForm, token);
        setSelectedStudent(result.student);
        setSuccessMessage(`Student details for ${result.student.name} were updated successfully.`);
      } else {
        const result = await api.createAdminStudent(studentForm, token);
        setSuccessMessage(`Student ${result.student.name} was registered successfully.`);
      }
      setStudentFormMode('create');
      setStudentForm({ id: '', name: '', pin: '', email: '' });
      setFormError('');
      await loadStudents();
      if (selectedStudent?.id) {
        await loadStudentHistory(selectedStudent.id);
      }
    } catch (err) {
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteStudent = (studentId) => {
    setDeleteTargetStudent(studentId);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteStudent = async () => {
    if (!deleteTargetStudent) {
      return;
    }

    setBusy(true);
    setFormError('');
    try {
      const result = await api.deleteAdminStudent(deleteTargetStudent, token);
      if (result?.deleted) {
        setSuccessMessage(`Student ${deleteTargetStudent} was deleted successfully.`);
      } else {
        setSuccessMessage(`Student ${deleteTargetStudent} was removed.`);
      }
      setSelectedStudent(null);
      setSelectedStudentHistory([]);
      setDeleteTargetStudent(null);
      setDeleteDialogOpen(false);
      await loadStudents();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const startEditStudent = (student) => {
    setStudentFormMode('edit');
    setStudentForm({
      id: student.id,
      name: student.name,
      pin: student.pin,
      email: student.email,
    });
    setActiveTab('students');
  };

  const viewStudentHistory = async (student) => {
    setSelectedStudent(student);
    await loadStudentHistory(student.id);
    setActiveTab('students');
  };

  const resetStudentForm = () => {
    setStudentFormMode('create');
    setStudentForm({ id: '', name: '', pin: '', email: '' });
    setFormError('');
  };

  const handleExportAudit = async () => {
    setBusy(true);
    try {
      const blob = await api.exportAuditReport(token, { search: auditSearch, status: auditStatus });
      const objectUrl = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = `audit-summary-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(objectUrl);
      setSuccessMessage('Audit export generated successfully and downloaded to your device.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleCompartmentAssignmentChange = async (compartmentId, toolId) => {
    if (!compartmentId || !toolId || assignmentBusy) return;
    const previousToolId = compartments.find((item) => item.slot === compartmentId)?.tool?.id;
    setAssignmentBusy(true);
    setError('');
    try {
      await api.assignCompartmentTool(token, compartmentId, toolId);
      setTools((currentTools) => currentTools
        .map((tool) => {
          const compartmentsForTool = (tool.compartments || []).filter((value) => value !== compartmentId);
          if (tool.id === previousToolId) {
            return { ...tool, compartments: compartmentsForTool };
          }
          if (tool.id === toolId) {
            return { ...tool, compartments: [...new Set([...compartmentsForTool, compartmentId])] };
          }
          return tool;
        }));
      await loadDashboard();
      setSuccessMessage(`Compartment ${compartmentId} now points to the selected tool.`);
      setSelectedCompartment(compartmentId);
    } catch (err) {
      setError(err.message);
    } finally {
      setAssignmentBusy(false);
    }
  };

  if (!token) {
    return (
      <div className="bg-background min-h-screen flex items-center justify-center p-lg">
        <form onSubmit={handleAdminLogin} className="w-full max-w-md bg-white border rounded-xl p-xl shadow-sm space-y-lg">
          <div>
            <h1 className="font-headline-lg text-primary">Admin Dashboard</h1>
            <p className="text-secondary mt-sm">Enter the administrator access code to manage students and export audit records.</p>
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
          <button
            type="button"
            onClick={() => navigate('/admin')}
            aria-label="Go to admin home"
            className="w-8 h-8 rounded-full overflow-hidden bg-surface border border-outline-variant flex items-center justify-center p-0"
          >
            <img src="/src/assets/tupm_logo.png" alt="Site icon" className="w-full h-full object-cover" />
          </button>
          <span className="font-headline-md text-headline-md font-bold text-primary">Admin Dashboard</span>
        </div>
        <div className="ml-auto flex items-center gap-md">
          <div className="relative" title={`${alerts.length} overdue tool notification${alerts.length === 1 ? '' : 's'}`}>
            <span className={`material-symbols-outlined ${alerts.length ? 'text-primary' : 'text-secondary'}`}>notifications</span>
            {alerts.length > 0 && <span className="absolute -right-2 -top-2 min-w-4 h-4 px-1 rounded-full bg-error text-white text-[10px] font-bold flex items-center justify-center">{alerts.length}</span>}
          </div>
          <button onClick={handleAdminLogout} className="px-md py-sm bg-secondary text-white rounded">Sign Out</button>
        </div>
      </header>
      <main className="pt-24 p-lg grid-dots min-h-screen">
        <div className="max-w-[1440px] mx-auto space-y-lg">
          {error && <p className="text-error font-bold">{error}</p>}
          {successMessage && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-lg py-md text-emerald-800 shadow-sm flex items-start gap-md">
              <span className="material-symbols-outlined text-emerald-600">check_circle</span>
              <div>
                <div className="font-title-lg text-emerald-900">Success</div>
                <p className="font-body-md">{successMessage}</p>
              </div>
            </div>
          )}
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
              <p className="text-secondary uppercase text-xs">Admin Coverage</p>
              <h3 className="text-4xl font-bold mt-2 text-emerald-600">Students + Audit</h3>
            </div>
          </div>

          <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
            <div className="flex flex-wrap gap-sm border-b bg-slate-50 p-md">
              {[
                ['overview', 'Overview'],
                ['students', 'Students'],
                ['audit', 'Audit Export'],
              ].map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`px-md py-sm rounded-full text-sm font-bold transition-colors ${activeTab === key ? 'bg-primary text-white' : 'bg-white border border-outline-variant text-secondary'}`}
                >
                  {label}
                </button>
              ))}
            </div>

            {activeTab === 'overview' && (
              <div className="p-lg space-y-lg">
                <section className="grid grid-cols-1 lg:grid-cols-12 gap-lg">
                  <div className="lg:col-span-8 bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
                    <div className="px-lg py-md border-b border-outline-variant flex justify-between items-center bg-surface-container-low">
                      <h4 className="font-title-lg flex items-center gap-sm"><span className="material-symbols-outlined text-primary">grid_view</span>Storage Compartments Overview</h4>
                      <div className="flex items-center gap-md text-label-md font-label-md"><span className="flex items-center gap-xs"><i className="w-3 h-3 bg-emerald-500 rounded-full" />Available</span><span className="flex items-center gap-xs"><i className="w-3 h-3 bg-slate-400 rounded-full" />Not available</span></div>
                    </div>
                    <div className="p-lg space-y-md">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-md">
                        {compartments.map((compartment) => (
                          <button
                            key={compartment.slot}
                            type="button"
                            onClick={() => setSelectedCompartment(compartment.slot)}
                            className={`relative group border p-md rounded-lg text-left transition-all hover:shadow-md ${compartment.occupied ? 'border-outline-variant bg-surface-container-high' : 'border-emerald-100 bg-emerald-50/30'} ${selectedCompartment === compartment.slot ? 'ring-2 ring-primary' : ''}`}
                          >
                            <div className="flex justify-between items-start mb-sm">
                              <span className={`font-mono-data font-bold ${compartment.occupied ? 'text-secondary' : 'text-emerald-700'}`}>{compartment.slot}</span>
                              <span className={`material-symbols-outlined text-[18px] ${compartment.occupied ? 'text-slate-400' : 'text-emerald-500'}`}>{compartment.occupied ? 'lock' : 'check_circle'}</span>
                            </div>
                            <p className="font-label-md truncate text-on-surface">{compartment.name}</p>
                            <p className={`text-xs mt-sm font-semibold ${compartment.occupied ? 'text-slate-500' : 'text-emerald-600'}`}>{compartment.statusLabel}</p>
                          </button>
                        ))}
                      </div>
                      <div className="rounded-xl border border-outline-variant bg-surface-container-low p-md space-y-md">
                        <div className="flex items-center justify-between gap-md">
                          <div>
                            <p className="font-label-md text-secondary uppercase">Selected compartment</p>
                            <p className="font-title-lg text-on-surface">{selectedCompartment || 'Choose a compartment'}</p>
                          </div>
                          <div className="px-sm py-xs rounded-full bg-primary/10 text-primary font-label-md">Live DB mapping</div>
                        </div>
                        <label className="block font-label-md text-secondary uppercase">Assign tool to this compartment</label>
                        <select
                          className="w-full border border-outline-variant rounded px-md py-sm"
                          value={selectedCompartmentToolIdState}
                          onChange={(event) => {
                            const newToolId = event.target.value;
                            setSelectedCompartmentToolIdState(newToolId);
                            handleCompartmentAssignmentChange(selectedCompartment, newToolId);
                          }}
                          disabled={!selectedCompartment || assignmentBusy}
                        >
                          <option value="">Unassigned</option>
                          {assignmentToolOptions.map((tool) => (
                            <option key={tool.id} value={tool.id}>{tool.name}</option>
                          ))}
                        </select>
                        <p className="text-sm text-secondary">Changing this assignment updates the same database-backed mapping used by borrowers when they select a tool and unlock the compartment.</p>
                      </div>
                    </div>
                  </div>
                  <aside className="lg:col-span-4 flex flex-col gap-lg">
                    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm flex-1">
                      <div className="px-lg py-md border-b border-outline-variant flex justify-between items-center bg-primary text-white"><h4 className="font-title-lg flex items-center gap-sm"><span className="material-symbols-outlined">warning</span>Overdue Alerts</h4><span className="px-sm py-xs bg-white/20 rounded font-label-md">{alerts.length} Alerts</span></div>
                      <div className="p-md space-y-sm">{alerts.length ? alerts.map((item) => <div key={item.id} className="p-md bg-error-container/20 border-l-4 border-primary rounded-r-lg space-y-xs"><div className="flex justify-between items-start"><span className="font-body-md font-bold text-primary">{item.studentId}</span><span className="font-label-md text-primary font-bold">{formatOverdueDuration(item.dueAt)}</span></div><p className="text-body-md text-secondary">{item.toolName}</p><div className="flex justify-between items-center mt-sm"><span className="text-[11px] uppercase tracking-tighter text-secondary">Due: {new Date(item.dueAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div></div>) : <p className="p-md text-secondary text-body-md">No overdue tools. Great work!</p>}</div>
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
                          <th className="p-4">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y text-sm">
                        {transactions.map((item) => (
                          <tr key={`active-${item.id}`}>
                            <td className={`p-4 font-bold ${isOverdue(item) ? 'text-primary' : ''}`}>{item.studentId}</td>
                            <td className="p-4">{item.toolName}</td>
                            <td className="p-4">{item.compartmentId}</td>
                            <td className="p-4">{formatDateTime(item.borrowedAt)}</td>
                            <td className={`p-4 ${isOverdue(item) ? 'text-primary' : 'text-emerald-600'}`}>{formatStatus(item)}</td>
                            <td className="p-4">{item.status || 'active'}</td>
                          </tr>
                        ))}
                        {!transactions.length && <tr><td colSpan="6" className="p-4 text-center text-secondary">No active tool transactions.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </section>
              </div>
            )}

            {activeTab === 'students' && (
              <div className="p-lg space-y-lg">
                <section className="grid grid-cols-1 xl:grid-cols-12 gap-lg">
                  <div className="xl:col-span-4 bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-sm space-y-md">
                    <div className="flex items-center justify-between gap-md">
                      <h4 className="font-title-lg text-on-background">{studentFormMode === 'edit' ? 'Edit Student' : 'Register Student'}</h4>
                      <button type="button" onClick={resetStudentForm} className="text-sm text-primary font-bold">Reset</button>
                    </div>
                    <form onSubmit={handleStudentSubmit} className="space-y-md">
                      <input className="w-full border border-outline-variant rounded px-md py-sm" placeholder="Student ID" value={studentForm.id} disabled={studentFormMode === 'edit'} onChange={(event) => setStudentForm({ ...studentForm, id: event.target.value })} />
                      <input className="w-full border border-outline-variant rounded px-md py-sm" placeholder="Full name" value={studentForm.name} onChange={(event) => setStudentForm({ ...studentForm, name: event.target.value })} />
                      <input className="w-full border border-outline-variant rounded px-md py-sm" placeholder="PIN" value={studentForm.pin} onChange={(event) => setStudentForm({ ...studentForm, pin: event.target.value })} />
                      <input className="w-full border border-outline-variant rounded px-md py-sm" placeholder="Email" value={studentForm.email} onChange={(event) => setStudentForm({ ...studentForm, email: event.target.value })} />
                      {formError && <p className="text-error font-bold">{formError}</p>}
                      <button type="submit" disabled={busy} className="w-full bg-primary text-white rounded px-md py-sm font-bold disabled:opacity-60">{busy ? 'Saving...' : studentFormMode === 'edit' ? 'Update Student' : 'Add Student'}</button>
                    </form>
                  </div>
                  <div className="xl:col-span-8 space-y-lg">
                    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-sm flex flex-col gap-md">
                      <div className="flex flex-wrap gap-md items-center justify-between">
                        <div className="flex flex-wrap gap-md items-center">
                          <input className="border border-outline-variant rounded px-md py-sm min-w-[260px]" placeholder="Search students by ID, name, or email" value={studentSearch} onChange={(event) => setStudentSearch(event.target.value)} />
                          <select className="border border-outline-variant rounded px-md py-sm" value={studentStatus} onChange={(event) => setStudentStatus(event.target.value)}>
                            <option value="all">All students</option>
                            <option value="active">With active borrowings</option>
                            <option value="overdue">With overdue borrowings</option>
                            <option value="inactive">No active borrowings</option>
                          </select>
                        </div>
                        <button onClick={loadStudents} className="px-md py-sm rounded bg-secondary text-white font-bold">Refresh</button>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-slate-100 uppercase text-xs text-slate-600">
                            <tr>
                              <th className="p-4">Student</th>
                              <th className="p-4">Email</th>
                              <th className="p-4">Active</th>
                              <th className="p-4">Overdue</th>
                              <th className="p-4">Last Borrowed</th>
                              <th className="p-4">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {students.map((student) => (
                              <tr key={student.id} className={selectedStudent?.id === student.id ? 'bg-primary/5' : ''}>
                                <td className="p-4">
                                  <div className="font-bold text-on-surface">{student.name}</div>
                                  <div className="text-secondary font-mono-data">{student.id}</div>
                                </td>
                                <td className="p-4 text-secondary">{student.email}</td>
                                <td className="p-4">{student.activeBorrowCount || 0}</td>
                                <td className={`p-4 ${student.overdueBorrowCount ? 'text-primary font-bold' : ''}`}>{student.overdueBorrowCount || 0}</td>
                                <td className="p-4 text-secondary">{formatDateTime(student.lastBorrowedAt)}</td>
                                <td className="p-4 space-x-3">
                                  <button onClick={() => viewStudentHistory(student)} className="text-primary font-bold">View History</button>
                                  <button onClick={() => startEditStudent(student)} className="text-secondary font-bold">Edit</button>
                                  <button onClick={() => handleDeleteStudent(student.id)} className="text-error font-bold">Delete</button>
                                </td>
                              </tr>
                            ))}
                            {!students.length && <tr><td colSpan="6" className="p-4 text-center text-secondary">No students found.</td></tr>}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-sm space-y-md">
                      <div className="flex items-center justify-between">
                        <h4 className="font-title-lg text-on-background">Student Borrowing History</h4>
                        {selectedStudent && <span className="text-sm text-secondary">{selectedStudent.name}</span>}
                      </div>
                      {selectedStudent ? (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-sm">
                            <thead className="bg-slate-100 uppercase text-xs text-slate-600">
                              <tr>
                                <th className="p-4">Tool</th>
                                <th className="p-4">Borrowed</th>
                                <th className="p-4">Due</th>
                                <th className="p-4">Returned</th>
                                <th className="p-4">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y">
                              {selectedStudentHistory.map((transaction) => (
                                <tr key={transaction.id}>
                                  <td className="p-4">
                                    <div className="font-bold text-on-surface">{transaction.toolName}</div>
                                    <div className="text-secondary font-mono-data">{transaction.compartmentId}</div>
                                  </td>
                                  <td className="p-4 text-secondary">{formatDateTime(transaction.borrowedAt)}</td>
                                  <td className={`p-4 ${transaction.status === 'overdue' ? 'text-primary font-bold' : 'text-secondary'}`}>{formatDateTime(transaction.dueAt)}</td>
                                  <td className="p-4 text-secondary">{transaction.returnedAt ? formatDateTime(transaction.returnedAt) : 'Not yet returned'}</td>
                                  <td className="p-4">
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${transaction.status === 'returned' ? 'bg-emerald-100 text-emerald-700' : transaction.status === 'overdue' ? 'bg-primary/10 text-primary' : 'bg-amber-100 text-amber-800'}`}>
                                      {transaction.status}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                              {!selectedStudentHistory.length && <tr><td colSpan="5" className="p-4 text-center text-secondary">No borrowing history available.</td></tr>}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-secondary">Select a student to inspect their borrowing history.</p>
                      )}
                    </div>
                  </div>
                </section>
              </div>
            )}

            {activeTab === 'audit' && (
              <div className="p-lg space-y-lg">
                <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-sm space-y-md">
                  <div className="flex flex-wrap gap-md items-center justify-between">
                    <div className="flex flex-wrap gap-md items-center">
                      <input className="border border-outline-variant rounded px-md py-sm min-w-[260px]" placeholder="Search by student, tool, or transaction" value={auditSearch} onChange={(event) => setAuditSearch(event.target.value)} />
                      <select className="border border-outline-variant rounded px-md py-sm" value={auditStatus} onChange={(event) => setAuditStatus(event.target.value)}>
                        <option value="all">All records</option>
                        <option value="active">Active only</option>
                        <option value="returned">Returned only</option>
                        <option value="overdue">Overdue only</option>
                      </select>
                    </div>
                    <button onClick={handleExportAudit} disabled={busy} className="px-md py-sm rounded bg-primary text-white font-bold disabled:opacity-60">{busy ? 'Preparing export...' : 'Export CSV'}</button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-100 uppercase text-xs text-slate-600">
                        <tr>
                          <th className="p-4">Transaction</th>
                          <th className="p-4">Student</th>
                          <th className="p-4">Tool</th>
                          <th className="p-4">Borrowed</th>
                          <th className="p-4">Due</th>
                          <th className="p-4">Returned</th>
                          <th className="p-4">Flag</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {auditTransactions.map((transaction) => (
                          <tr key={transaction.id}>
                            <td className="p-4 font-mono-data text-secondary">{transaction.id}</td>
                            <td className="p-4">
                              <div className="font-bold">{transaction.studentName}</div>
                              <div className="text-secondary">{transaction.studentId}</div>
                            </td>
                            <td className="p-4">{transaction.toolName}</td>
                            <td className="p-4 text-secondary">{formatDateTime(transaction.borrowedAt)}</td>
                            <td className={`p-4 ${transaction.status === 'overdue' ? 'text-primary font-bold' : 'text-secondary'}`}>{formatDateTime(transaction.dueAt)}</td>
                            <td className="p-4 text-secondary">{transaction.returnedAt ? formatDateTime(transaction.returnedAt) : 'Not yet returned'}</td>
                            <td className="p-4">
                              <span className={`px-3 py-1 rounded-full text-xs font-bold ${transaction.status === 'returned' ? 'bg-emerald-100 text-emerald-700' : transaction.status === 'overdue' ? 'bg-primary/10 text-primary' : 'bg-amber-100 text-amber-800'}`}>
                                {transaction.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                        {!auditTransactions.length && <tr><td colSpan="7" className="p-4 text-center text-secondary">No audit records found.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </section>
              </div>
            )}
          </div>
        </div>
      <ConfirmationModal
        open={deleteDialogOpen}
        title="Delete Student"
        message={`Are you sure you want to permanently delete student ${deleteTargetStudent}? This action cannot be undone.`}
        confirmLabel="Delete Student"
        onConfirm={confirmDeleteStudent}
        onCancel={() => {
          setDeleteDialogOpen(false);
          setDeleteTargetStudent(null);
        }}
        busy={busy}
      />
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
