
import { AppSettings, Clinic } from "./types";

export const DEFAULT_SETTINGS: AppSettings = {
  centerName: "المركز الطبي التخصصي",
  newsTicker: "أهلاً وسهلاً بكم في مركزنا الطبي.. نتمنى لكم دوام الصحة والعافية.. يرجى الانتظار في الصالة حتى يتم النداء على رقمكم..",
  audioMode: 'TTS',
  speechRate: 1.0,
  adminPassword: "admin",
  audioBasePath: "/assets/audio/",
  videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
};

export const INITIAL_CLINICS: Clinic[] = [
  { id: 'c1', name: 'عيادة الباطنية', currentNumber: 0, ticketsIssued: 0, lastCalledAt: 0, password: '123' },
  { id: 'c2', name: 'عيادة الأسنان', currentNumber: 0, ticketsIssued: 0, lastCalledAt: 0, password: '123' },
  { id: 'c3', name: 'عيادة الأطفال', currentNumber: 0, ticketsIssued: 0, lastCalledAt: 0, password: '123' },
  { id: 'c4', name: 'عيادة العيون', currentNumber: 0, ticketsIssued: 0, lastCalledAt: 0, password: '123' },
];

export const PLACEHOLDER_VIDEO = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";
export const PLACEHOLDER_IMAGE = "https://picsum.photos/1920/1080";
