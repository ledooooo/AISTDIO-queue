
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Clinic } from '../types';
import { getDB, issueTicket, subscribeToChanges } from '../services/queueService';
import { Printer, LogOut } from 'lucide-react';

export const Kiosk: React.FC = () => {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [ticketModal, setTicketModal] = useState<{num: number, clinic: string} | null>(null);

  useEffect(() => {
    setClinics(getDB().clinics);
    const unsubscribe = subscribeToChanges(() => {
      setClinics(getDB().clinics);
    });
    return () => unsubscribe();
  }, []);

  const handleIssueTicket = (clinicId: string, clinicName: string) => {
    const num = issueTicket(clinicId);
    if (num !== null) {
      setTicketModal({ num, clinic: clinicName });
      // Simulate print delay then auto close if needed, or wait for user interaction
    }
  };

  const closeTicket = () => {
      setTicketModal(null);
  };

  // Print function (Simulated web print)
  const handlePrint = () => {
    window.print();
    setTimeout(closeTicket, 1000);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col relative">
      
      {/* Navigation Back (Hidden during print) */}
      <div className="absolute top-4 left-4 print:hidden">
          <Link to="/" className="flex items-center gap-2 text-gray-500 hover:text-gray-800">
              <LogOut size={20} />
              <span className="font-bold">خروج</span>
          </Link>
      </div>

      <header className="bg-teal-700 text-white p-8 text-center shadow-lg print:hidden">
          <h1 className="text-4xl font-black mb-2">أهلاً بكم</h1>
          <p className="text-xl text-teal-100">يرجى اختيار العيادة لسحب تذكرة</p>
      </header>

      <main className="flex-1 p-8 flex flex-col items-center justify-center print:hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-5xl">
              {clinics.map(clinic => (
                  <button 
                    key={clinic.id}
                    onClick={() => handleIssueTicket(clinic.id, clinic.name)}
                    className="bg-white hover:bg-teal-50 border-2 border-gray-200 hover:border-teal-500 rounded-2xl p-8 shadow-sm hover:shadow-xl transition-all flex flex-col items-center gap-4 group h-48 justify-center"
                  >
                      <h2 className="text-3xl font-bold text-gray-800 group-hover:text-teal-700">{clinic.name}</h2>
                      <div className="bg-teal-100 text-teal-800 px-4 py-1 rounded-full text-sm font-medium">
                          اضغط للحجز
                      </div>
                  </button>
              ))}
          </div>
      </main>

      <footer className="p-4 text-center text-gray-400 text-sm print:hidden">
          Nidaa Kiosk System
      </footer>

      {/* Ticket Modal / Print View */}
      {ticketModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 print:bg-white print:inset-auto print:static">
              <div className="bg-white p-10 rounded-3xl shadow-2xl max-w-md w-full text-center print:shadow-none print:p-0 print:w-full">
                  <div className="print:hidden flex justify-end mb-4">
                      <button onClick={closeTicket} className="text-gray-400 hover:text-gray-800 text-2xl">&times;</button>
                  </div>
                  
                  <div className="border-4 border-gray-800 p-6 rounded-xl print:border-2">
                    <h3 className="text-2xl font-bold text-gray-600 mb-4">{ticketModal.clinic}</h3>
                    <div className="text-8xl font-black text-gray-900 mb-6">{ticketModal.num}</div>
                    <p className="text-gray-500 mb-2">يرجى الانتظار في الصالة</p>
                    <p className="text-xs text-gray-400">{new Date().toLocaleString('ar-SA')}</p>
                  </div>

                  <div className="mt-8 flex gap-4 print:hidden">
                      <button onClick={handlePrint} className="flex-1 bg-teal-600 hover:bg-teal-700 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2">
                          <Printer /> طباعة
                      </button>
                      <button onClick={closeTicket} className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 rounded-xl font-bold">
                          إغلاق
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
