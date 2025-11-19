
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Tv, Settings, LogOut, Printer } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  fullScreen?: boolean;
}

export const Layout: React.FC<LayoutProps> = ({ children, fullScreen = false }) => {
  const location = useLocation();

  if (fullScreen) {
    return <div className="min-h-screen bg-gray-50">{children}</div>;
  }

  const navItemClass = (path: string) => 
    `flex items-center gap-2 p-3 rounded-lg transition-colors ${
      location.pathname === path 
        ? 'bg-teal-600 text-white shadow-md' 
        : 'text-gray-600 hover:bg-teal-50'
    }`;

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Sidebar Navigation (Hidden on Display Page usually, but shown here for admin/control) */}
      <nav className="w-full md:w-64 bg-white border-l border-gray-200 p-4 flex-shrink-0">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-black text-teal-700">Nidaa QMS</h1>
          <p className="text-sm text-gray-500">نظام إدارة العيادات</p>
        </div>
        
        <ul className="space-y-2">
          <li>
            <Link to="/display" className={navItemClass('/display')}>
              <Tv size={20} />
              <span>شاشة العرض</span>
            </Link>
          </li>
          <li>
            <Link to="/control" className={navItemClass('/control')}>
              <LayoutDashboard size={20} />
              <span>وحدة التحكم</span>
            </Link>
          </li>
          <li>
            <Link to="/admin" className={navItemClass('/admin')}>
              <Settings size={20} />
              <span>الإدارة</span>
            </Link>
          </li>
          <hr className="my-2 border-gray-100" />
          <li>
            <Link to="/kiosk" className={navItemClass('/kiosk')}>
              <Printer size={20} />
              <span>جهاز التذاكر (Kiosk)</span>
            </Link>
          </li>
        </ul>

        <div className="mt-auto pt-8 border-t border-gray-100">
            <Link to="/" className="flex items-center gap-2 text-red-500 hover:text-red-700 p-2">
                <LogOut size={18} />
                <span>خروج / الرئيسية</span>
            </Link>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 bg-gray-50 p-4 md:p-8 overflow-auto h-screen">
        {children}
      </main>
    </div>
  );
};
