
import React, { useState, useEffect } from 'react';
import { Clinic } from '../types';
import { getDB, subscribeToChanges } from '../services/queueService';
import { RefreshCw } from 'lucide-react';

export const MobileStatus: React.FC = () => {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const loadData = () => {
    setClinics(getDB().clinics);
    setLastUpdate(new Date());
  };

  useEffect(() => {
    loadData();
    const unsubscribe = subscribeToChanges(loadData);
    // Auto refresh every 30 seconds just in case socket/storage event misses
    const interval = setInterval(loadData, 30000);
    return () => {
        unsubscribe();
        clearInterval(interval);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 font-sans pb-10">
      <header className="bg-teal-700 text-white p-6 shadow-md rounded-b-3xl mb-6">
        <h1 className="text-2xl font-bold text-center">حالة الطوابير الحالية</h1>
        <p className="text-center text-teal-200 text-sm mt-1">
            آخر تحديث: {lastUpdate.toLocaleTimeString('ar-SA')}
        </p>
      </header>

      <div className="container mx-auto px-4 max-w-md space-y-4">
          {clinics.map(clinic => (
              <div key={clinic.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center">
                  <div>
                      <h2 className="text-lg font-bold text-gray-800">{clinic.name}</h2>
                      <p className="text-gray-400 text-sm mt-1">
                          منتظرين: {Math.max(0, (clinic.ticketsIssued || 0) - clinic.currentNumber)}
                      </p>
                  </div>
                  <div className="text-center">
                      <span className="block text-xs text-gray-500 mb-1">الدور الحالي</span>
                      <span className="text-4xl font-black text-teal-600">{clinic.currentNumber}</span>
                  </div>
              </div>
          ))}
      </div>

      <div className="text-center mt-8">
          <button onClick={loadData} className="bg-teal-100 text-teal-700 px-6 py-2 rounded-full font-bold flex items-center gap-2 mx-auto hover:bg-teal-200 transition">
              <RefreshCw size={18} /> تحديث الحالة
          </button>
      </div>
    </div>
  );
};
