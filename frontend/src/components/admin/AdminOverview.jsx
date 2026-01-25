import { useState, useEffect } from 'react';
import api from '../../services/api';
import { FileText, Users, Calendar, TrendingUp } from 'lucide-react';

export default function AdminOverview() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchSummary = async () => {
    try {
      const response = await api.get('/analytics/summary');
      setSummary(response.data);
    } catch (error) {
      console.error('Failed to fetch summary:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const stats = [
    {
      label: 'Total Submissions',
      value: summary?.totalSubmissions || 0,
      icon: FileText,
      color: 'bg-blue-500'
    },
    {
      label: 'Total Users',
      value: summary?.totalUsers || 0,
      icon: Users,
      color: 'bg-green-500'
    },
    {
      label: 'Today\'s Submissions',
      value: summary?.todaySubmissions || 0,
      icon: Calendar,
      color: 'bg-orange-500'
    },
    {
      label: 'This Month',
      value: summary?.thisMonthSubmissions || 0,
      icon: TrendingUp,
      color: 'bg-purple-500'
    }
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard Overview</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="card">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-lg ${stat.color} text-white`}>
                <stat.icon size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-500">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <a href="/admin/submissions" className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
            <FileText className="text-blue-600 mb-2" size={24} />
            <p className="font-medium">View Submissions</p>
            <p className="text-sm text-gray-500">Review and export data</p>
          </a>
          <a href="/admin/charts" className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
            <TrendingUp className="text-green-600 mb-2" size={24} />
            <p className="font-medium">View Analytics</p>
            <p className="text-sm text-gray-500">Charts and insights</p>
          </a>
          <a href="/admin/users" className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
            <Users className="text-purple-600 mb-2" size={24} />
            <p className="font-medium">Manage Users</p>
            <p className="text-sm text-gray-500">Create and manage accounts</p>
          </a>
        </div>
      </div>
    </div>
  );
}
