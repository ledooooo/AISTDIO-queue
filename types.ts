
export enum AppRoute {
  HOME = '/',
  DISPLAY = '/display',
  CONTROL = '/control',
  ADMIN = '/admin',
  LOGIN = '/login',
  KIOSK = '/kiosk',
  MOBILE = '/mobile'
}

export interface Clinic {
  id: string;
  name: string;
  password?: string; // Optional for security in frontend display lists
  currentNumber: number; // The number currently being served/called
  ticketsIssued: number; // The last ticket number issued by the kiosk
  lastCalledAt: number; // Timestamp
}

export interface Announcement {
  type: 'ticket' | 'custom' | 'recording' | 'reset';
  text?: string;
  audioBlobUrl?: string;
  clinicId?: string;
  ticketNumber?: number;
  timestamp: number;
}

export interface AppSettings {
  centerName: string;
  newsTicker: string;
  audioMode: 'TTS' | 'FILES'; // Text-to-Speech or MP3 Files
  speechRate: number; // 0.5 to 2.0
  adminPassword: string;
  audioBasePath: string; // Path to MP3 files
  videoUrl: string; // Path or URL to the main video/media
}

export interface LogEntry {
    id: string;
    type: 'ISSUE' | 'SERVE';
    clinicId: string;
    ticketNumber: number;
    timestamp: number;
}

// Mock Database Structure stored in LocalStorage
export interface DatabaseSchema {
  clinics: Clinic[];
  settings: AppSettings;
  lastAnnouncement: Announcement | null;
  logs: LogEntry[]; // History for reports
}
