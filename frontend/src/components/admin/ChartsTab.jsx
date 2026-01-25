import { useState, useEffect } from 'react';
import api from '../../services/api';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend
} from 'recharts';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export default function ChartsTab() {
  const [byType, setByType] = useState({ labels: [], data: [] });
  const [byArea, setByArea] = useState({ labels: [], data: [] });
  const [byUser, setByUser] = useState({ labels: [], data: [] });
  const [byMonth, setByMonth] = useState({ labels: [], data: [], year: new Date().getFullYear() });
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [dateRange, setDateRange] = useState({ from: '', to: '' });

  useEffect(() => {
    fetchAllAnalytics();
  }, []);

  const fetchAllAnalytics = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateRange.from) params.append('from', dateRange.from);
      if (dateRange.to) params.append('to', dateRange.to);

      const [typeRes, areaRes, userRes, monthRes] = await Promise.all([
        api.get(`/analytics/by-type?${params}`),
        api.get(`/analytics/by-area?${params}`),
        api.get(`/analytics/by-user?${params}`),
        api.get(`/analytics/by-month?year=${selectedYear}`)
      ]);

      setByType(typeRes.data);
      setByArea(areaRes.data);
      setByUser(userRes.data);
      setByMonth(monthRes.data);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleYearChange = async (year) => {
    setSelectedYear(year);
    try {
      const response = await api.get(`/analytics/by-month?year=${year}`);
      setByMonth(response.data);
    } catch (error) {
      console.error('Failed to fetch monthly data');
    }
  };

  // Transform data for Recharts
  const typeData = byType.labels.map((label, i) => ({
    name: label,
    value: byType.data[i]
  }));

  const areaData = byArea.labels.map((label, i) => ({
    name: label,
    count: byArea.data[i]
  }));

  const userData = byUser.labels.map((label, i) => ({
    name: label.split('@')[0], // Show only username part
    count: byUser.data[i]
  }));

  const monthData = byMonth.labels.map((label, i) => ({
    name: label,
    submissions: byMonth.data[i]
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <div className="flex items-center gap-4">
          <input
            type="date"
            value={dateRange.from}
            onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
            className="input w-auto"
            placeholder="From"
          />
          <input
            type="date"
            value={dateRange.to}
            onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
            className="input w-auto"
            placeholder="To"
          />
          <button onClick={fetchAllAnalytics} className="btn-primary">
            Apply
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Type - Pie Chart */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Submissions by Type</h2>
          {typeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={typeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {typeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              No data available
            </div>
          )}
        </div>

        {/* By Area - Bar Chart */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Submissions by Area (Top 10)</h2>
          {areaData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={areaData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={100} />
                <Tooltip />
                <Bar dataKey="count" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              No data available
            </div>
          )}
        </div>

        {/* By User - Bar Chart */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Submissions by User (Top 10)</h2>
          {userData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={userData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#10B981" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              No data available
            </div>
          )}
        </div>

        {/* By Month - Line Chart */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Submissions by Month</h2>
            <select
              value={selectedYear}
              onChange={(e) => handleYearChange(parseInt(e.target.value))}
              className="input w-auto"
            >
              {[...Array(5)].map((_, i) => {
                const year = new Date().getFullYear() - i;
                return <option key={year} value={year}>{year}</option>;
              })}
            </select>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="submissions" 
                stroke="#8B5CF6" 
                strokeWidth={2}
                dot={{ fill: '#8B5CF6' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
