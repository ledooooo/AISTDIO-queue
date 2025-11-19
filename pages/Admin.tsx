
import React, { useState, useEffect, useRef } from 'react';
import { Layout } from '../components/Layout';
import { AppSettings, Clinic } from '../types';
import { 
  getDB, 
  updateSettings, 
  updateClinicsList, 
  triggerCustomAnnouncement, 
  triggerRecordingAnnouncement, 
  subscribeToChanges,
  resetAllQueues,
  checkLockout,
  registerFailedAttempt,
  clearAttempts,
  getDailyReport,
  deleteClinic
} from '../services/queueService';
import { Plus, Trash2, Save, Mic, Square, Play, Folder, RefreshCcw, Lock, BarChart3, Settings as SettingsIcon, Printer, Copy } from 'lucide-react';

export const Admin: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings>(getDB().settings);
  const [clinics, setClinics] = useState<Clinic[]>(getDB().clinics);
  const [authorized, setAuthorized] = useState(false);
  const [authInput, setAuthInput] = useState("");
  
  // Navigation State
  const [activeTab, setActiveTab] = useState<'settings' | 'reports' | 'print'>('settings');

  // Security State
  const [errorMsg, setErrorMsg] = useState("");
  const [lockoutInfo, setLockoutInfo] = useState<{isLocked: boolean; remainingMinutes: number}>({ isLocked: false, remainingMinutes: 0 });

  const LOCKOUT_CONTEXT = 'admin_panel';

  // Voice Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlobUrl, setAudioBlobUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Custom TTS State
  const [customText, setCustomText] = useState("");

  // File Inputs Refs
  const audioFolderInputRef = useRef<HTMLInputElement>(null);
  const videoFileInputRef = useRef<HTMLInputElement>(null);

  // Stats State
  const [reports, setReports] = useState<any[]>([]);

  // Printing State
  const [printClinic, setPrintClinic] = useState<string>("");
  const [printStart, setPrintStart] = useState<number>(1);
  const [printEnd, setPrintEnd] = useState<number>(30);

  useEffect(() => {
      const db = getDB();
      setSettings(db.settings);
      setClinics(db.clinics);
      if(db.clinics.length > 0) setPrintClinic(db.clinics[0].id);
      
      setLockoutInfo(checkLockout(LOCKOUT_CONTEXT));

      const unsubscribe = subscribeToChanges(() => {
          const updatedDb = getDB();
          setSettings(updatedDb.settings);
          setClinics(updatedDb.clinics);
      });
      return () => unsubscribe();
  }, []);

  // Refresh reports when tab changes
  useEffect(() => {
      if (activeTab === 'reports') {
          setReports(getDailyReport());
      }
  }, [activeTab]);

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    const status = checkLockout(LOCKOUT_CONTEXT);
    if (status.isLocked) {
      setLockoutInfo(status);
      return;
    }

    if (authInput === settings.adminPassword) {
      setAuthorized(true);
      clearAttempts(LOCKOUT_CONTEXT);
      setErrorMsg("");
    } else {
      const result = registerFailedAttempt(LOCKOUT_CONTEXT);
      if (result.locked) {
        setLockoutInfo(checkLockout(LOCKOUT_CONTEXT));
        setErrorMsg("تم قفل النظام مؤقتاً بسبب تكرار الخطأ.");
      } else {
        setErrorMsg(`كلمة مرور خاطئة. متبقى ${result.remainingAttempts} محاولات.`);
      }
    }
  };

  const handleSettingChange = (key: keyof AppSettings, value: any) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
  };

  const saveSettings = () => {
    updateSettings(settings);
    updateClinicsList(clinics);
    alert("تم حفظ الإعدادات بنجاح");
  };

  const handleResetAll = () => {
      if (window.confirm("تحذير: هل أنت متأكد من تصفير جميع العيادات وإعادة الأرقام للصفر؟")) {
          resetAllQueues();
          alert("تم تصفير جميع العيادات");
      }
  };

  const handleFolderSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
          alert("بسبب سياسة أمان المتصفحات، لا يمكن قراءة المسار الكامل للمجلد تلقائياً. يرجى كتابة المسار يدوياً أو نسخ الملفات لمجلد المشروع.\n\nمثال: ./assets/audio/");
      }
  };

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
          const file = e.target.files[0];
          handleSettingChange('videoUrl', `./assets/${file.name}`);
      }
  };

  // Clinic Management
  const addClinic = () => {
    const newClinic: Clinic = {
      id: `c${Date.now()}`,
      name: "عيادة جديدة",
      currentNumber: 0,
      ticketsIssued: 0,
      lastCalledAt: 0,
      password: "123"
    };
    setClinics([...clinics, newClinic]);
  };

  const updateClinic = (id: string, field: keyof Clinic, value: any) => {
    setClinics(clinics.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const removeClinic = (id: string) => {
    if (window.confirm("هل أنت متأكد من حذف العيادة؟ لا يمكن التراجع عن هذا الإجراء.")) {
      deleteClinic(id);
      setClinics(clinics.filter(c => c.id !== id)); // Optimistic update
    }
  };

  // Recording Logic
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];
      
      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioBlobUrl(url);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone", err);
      alert("لم يتم العثور على ميكروفون");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const broadcastRecording = () => {
      if(audioBlobUrl) {
          triggerRecordingAnnouncement(audioBlobUrl);
      }
  }

  // Printing Helper
  const getTicketsPages = () => {
      const tickets = [];
      for (let i = printStart; i <= printEnd; i++) {
          tickets.push(i);
      }
      
      // Chunk into pages of 30 (5 cols * 6 rows)
      const pages = [];
      for (let i = 0; i < tickets.length; i += 30) {
          pages.push(tickets.slice(i, i + 30));
      }
      return pages;
  }

  if (!authorized) {
    if (lockoutInfo.isLocked) {
        return (
            <div className="min-h-screen bg-red-50 flex items-center justify-center p-4">
                <div className="bg-white p-8 rounded-xl shadow-lg max-w-sm w-full text-center border-2 border-red-200">
                    <Lock className="mx-auto text-red-500 w-16 h-16 mb-4" />
                    <h2 className="text-xl font-bold mb-2 text-red-700">النظام مقفل مؤقتاً</h2>
                    <p className="text-gray-600">تم تجاوز عدد المحاولات المسموح بها.</p>
                    <p className="text-gray-800 font-bold mt-4">يرجى الانتظار {lockoutInfo.remainingMinutes} دقيقة</p>
                </div>
            </div>
        )
    }

    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <form onSubmit={handleAuth} className="bg-white p-8 rounded-xl shadow-lg max-w-sm w-full">
          <h2 className="text-xl font-bold mb-4 text-center">دخول المدير</h2>
          <input 
            type="password" 
            placeholder="كلمة مرور الإدارة" 
            className="w-full p-3 border rounded mb-2"
            value={authInput}
            onChange={e => setAuthInput(e.target.value)}
          />
          {errorMsg && <p className="text-red-500 text-sm mb-4 text-center">{errorMsg}</p>}
          <button type="submit" className="w-full bg-gray-800 text-white py-2 rounded font-bold">دخول</button>
        </form>
      </div>
    );
  }

  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-8 pb-10 no-print">
        <div className="flex justify-between items-center">
             <h1 className="text-3xl font-bold text-gray-800">لوحة التحكم الرئيسية</h1>
             <div className="flex gap-4">
                 <div className="bg-white rounded-lg p-1 flex shadow-sm">
                     <button 
                        onClick={() => setActiveTab('settings')}
                        className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition ${activeTab === 'settings' ? 'bg-teal-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                     >
                         <SettingsIcon size={16} /> الإعدادات
                     </button>
                     <button 
                        onClick={() => setActiveTab('print')}
                        className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition ${activeTab === 'print' ? 'bg-teal-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                     >
                         <Printer size={16} /> طباعة تذاكر
                     </button>
                     <button 
                        onClick={() => setActiveTab('reports')}
                        className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition ${activeTab === 'reports' ? 'bg-teal-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                     >
                         <BarChart3 size={16} /> التقارير
                     </button>
                 </div>
             </div>
        </div>

        {activeTab === 'reports' && (
            <div className="space-y-6">
                <div className="bg-white p-6 rounded-xl shadow-sm">
                    <h2 className="text-xl font-bold mb-6 text-teal-700 border-b pb-2">تقرير اليوم</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-right">
                            <thead>
                                <tr className="bg-gray-50 text-gray-700">
                                    <th className="p-4 rounded-r-lg">العيادة</th>
                                    <th className="p-4">التذاكر المصدرة</th>
                                    <th className="p-4">تم خدمتهم</th>
                                    <th className="p-4 rounded-l-lg">في الانتظار</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reports.map((row, idx) => (
                                    <tr key={idx} className="border-b last:border-0 hover:bg-gray-50">
                                        <td className="p-4 font-bold">{row.name}</td>
                                        <td className="p-4 text-blue-600 font-bold">{row.issued}</td>
                                        <td className="p-4 text-green-600 font-bold">{row.served}</td>
                                        <td className="p-4 text-orange-500 font-bold">{Math.max(0, row.issued - row.served)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {reports.length === 0 && <p className="text-center text-gray-500 mt-4">لا توجد بيانات اليوم</p>}
                </div>
            </div>
        )}

        {activeTab === 'print' && (
            <div className="space-y-6">
                <div className="bg-white p-6 rounded-xl shadow-sm">
                    <h2 className="text-xl font-bold mb-6 text-teal-700 border-b pb-2">طباعة تذاكر مسبقة (A4)</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">العيادة</label>
                            <select 
                                className="w-full p-2 border rounded"
                                value={printClinic}
                                onChange={(e) => setPrintClinic(e.target.value)}
                            >
                                {clinics.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">من رقم</label>
                            <input 
                                type="number" 
                                className="w-full p-2 border rounded"
                                value={printStart}
                                onChange={(e) => setPrintStart(parseInt(e.target.value))}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">إلى رقم</label>
                            <input 
                                type="number" 
                                className="w-full p-2 border rounded"
                                value={printEnd}
                                onChange={(e) => setPrintEnd(parseInt(e.target.value))}
                            />
                        </div>
                    </div>
                    
                    <div className="flex justify-between items-center bg-blue-50 p-4 rounded mb-6">
                        <p className="text-blue-800 text-sm">
                            سيتم طباعة <strong>{printEnd - printStart + 1}</strong> تذكرة، موزعة على <strong>{Math.ceil((printEnd - printStart + 1) / 30)}</strong> صفحات A4.
                            <br/>
                            كل صفحة تحتوي على 30 تذكرة (5 أعمدة × 6 صفوف).
                        </p>
                        <button 
                            onClick={() => window.print()}
                            className="bg-blue-600 text-white px-6 py-2 rounded font-bold flex items-center gap-2 hover:bg-blue-700"
                        >
                            <Printer size={18} /> معاينة وطباعة
                        </button>
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'settings' && (
            <>
                <div className="flex justify-end">
                     <button onClick={saveSettings} className="bg-teal-600 text-white px-6 py-2 rounded-lg flex items-center gap-2 hover:bg-teal-700 shadow-md">
                        <Save size={20} />
                        حفظ التغييرات
                     </button>
                </div>

                {/* General Settings */}
                <section className="bg-white p-6 rounded-xl shadow-sm">
                <h2 className="text-xl font-bold mb-4 text-teal-700 border-b pb-2">الإعدادات العامة</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                    <label className="block text-sm font-medium text-gray-700">اسم المركز</label>
                    <input 
                        type="text" 
                        className="w-full p-2 border rounded mt-1" 
                        value={settings.centerName}
                        onChange={(e) => handleSettingChange('centerName', e.target.value)}
                    />
                    </div>
                    <div>
                    <label className="block text-sm font-medium text-gray-700">نظام الصوت</label>
                    <select 
                        className="w-full p-2 border rounded mt-1"
                        value={settings.audioMode}
                        onChange={(e) => handleSettingChange('audioMode', e.target.value)}
                    >
                        <option value="TTS">Text-to-Speech (آلي)</option>
                        <option value="FILES">ملفات مسجلة (MP3)</option>
                    </select>
                    </div>
                    <div>
                    <label className="block text-sm font-medium text-gray-700">سرعة النطق (TTS)</label>
                    <input 
                        type="range" 
                        min="0.5" 
                        max="2" 
                        step="0.1" 
                        value={settings.speechRate}
                        onChange={(e) => handleSettingChange('speechRate', parseFloat(e.target.value))}
                        className="w-full mt-2"
                    />
                    <div className="text-center text-xs text-gray-500">{settings.speechRate}x</div>
                    </div>
                    <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700">شريط الأخبار</label>
                    <textarea 
                        className="w-full p-2 border rounded mt-1" 
                        value={settings.newsTicker}
                        onChange={(e) => handleSettingChange('newsTicker', e.target.value)}
                        rows={2}
                    />
                    </div>
                </div>
                </section>

                {/* Paths Configuration */}
                <section className="bg-white p-6 rounded-xl shadow-sm border-r-4 border-purple-500">
                <div className="flex items-center gap-2 mb-4 border-b pb-2 text-purple-700">
                    <Folder size={24} />
                    <h2 className="text-xl font-bold">مسارات الميديا والملفات</h2>
                </div>
                <div className="grid grid-cols-1 gap-6">
                    <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-800 mb-2">
                        <strong>ملاحظة:</strong> يمكنك استخدام روابط يوتيوب للفيديو، أو مسارات ملفات محلية.
                    </div>
                    
                    {/* Audio Path */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">مسار مجلد الصوتيات (Audio Path)</label>
                        <div className="flex gap-2">
                            <input 
                            type="text" 
                            dir="ltr"
                            placeholder="./assets/audio/"
                            className="flex-1 p-2 border rounded bg-gray-50 text-left"
                            value={settings.audioBasePath}
                            onChange={(e) => handleSettingChange('audioBasePath', e.target.value)}
                            />
                            <input 
                                type="file" 
                                ref={audioFolderInputRef} 
                                // @ts-ignore
                                webkitdirectory="" 
                                directory="" 
                                className="hidden" 
                                onChange={handleFolderSelect}
                            />
                            <button 
                                onClick={() => audioFolderInputRef.current?.click()}
                                className="bg-gray-200 hover:bg-gray-300 px-4 rounded text-gray-700 font-medium whitespace-nowrap"
                            >
                                اختيار مجلد
                            </button>
                        </div>
                    </div>

                    {/* Video Path / URL */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">رابط الفيديو (Youtube / MP4)</label>
                        <div className="flex gap-2">
                            <input 
                            type="text" 
                            dir="ltr"
                            placeholder="https://www.youtube.com/watch?v=... OR ./assets/video.mp4"
                            className="flex-1 p-2 border rounded bg-gray-50 text-left"
                            value={settings.videoUrl}
                            onChange={(e) => handleSettingChange('videoUrl', e.target.value)}
                            />
                            <input 
                                type="file" 
                                ref={videoFileInputRef} 
                                accept="video/*"
                                className="hidden" 
                                onChange={handleVideoSelect}
                            />
                            <button 
                                onClick={() => videoFileInputRef.current?.click()}
                                className="bg-gray-200 hover:bg-gray-300 px-4 rounded text-gray-700 font-medium whitespace-nowrap"
                            >
                                اختيار ملف
                            </button>
                        </div>
                    </div>
                </div>
                </section>

                {/* Clinics Management */}
                <section className="bg-white p-6 rounded-xl shadow-sm">
                <div className="flex justify-between items-center mb-4 border-b pb-2">
                    <h2 className="text-xl font-bold text-teal-700">إدارة العيادات</h2>
                    <div className="flex gap-2">
                        <button 
                            onClick={handleResetAll}
                            className="bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 px-3 py-1 rounded flex items-center gap-1 font-bold transition"
                        >
                            <RefreshCcw size={18} /> تصفير الكل
                        </button>
                        <button onClick={addClinic} className="bg-teal-50 text-teal-600 border border-teal-200 hover:bg-teal-100 px-3 py-1 rounded flex items-center gap-1 font-bold transition">
                            <Plus size={18} /> إضافة عيادة
                        </button>
                    </div>
                </div>
                
                <div className="space-y-3">
                    {clinics.map((clinic) => (
                        <div key={clinic.id} className="flex items-center gap-3 bg-gray-50 p-3 rounded border">
                        <input 
                            type="text" 
                            value={clinic.name} 
                            onChange={(e) => updateClinic(clinic.id, 'name', e.target.value)}
                            className="flex-1 p-2 border rounded"
                            placeholder="اسم العيادة"
                        />
                        <input 
                            type="text" 
                            value={clinic.password} 
                            onChange={(e) => updateClinic(clinic.id, 'password', e.target.value)}
                            className="w-32 p-2 border rounded"
                            placeholder="كلمة السر"
                        />
                        <button onClick={() => removeClinic(clinic.id)} className="text-red-500 hover:bg-red-100 p-2 rounded">
                            <Trash2 size={18} />
                        </button>
                        </div>
                    ))}
                </div>
                </section>

                {/* Announcements */}
                <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm">
                    <h2 className="text-xl font-bold mb-4 text-teal-700">نداء كتابي</h2>
                    <textarea 
                        className="w-full p-2 border rounded mb-4" 
                        placeholder="اكتب النص هنا ليتم عرضه ونطقه..."
                        rows={3}
                        value={customText}
                        onChange={(e) => setCustomText(e.target.value)}
                    />
                    <button 
                        onClick={() => {
                            if(customText) {
                                triggerCustomAnnouncement(customText);
                                setCustomText("");
                            }
                        }}
                        className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
                    >
                        عرض ونطق
                    </button>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-sm">
                    <h2 className="text-xl font-bold mb-4 text-teal-700">نداء صوتي فوري</h2>
                    <div className="flex flex-col items-center gap-4">
                        <div className="flex gap-4">
                            {!isRecording ? (
                                <button onClick={startRecording} className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center text-white shadow-lg hover:bg-red-600 transition">
                                    <Mic size={32} />
                                </button>
                            ) : (
                                <button onClick={stopRecording} className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center text-white animate-pulse shadow-lg">
                                    <Square size={32} />
                                </button>
                            )}
                        </div>
                        <p className="text-sm text-gray-500">
                            {isRecording ? "جاري التسجيل..." : audioBlobUrl ? "تم التسجيل" : "اضغط للتسجيل"}
                        </p>
                        
                        {audioBlobUrl && !isRecording && (
                            <div className="flex gap-2 w-full">
                                <button onClick={() => new Audio(audioBlobUrl).play()} className="flex-1 border border-gray-300 py-2 rounded flex items-center justify-center gap-2 hover:bg-gray-50">
                                    <Play size={16} /> استماع
                                </button>
                                <button onClick={broadcastRecording} className="flex-1 bg-green-600 text-white py-2 rounded hover:bg-green-700">
                                    إذاعة
                                </button>
                            </div>
                        )}
                    </div>
                    </div>
                </section>
            </>
        )}
      </div>

      {/* Print-only section */}
      <div className="print-only">
          {activeTab === 'print' && getTicketsPages().map((page, pIndex) => (
              <div key={pIndex} className="print-page">
                  {page.map(ticketNum => (
                      <div key={ticketNum} className="ticket-cell">
                          <h3 className="text-xs text-gray-600 mb-1">
                              {clinics.find(c => c.id === printClinic)?.name || "العيادة"}
                          </h3>
                          <div className="text-4xl font-black">{ticketNum}</div>
                          <p className="text-[10px] mt-1">{settings.centerName}</p>
                      </div>
                  ))}
              </div>
          ))}
      </div>
    </Layout>
  );
};