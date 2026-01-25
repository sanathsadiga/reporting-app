import { useState } from 'react';
import { Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  BarChart3, 
  Key,
  LogOut,
  Menu,
  X
} from 'lucide-react';
import SubmissionsTab from '../components/admin/SubmissionsTab';
import ChartsTab from '../components/admin/ChartsTab';
import UsersTab from '../components/admin/UsersTab';
import AdminOverview from '../components/admin/AdminOverview';

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/admin', icon: LayoutDashboard, label: 'Overview', end: true },
    { path: '/admin/submissions', icon: FileText, label: 'Submissions' },
    { path: '/admin/charts', icon: BarChart3, label: 'Analytics' },
    { path: '/admin/users', icon: Users, label: 'User Management' }
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-64 bg-white border-r border-gray-200
        transform transition-transform duration-200 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="h-full flex flex-col">
          {/* Logo */}
          <div className="p-6 border-b border-gray-200">
            <h1 className="text-xl font-bold text-gray-900">Times Group</h1>
            <p className="text-sm text-gray-500">Admin Panel</p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            {navItems.map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) => `
                  flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
                  ${isActive 
                    ? 'bg-blue-50 text-blue-700' 
                    : 'text-gray-600 hover:bg-gray-100'
                  }
                `}
              >
                <item.icon size={20} />
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* User Info */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-700 font-semibold">
                  {user?.email?.[0]?.toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user?.email}
                </p>
                <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => navigate('/reset-password')}
                className="flex-1 btn-secondary text-sm flex items-center justify-center gap-2"
              >
                <Key size={16} />
                Password
              </button>
              <button
                onClick={handleLogout}
                className="btn-danger text-sm px-3"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Mobile Header */}
        <header className="lg:hidden bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <Menu size={24} />
          </button>
          <h1 className="font-semibold text-gray-900">Times Group</h1>
          <div className="w-10" />
        </header>

        {/* Content */}
        <main className="flex-1 p-6">
          <Routes>
            <Route index element={<AdminOverview />} />
            <Route path="submissions" element={<SubmissionsTab />} />
            <Route path="charts" element={<ChartsTab />} />
            <Route path="users" element={<UsersTab />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
