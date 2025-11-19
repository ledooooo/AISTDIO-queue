
import React, { useEffect, useState, useRef } from 'react';
import { Clinic, AppSettings, Announcement } from '../types';
import { getDB, subscribeToChanges } from '../services/queueService';
import { announceTicket, announceCustom, playRecording, announceReset } from '../services/audioService';
import { PLACEHOLDER_VIDEO, PLACEHOLDER_IMAGE } from '../constants';
import { Clock, Calendar, Smartphone } from 'lucide-react';

export const Display: React.FC = () => {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [settings, setSettings] = useState<AppSettings>(getDB().settings);
  const [lastAnnouncement, setLastAnnouncement] = useState<Announcement | null>(null);
  
  // Blinking effect state
  const [highlightedClinicId, setHighlightedClinicId] = useState<string | null>(null);
  const [notificationMessage, setNotificationMessage] = useState<string | null>(null);
  
  const [currentTime, setCurrentTime] = useState(new Date());

  // Audio processing ref to prevent double triggers on strict mode
  const lastProcessedTimestamp = useRef<number>(0);

  const loadData = () => {
    const db = getDB();
    setClinics(db.clinics);
    setSettings(db.settings);
    
    if (db.lastAnnouncement && db.lastAnnouncement.timestamp > lastProcessedTimestamp.current) {
      handleAnnouncement(db.lastAnnouncement, db.settings, db.clinics);
      lastProcessedTimestamp.current = db.lastAnnouncement.timestamp;
      setLastAnnouncement(db.lastAnnouncement);
    }
  };

  const handleAnnouncement = (announcement: Announcement, currentSettings: AppSettings, currentClinics: Clinic[]) => {
    if (announcement.type === 'ticket' && announcement.clinicId && announcement.ticketNumber !== undefined) {
      const clinic = currentClinics.find(c => c.id === announcement.clinicId);
      const clinicName = clinic ? clinic.name : "العيادة";
      
      // Visual Trigger
      setHighlightedClinicId(announcement.clinicId);
      setNotificationMessage(`العميل رقم ${announcement.ticketNumber} - التوجه إلى ${clinicName}`);
      
      // Audio Trigger
      announceTicket(announcement.ticketNumber, clinicName, currentSettings);

      // Remove highlight after 10 seconds
      setTimeout(() => {
        setHighlightedClinicId(null);
        setNotificationMessage(null);
      }, 10000);
    } else if (announcement.type === 'custom' && announcement.text) {
       setNotificationMessage(announcement.text);
       announceCustom(announcement.text, currentSettings);
       setTimeout(() => setNotificationMessage(null), 15000);
    } else if (announcement.type === 'recording' && announcement.audioBlobUrl) {
       setNotificationMessage("نداء إداري ...");
       playRecording(announcement.audioBlobUrl);
       setTimeout(() => setNotificationMessage(null), 10000);
    } else if (announcement.type === 'reset') {
        setNotificationMessage(announcement.text || "تمت إعادة التعيين");
        announceReset(currentSettings);
        setTimeout(() => setNotificationMessage(null), 5000);
    }
  };

  useEffect(() => {
    loadData();
    const unsubscribe = subscribeToChanges(loadData);
    const timer = setInterval(() => setCurrentTime(new Date()), 1000); // Clock update
    
    return () => {
      unsubscribe();
      clearInterval(timer);
    };
  }, []);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).format(date);
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('ar-SA', { hour: '2-digit', minute: '2-digit' }).format(date);
  };

  // Helper to determine if URL is YouTube
  const getMediaContent = (url: string) => {
      const isYouTube = url.includes('youtube.com') || url.includes('youtu.be');
      
      if (isYouTube) {
          // Convert to Embed URL if needed
          let embedUrl = url;
          if(url.includes('watch?v=')) {
              const videoId = url.split('v=')[1]?.split('&')[0];
              embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0`;
          } else if(url.includes('youtu.be/')) {
              const videoId = url.split('youtu.be/')[1];
              embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0`;
          }

          return (
            <iframe 
                width="100%" 
                height="100%" 
                src={embedUrl} 
                title="Main Display Video" 
                frameBorder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                allowFullScreen
                className="w-full h-full object-cover opacity-90 pointer-events-none"
            ></iframe>
          );
      } else {
          return (
            <video 
                src={url || PLACEHOLDER_VIDEO} 
                className="w-full h-full object-cover opacity-90" 
                autoPlay 
                muted 
                loop 
            />
          );
      }
  };

  // Generate QR code URL (pointing to the mobile page on the same host)
  const mobileUrl = `${window.location.origin}${window.location.pathname}#/mobile`;
  // Using a public API for QR code generation to avoid large dependencies
  const qrCodeImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(mobileUrl)}`;

  return (
    <div className="h-screen w-screen bg-gray-900 text-white flex flex-col overflow-hidden">
      
      {/* Top Header */}
      <header className="h-20 bg-teal-800 flex items-center justify-between px-8 shadow-lg z-10">
        <div className="flex items-center gap-4">
           <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-teal-800 font-bold text-xl">
             N
           </div>
           <h1 className="text-3xl font-bold tracking-wider">{settings.centerName}</h1>
        </div>
        <div className="flex items-center gap-8 text-xl font-medium">
          <div className="flex items-center gap-2 bg-teal-900 px-4 py-2 rounded-lg">
            <Calendar className="text-teal-300" />
            <span>{formatDate(currentTime)}</span>
          </div>
          <div className="flex items-center gap-2 bg-teal-900 px-4 py-2 rounded-lg">
            <Clock className="text-teal-300" />
            <span>{formatTime(currentTime)}</span>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Side: Clinic Cards (Now taking ~30% of screen) */}
        <div className="w-1/3 bg-gray-800 p-4 flex flex-col gap-4 overflow-y-auto custom-scrollbar border-l border-gray-700">
           {clinics.map(clinic => (
             <div 
               key={clinic.id}
               className={`
                 relative p-6 rounded-xl border-r-8 shadow-lg transition-all duration-500 transform
                 ${highlightedClinicId === clinic.id 
                   ? 'bg-teal-700 border-yellow-400 scale-105 shadow-yellow-500/50 animate-pulse z-10' 
                   : 'bg-gray-700 border-teal-600'
                 }
               `}
             >
                <h2 className="text-2xl font-semibold text-gray-200 mb-2">{clinic.name}</h2>
                <div className="flex justify-between items-end">
                  <span className="text-sm text-gray-400">الرقم الحالي</span>
                  <span className={`text-6xl font-black ${highlightedClinicId === clinic.id ? 'text-yellow-300' : 'text-white'}`}>
                    {clinic.currentNumber}
                  </span>
                </div>
             </div>
           ))}
           
           {/* QR Code Box */}
           <div className="mt-auto bg-white p-4 rounded-xl flex items-center gap-4 shadow-lg">
               <img src={qrCodeImageUrl} alt="QR Code" className="w-24 h-24" />
               <div className="text-gray-800">
                   <div className="flex items-center gap-2 font-bold text-teal-700 mb-1">
                       <Smartphone size={20} />
                       <span>تابع دورك</span>
                   </div>
                   <p className="text-sm text-gray-600 leading-tight">امسح الرمز لمتابعة الطوابير عبر هاتفك</p>
               </div>
           </div>
        </div>

        {/* Right Side: Multimedia Area */}
        <div className="w-2/3 relative bg-black flex flex-col">
          {/* Notification Overlay */}
          {notificationMessage && (
            <div className="absolute top-10 left-1/2 transform -translate-x-1/2 w-3/4 bg-yellow-500 text-black p-6 rounded-2xl shadow-2xl z-50 animate-bounce text-center">
               <h2 className="text-4xl font-black">{notificationMessage}</h2>
            </div>
          )}

          <div className="flex-1 flex items-center justify-center overflow-hidden">
             {getMediaContent(settings.videoUrl)}
          </div>
        </div>
      </div>

      {/* Bottom Ticker */}
      <div className="h-16 bg-teal-900 flex items-center overflow-hidden border-t-4 border-teal-600 relative">
         <div className="absolute right-0 bg-teal-800 h-full px-6 flex items-center z-20 shadow-lg font-bold text-xl">
            الأخبار
         </div>
         <div className="whitespace-nowrap animate-marquee text-2xl font-medium text-teal-100 leading-none w-full absolute left-0">
            <span className="mx-4">{settings.newsTicker}</span>
         </div>
      </div>

      {/* Marquee Animation Style injection */}
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-marquee {
          animation: marquee 30s linear infinite;
        }
      `}</style>
    </div>
  );
};
