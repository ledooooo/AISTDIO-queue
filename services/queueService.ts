
import { Clinic, AppSettings, DatabaseSchema, Announcement, LogEntry } from "../types";
import { DEFAULT_SETTINGS, INITIAL_CLINICS } from "../constants";

const DB_KEY = 'nidaa_qms_db';

// Initialize DB if empty
const initDB = () => {
  const existing = localStorage.getItem(DB_KEY);
  if (!existing) {
    const initialData: DatabaseSchema = {
      clinics: INITIAL_CLINICS,
      settings: DEFAULT_SETTINGS,
      lastAnnouncement: null,
      logs: []
    };
    localStorage.setItem(DB_KEY, JSON.stringify(initialData));
  } else {
    // Migration for new fields if needed
    const parsed = JSON.parse(existing);
    if (!parsed.logs) {
        parsed.logs = [];
        parsed.clinics = parsed.clinics.map((c: any) => ({...c, ticketsIssued: c.currentNumber}));
        localStorage.setItem(DB_KEY, JSON.stringify(parsed));
    }
  }
};

initDB();

export const getDB = (): DatabaseSchema => {
  const str = localStorage.getItem(DB_KEY);
  return str ? JSON.parse(str) : { clinics: [], settings: DEFAULT_SETTINGS, lastAnnouncement: null, logs: [] };
};

export const saveDB = (data: DatabaseSchema) => {
  localStorage.setItem(DB_KEY, JSON.stringify(data));
  // Trigger storage event for other tabs
  window.dispatchEvent(new Event('storage'));
};

// --- Logging & Reports ---

const addLog = (db: DatabaseSchema, type: 'ISSUE' | 'SERVE', clinicId: string, ticketNumber: number) => {
    const entry: LogEntry = {
        id: Date.now().toString() + Math.random().toString().slice(2,5),
        type,
        clinicId,
        ticketNumber,
        timestamp: Date.now()
    };
    // Keep only last 1000 logs to prevent storage overflow in LS
    if (db.logs.length > 1000) db.logs.shift(); 
    db.logs.push(entry);
};

export const getDailyReport = () => {
    const db = getDB();
    const report: Record<string, { issued: number; served: number; name: string }> = {};
    
    db.clinics.forEach(c => {
        report[c.id] = { issued: 0, served: 0, name: c.name };
    });

    db.logs.forEach(log => {
        if (report[log.clinicId]) {
            if (log.type === 'ISSUE') report[log.clinicId].issued++;
            if (log.type === 'SERVE') report[log.clinicId].served++;
        }
    });

    return Object.values(report);
};

// --- Clinic Actions ---

export const getClinics = (): Clinic[] => {
  return getDB().clinics;
};

export const issueTicket = (clinicId: string): number | null => {
    const db = getDB();
    const clinicIndex = db.clinics.findIndex(c => c.id === clinicId);
    
    if (clinicIndex > -1) {
        const newTicket = (db.clinics[clinicIndex].ticketsIssued || 0) + 1;
        db.clinics[clinicIndex].ticketsIssued = newTicket;
        
        addLog(db, 'ISSUE', clinicId, newTicket);
        saveDB(db);
        return newTicket;
    }
    return null;
};

export const updateClinicNumber = (clinicId: string, newNumber: number, announce: boolean = true) => {
  const db = getDB();
  const clinicIndex = db.clinics.findIndex(c => c.id === clinicId);
  
  if (clinicIndex > -1) {
    db.clinics[clinicIndex].currentNumber = newNumber;
    db.clinics[clinicIndex].lastCalledAt = Date.now();
    
    if (announce) {
      db.lastAnnouncement = {
        type: 'ticket',
        clinicId,
        ticketNumber: newNumber,
        timestamp: Date.now()
      };
      addLog(db, 'SERVE', clinicId, newNumber);
    }
    
    saveDB(db);
  }
};

export const deleteClinic = (clinicId: string) => {
    const db = getDB();
    db.clinics = db.clinics.filter(c => c.id !== clinicId);
    saveDB(db);
};

export const resetQueue = (clinicId: string) => {
  const db = getDB();
  const clinicIndex = db.clinics.findIndex(c => c.id === clinicId);
  
  if (clinicIndex > -1) {
    db.clinics[clinicIndex].currentNumber = 0;
    db.clinics[clinicIndex].ticketsIssued = 0; 
    db.clinics[clinicIndex].lastCalledAt = Date.now();
    
    db.lastAnnouncement = {
        type: 'reset',
        clinicId: clinicId,
        text: 'تمت إعادة تعيين الطابور',
        timestamp: Date.now()
    };
    
    saveDB(db);
  }
};

export const resetAllQueues = () => {
  const db = getDB();
  db.clinics = db.clinics.map(c => ({
    ...c,
    currentNumber: 0,
    ticketsIssued: 0,
    lastCalledAt: Date.now()
  }));
  
  db.logs = [];

  db.lastAnnouncement = {
      type: 'reset',
      text: 'تمت إعادة تعيين جميع العيادات',
      timestamp: Date.now()
  };

  saveDB(db);
};

// --- Settings Actions ---

export const getSettings = (): AppSettings => {
  return getDB().settings;
};

export const updateSettings = (newSettings: Partial<AppSettings>) => {
  const db = getDB();
  db.settings = { ...db.settings, ...newSettings };
  saveDB(db);
};

export const updateClinicsList = (clinics: Clinic[]) => {
  const db = getDB();
  db.clinics = clinics;
  saveDB(db);
};

export const triggerCustomAnnouncement = (text: string) => {
  const db = getDB();
  db.lastAnnouncement = {
    type: 'custom',
    text,
    timestamp: Date.now()
  };
  saveDB(db);
};

export const triggerRecordingAnnouncement = (blobUrl: string) => {
    const db = getDB();
    db.lastAnnouncement = {
      type: 'recording',
      audioBlobUrl: blobUrl,
      timestamp: Date.now()
    };
    saveDB(db);
};

export const subscribeToChanges = (callback: () => void) => {
  window.addEventListener('storage', callback);
  return () => window.removeEventListener('storage', callback);
};

// --- Security / Lockout System ---

const LOCKOUT_DURATION_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 3;

interface LockoutState {
  attempts: number;
  lockoutTimestamp: number | null;
}

const getLockoutKey = (context: string) => `nidaa_lockout_${context}`;

const getLockoutState = (context: string): LockoutState => {
  const str = localStorage.getItem(getLockoutKey(context));
  return str ? JSON.parse(str) : { attempts: 0, lockoutTimestamp: null };
};

const saveLockoutState = (context: string, state: LockoutState) => {
  localStorage.setItem(getLockoutKey(context), JSON.stringify(state));
};

export const checkLockout = (context: string): { isLocked: boolean; remainingMinutes: number } => {
  const state = getLockoutState(context);
  
  if (state.lockoutTimestamp) {
    const elapsed = Date.now() - state.lockoutTimestamp;
    if (elapsed < LOCKOUT_DURATION_MS) {
      return { 
        isLocked: true, 
        remainingMinutes: Math.ceil((LOCKOUT_DURATION_MS - elapsed) / 60000) 
      };
    } else {
      saveLockoutState(context, { attempts: 0, lockoutTimestamp: null });
      return { isLocked: false, remainingMinutes: 0 };
    }
  }
  
  return { isLocked: false, remainingMinutes: 0 };
};

export const registerFailedAttempt = (context: string): { locked: boolean; remainingAttempts: number } => {
  const state = getLockoutState(context);
  state.attempts += 1;
  
  if (state.attempts >= MAX_ATTEMPTS) {
    state.lockoutTimestamp = Date.now();
    saveLockoutState(context, state);
    return { locked: true, remainingAttempts: 0 };
  }
  
  saveLockoutState(context, state);
  return { locked: false, remainingAttempts: MAX_ATTEMPTS - state.attempts };
};

export const clearAttempts = (context: string) => {
  localStorage.removeItem(getLockoutKey(context));
};