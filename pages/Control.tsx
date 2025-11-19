
import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { Clinic, AppSettings } from '../types';
import { getDB, subscribeToChanges, updateClinicNumber, resetQueue, getSettings, checkLockout, registerFailedAttempt, clearAttempts } from '../services/queueService';
import { announceTicket, announceReset } from '../services/audioService';
import { ChevronRight, ChevronLeft, Volume2, RotateCcw, Mic, UserCheck, Hash, Lock, Users } from 'lucide-react';

export const Control: React.FC = () => {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [selectedClinicId, setSelectedClinicId] = useState<string>("");
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [customNumber, setCustomNumber] = useState("");
  const [settings, setSettings] = useState<AppSettings>(getSettings());
  
  // Security
  const [errorMsg, setErrorMsg] = useState("");
  const [lockoutInfo, setLockoutInfo] = useState<{isLocked: boolean; remainingMinutes: number}>({ isLocked: false, remainingMinutes: 0 });

  const LOCKOUT_CONTEXT = 'control_panel';

  const loadData = () => {
    const db = getDB();
    setClinics(db.clinics);
    setSettings(db.settings);
  };

  useEffect(() => {
    loadData();
    setLockoutInfo(checkLockout(LOCKOUT_CONTEXT));
    const unsubscribe = subscribeToChanges(loadData);
    return () => unsubscribe();
  }, []);

  const currentClinic = clinics.find(c => c.id === selectedClinicId);
  const waitingCount = currentClinic ? Math.max(0, (currentClinic.ticketsIssued || 0) - currentClinic.currentNumber) : 0;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();

    // Check lockout
    const status = checkLockout(LOCKOUT_CONTEXT);
    if (status.isLocked) {
        setLockoutInfo(status);
        return;
    }

    const clinic = clinics.find(c => c.id === selectedClinicId);
    if (clinic) {
      if (clinic.password === password) {
        setIsAuthenticated(true);
        clearAttempts(LOCKOUT_CONTEXT);
        setErrorMsg("");
      } else {
        const result = registerFailedAttempt(LOCKOUT_CONTEXT);
        if (result.locked) {
            setLockoutInfo(checkLockout(LOCKOUT_CONTEXT));
            setErrorMsg("تم قفل النظام مؤقتاً.");
        } else {
            setErrorMsg(`كلمة المرور غير صحيحة. متبقى ${result.remainingAttempts} محاولات.`);
        }
      }
    }
  };

  // Helper to announce immediately on the control panel
  const playAudioLocally = (num: number) => {
     if(currentClinic) {
         announceTicket(num, currentClinic.name, settings);
     }
  };

  const handleNext = () => {
    if (currentClinic) {
      const nextNum = currentClinic.currentNumber + 1;
      updateClinicNumber(currentClinic.id, nextNum);
      playAudioLocally(nextNum);
    }
  };

  const handlePrev = () => {
    if (currentClinic && currentClinic.currentNumber > 0) {
      const prevNum = currentClinic.currentNumber - 1;
      // announce: true ensures screen blinks, and playAudioLocally makes sound here
      updateClinicNumber(currentClinic.id, prevNum, true);
      playAudioLocally(prevNum); 
    }
  };

  const handleRepeat = () => {
    if (currentClinic) {
      updateClinicNumber(currentClinic.id, currentClinic.currentNumber, true);
      playAudioLocally(currentClinic.currentNumber);
    }
  };

  const handleCallSpecific = () => {
    const num = parseInt(customNumber);
    if (currentClinic && !isNaN(num)) {
      updateClinicNumber(currentClinic.id, num, true);
      playAudioLocally(num);
      setCustomNumber("");
    }
  };

  const handleReset = () => {
    if (currentClinic && window.confirm("هل أنت متأكد من تصفير العداد؟")) {
      resetQueue(currentClinic.id);
      announceReset(settings); // Play reset sound locally
    }
  };

  if (!isAuthenticated) {
    if (lockoutInfo.isLocked) {
        return (
            <Layout>
                <div className="max-w-md mx-auto bg-white p-8 rounded-xl shadow-lg mt-20 border-2 border-red-200 text-center">
                    <Lock className="mx-auto text-red-500 w-16 h-16 mb-4" />
                    <h2 className="text-xl font-bold mb-2 text-red-700">النظام مقفل مؤقتاً</h2>
                    <p className="text-gray-600">حاول مرة أخرى بعد</p>
                    <p className="text-3xl font-black text-gray-800 mt-2">{lockoutInfo.remainingMinutes} دقيقة</p>
                </div>
            </Layout>
        );
    }

    return (
      <Layout>
        <div className="max-w-md mx-auto bg-white p-8 rounded-xl shadow-lg mt-20">
          <h2 className="text-2xl font-bold mb-6 text-center text-teal-700">دخول الموظفين</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">العيادة</label>
              <select 
                className="w-full p-3 border border-gray-300 rounded-lg bg-white"
                value={selectedClinicId}
                onChange={(e) => setSelectedClinicId(e.target.value)}
                required
              >
                <option value="">اختر العيادة</option>
                {clinics.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">كلمة المرور</label>
              <input 
                type="password" 
                className="w-full p-3 border border-gray-300 rounded-lg"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {errorMsg && <p className="text-red-500 text-center text-sm">{errorMsg}</p>}
            <button type="submit" className="w-full bg-teal-600 text-white py-3 rounded-lg font-bold hover:bg-teal-700 transition">
              دخول
            </button>
          </form>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <header className="flex justify-between items-center mb-8 bg-white p-6 rounded-xl shadow-sm">
          <div>
            <h2 className="text-3xl font-bold text-gray-800">{currentClinic?.name}</h2>
            <p className="text-gray-500">لوحة تحكم الدور</p>
          </div>
          <div className="text-center flex items-center gap-8">
             <div className="text-center">
                <span className="block text-sm text-gray-400 flex items-center gap-1 justify-center">
                    <Users size={14} />
                    في الانتظار
                </span>
                <span className="text-3xl font-bold text-orange-500">{waitingCount}</span>
             </div>
             <div className="text-center">
                <span className="block text-sm text-gray-400">الرقم الحالي</span>
                <span className="text-6xl font-black text-teal-600">{currentClinic?.currentNumber}</span>
             </div>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Main Controls */}
          <div className="bg-white p-6 rounded-xl shadow-sm space-y-4">
             <button 
               onClick={handleNext}
               className="w-full bg-teal-600 hover:bg-teal-700 text-white h-32 rounded-2xl text-3xl font-bold flex items-center justify-center gap-4 shadow-lg transition-transform active:scale-95"
             >
               <UserCheck size={48} />
               العميل التالي
             </button>
             
             <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={handleRepeat}
                  className="bg-yellow-500 hover:bg-yellow-600 text-white h-20 rounded-xl font-bold flex items-center justify-center gap-2"
                >
                  <Volume2 />
                  تكرار النداء
                </button>
                <button 
                  onClick={handlePrev}
                  className="bg-gray-500 hover:bg-gray-600 text-white h-20 rounded-xl font-bold flex items-center justify-center gap-2"
                >
                  <ChevronRight /> {/* RTL Icon Logic */}
                  السابق
                </button>
             </div>
          </div>

          {/* Secondary Controls */}
          <div className="bg-white p-6 rounded-xl shadow-sm space-y-6">
             
             {/* Call Specific */}
             <div>
                <label className="block font-medium text-gray-700 mb-2">نداء رقم معين</label>
                <div className="flex gap-2">
                  <input 
                    type="number" 
                    value={customNumber}
                    onChange={(e) => setCustomNumber(e.target.value)}
                    placeholder="رقم العميل"
                    className="flex-1 p-3 border border-gray-300 rounded-lg"
                  />
                  <button 
                    onClick={handleCallSpecific}
                    className="bg-blue-600 text-white px-6 rounded-lg hover:bg-blue-700"
                  >
                    <Hash />
                  </button>
                </div>
             </div>

             <hr />

             {/* Reset */}
             <div className="pt-2">
               <button 
                 onClick={handleReset}
                 className="w-full border-2 border-red-100 text-red-600 hover:bg-red-50 p-4 rounded-xl font-bold flex items-center justify-center gap-2 transition"
               >
                 <RotateCcw size={20} />
                 إعادة تعيين الطابور (تصفير)
               </button>
             </div>

          </div>
        </div>
        
        <div className="mt-8 text-center">
            <button onClick={() => setIsAuthenticated(false)} className="text-gray-500 underline hover:text-gray-800">
                تسجيل خروج من العيادة
            </button>
        </div>
      </div>
    </Layout>
  );
};
