
import React from 'react';
import { HashRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Display } from './pages/Display';
import { Control } from './pages/Control';
import { Admin } from './pages/Admin';
import { Kiosk } from './pages/Kiosk';
import { MobileStatus } from './pages/MobileStatus';
import { Tv, LayoutDashboard, Settings, Printer } from 'lucide-react';

const Home: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-600 to-teal-900 flex items-center justify-center p-4">
       <div className="bg-white p-10 rounded-2xl shadow-2xl max-w-4xl w-full text-center">
          <h1 className="text-5xl font-black text-gray-800 mb-4">Nidaa QMS</h1>
          <p className="text-xl text-gray-500 mb-12">نظام إدارة الطوابير الذكي للعيادات والمراكز الطبية</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
             <Link to="/display" className="group p-6 border-2 border-gray-100 rounded-xl hover:border-teal-500 hover:shadow-xl transition-all bg-gray-50 hover:bg-white">
                <div className="w-16 h-16 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-teal-600 group-hover:text-white transition-colors">
                   <Tv size={32} />
                </div>
                <h3 className="text-xl font-bold text-gray-800">شاشة العرض</h3>
                <p className="text-sm text-gray-400 mt-2">واجهة الانتظار للمرضى</p>
             </Link>

             <Link to="/control" className="group p-6 border-2 border-gray-100 rounded-xl hover:border-teal-500 hover:shadow-xl transition-all bg-gray-50 hover:bg-white">
                <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                   <LayoutDashboard size={32} />
                </div>
                <h3 className="text-xl font-bold text-gray-800">وحدة التحكم</h3>
                <p className="text-sm text-gray-400 mt-2">للموظفين والأطباء</p>
             </Link>

             <Link to="/admin" className="group p-6 border-2 border-gray-100 rounded-xl hover:border-teal-500 hover:shadow-xl transition-all bg-gray-50 hover:bg-white">
                <div className="w-16 h-16 bg-gray-200 text-gray-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-gray-800 group-hover:text-white transition-colors">
                   <Settings size={32} />
                </div>
                <h3 className="text-xl font-bold text-gray-800">الإدارة</h3>
                <p className="text-sm text-gray-400 mt-2">الإعدادات والتقارير</p>
             </Link>

             <Link to="/kiosk" className="group p-6 border-2 border-gray-100 rounded-xl hover:border-teal-500 hover:shadow-xl transition-all bg-gray-50 hover:bg-white">
                <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                   <Printer size={32} />
                </div>
                <h3 className="text-xl font-bold text-gray-800">سحب التذاكر</h3>
                <p className="text-sm text-gray-400 mt-2">طباعة الأرقام (Kiosk)</p>
             </Link>
          </div>
       </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/display" element={<Display />} />
        <Route path="/control" element={<Control />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/kiosk" element={<Kiosk />} />
        <Route path="/mobile" element={<MobileStatus />} />
      </Routes>
    </Router>
  );
};

export default App;
