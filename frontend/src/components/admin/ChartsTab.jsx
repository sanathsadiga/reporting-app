import { useState, useEffect } from 'react';
import api from '../../services/api';
import { Filter, RotateCcw } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

const SUBMISSION_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'depo', label: 'Depo' },
  { value: 'vendor', label: 'Vendor' },
  { value: 'dealer', label: 'Dealer' },
  { value: 'stall', label: 'Stall' },
  { value: 'reader', label: 'Reader' },
  { value: 'ooh', label: 'OOH' }
];

export default function ChartsTab() {
  const [byType, setByType] = useState({ labels: [], data: [] });
  const [byArea, setByArea] = useState({ labels: [], data: [] });
  const [byUser, setByUser] = useState({ labels: [], data: [] });
  const [byMonth, setByMonth] = useState({ labels: [], data: [], year: new Date().getFullYear() });
  const [summary, setSummary] = useState({ totalSubmissions: 0, totalUsers: 0, activeTypes: 0 });
  
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [areas, setAreas] = useState([]);

  const [filters, setFilters] = useState({
    type: '',
    area: '',
    user: '',
    from: '',
    to: ''
  });

  useEffect(() => {
    fetchAreas();
    fetchAllAnalytics();
  }, []);

  const fetchAreas = async () => {
    try {
      const response = await api.get('/submissions/areas');
      setAreas(response.data || []);
    } catch (error) {
      console.error('Failed to fetch areas');
    }
  };

  const fetchAllAnalytics = async (appliedFilters = filters) => {
    setLoading(true);
    try {
      const buildParams = (extraParams = {}) => {
        const params = new URLSearchParams();
        if (appliedFilters.from) params.append('from', appliedFilters.from);
        if (appliedFilters.to) params.append('to', appliedFilters.to);
        if (appliedFilters.type) params.append('type', appliedFilters.type);
        if (appliedFilters.area) params.append('area', appliedFilters.area);
        if (appliedFilters.user) params.append('user', appliedFilters.user);
        Object.entries(extraParams).forEach(([key, value]) => {
          if (value) params.append(key, value);
        });
        return params.toString();
      };

      const [typeRes, areaRes, userRes, monthRes, summaryRes] = await Promise.all([
        api.get(`/analytics/by-type?${buildParams()}`),
        api.get(`/analytics/by-area?${buildParams({ limit: 10 })}`),
        api.get(`/analytics/by-user?${buildParams({ limit: 10 })}`),
        api.get(`/analytics/by-month?year=${selectedYear}`),
        api.get(`/analytics/summary?${buildParams()}`)
      ]);

      setByType(typeRes.data);
      setByArea(areaRes.data);
      setByUser(userRes.data);
      setByMonth(monthRes.data);
      setSummary(summaryRes.data);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleApplyFilters = () => {
    fetchAllAnalytics(filters);
  };

  const handleResetFilters = () => {
    const newFilters = { type: '', area: '', user: '', from: '', to: '' };
    setFilters(newFilters);
    setSelectedYear(new Date().getFullYear());
    fetchAllAnalytics(newFilters);
  };

  const handleYearChange = (year) => {
    setSelectedYear(year);
  };

  // Transform data for Recharts
  const typeData = byType.labels?.map((label, i) => ({
    name: label,
    value: byType.data[i]
  })) || [];

  const areaData = byArea.labels?.map((label, i) => ({
    name: label,
    count: byArea.data[i]
  })) || [];

  const userData = byUser.labels?.map((label, i) => ({
    name: label.split('@')[0],
    count: byUser.data[i]
  })) || [];

  const monthData = byMonth.labels?.map((label, i) => ({
    name: label,
    submissions: byMonth.data[i]
  })) || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="card bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <p className="text-sm text-blue-600 font-medium">Total Submissions</p>
          <p className="text-3xl font-bold text-blue-900">{summary.totalSubmissions}</p>
        </div>
        <div className="card bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <p className="text-sm text-green-600 font-medium">Active Users</p>
          <p className="text-3xl font-bold text-green-900">{summary.totalUsers}</p>
        </div>
        <div className="card bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <p className="text-sm text-purple-600 font-medium">Submission Types</p>
          <p className="text-3xl font-bold text-purple-900">{summary.activeTypes}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter size={20} className="text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="label">Type</label>
            <select
              name="type"
              value={filters.type}
              onChange={handleFilterChange}
              className="input"
            >
              {SUBMISSION_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Area</label>
            <select
              name="area"
              value={filters.area}
              onChange={handleFilterChange}
              className="input"
            >
              <option value="">All Areas</option>
              {areas.map(area => (
                <option key={area} value={area}>{area}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">From</label>
            <input
              type="date"
              name="from"
              value={filters.from}
              onChange={handleFilterChange}
              className="input"
            />
          </div>

          <div>
            <label className="label">To</label>
            <input
              type="date"
              name="to"
              value={filters.to}
              onChange={handleFilterChange}
              className="input"
            />
          </div>

          <div className="flex items-end gap-2">
            <button onClick={handleApplyFilters} className="btn-primary flex-1">
              Apply
            </button>
            <button onClick={handleResetFilters} className="btn-secondary p-2" title="Reset Filters">
              <RotateCcw size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
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
              <BarChart data={areaData} layout="vertical" margin={{ left: 120 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={100} />
                <Tooltip />
                <Bar dataKey="count" fill="#3B82F6" radius={[0, 8, 8, 0]} />
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
              <BarChart data={userData} margin={{ bottom: 80 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#10B981" radius={[8, 8, 0, 0]} />
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
                strokeWidth={3}
                dot={{ fill: '#8B5CF6', r: 5 }}
                activeDot={{ r: 7 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
