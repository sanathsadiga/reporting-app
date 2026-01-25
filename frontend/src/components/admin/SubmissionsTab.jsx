import { useState, useEffect } from 'react';
import api from '../../services/api';
import { Download, Search, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import toast from 'react-hot-toast';

const SUBMISSION_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'depo', label: 'Depo' },
  { value: 'vendor', label: 'Vendor' },
  { value: 'dealer', label: 'Dealer' },
  { value: 'stall', label: 'Stall' },
  { value: 'reader', label: 'Reader' },
  { value: 'ooh', label: 'OOH' }
];

export default function SubmissionsTab() {
  const [submissions, setSubmissions] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [areas, setAreas] = useState([]);
  const [selectedSubmission, setSelectedSubmission] = useState(null);

  const [filters, setFilters] = useState({
    type: '',
    area: '',
    user: '',
    from: '',
    to: ''
  });

  useEffect(() => {
    fetchSubmissions();
    fetchUsers();
    fetchAreas();
  }, []);

  const fetchSubmissions = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('limit', 20);

      if (filters.type) params.append('type', filters.type);
      if (filters.area) params.append('area', filters.area);
      if (filters.user) params.append('user', filters.user);
      if (filters.from) params.append('from', filters.from);
      if (filters.to) params.append('to', filters.to);

      const response = await api.get(`/submissions?${params}`);
      setSubmissions(response.data.data);
      setPagination(response.data.pagination);
    } catch (error) {
      toast.error('Failed to fetch submissions');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users');
      setUsers(response.data);
    } catch (error) {
      console.error('Failed to fetch users');
    }
  };

  const fetchAreas = async () => {
    try {
      const response = await api.get('/submissions/areas');
      setAreas(response.data);
    } catch (error) {
      console.error('Failed to fetch areas');
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleSearch = () => {
    fetchSubmissions(1);
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.type) params.append('type', filters.type);
      if (filters.area) params.append('area', filters.area);
      if (filters.user) params.append('user', filters.user);
      if (filters.from) params.append('from', filters.from);
      if (filters.to) params.append('to', filters.to);

      const response = await api.get(`/submissions/export?${params}`, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `submissions-${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success('Export started');
    } catch (error) {
      toast.error('Export failed');
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Submissions</h1>
        <button onClick={handleExport} className="btn-secondary flex items-center gap-2">
          <Download size={20} />
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
          <div>
            <label className="label">Type</label>
            <select
              name="type"
              value={filters.type}
              onChange={handleFilterChange}
              className="input"
            >
              {SUBMISSION_TYPES.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
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
            <label className="label">User</label>
            <select
              name="user"
              value={filters.user}
              onChange={handleFilterChange}
              className="input"
            >
              <option value="">All Users</option>
              {users.filter(u => u.role === 'user').map(user => (
                <option key={user.id} value={user.id}>{user.email}</option>
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

          <div className="flex items-end">
            <button onClick={handleSearch} className="btn-primary w-full flex items-center justify-center gap-2">
              <Search size={20} />
              Search
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : submissions.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No submissions found
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Area</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Person Met</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {submissions.map(sub => (
                    <tr key={sub.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">{sub.id}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full capitalize">
                          {sub.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">{sub.area}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{sub.personMet}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{sub.userEmail}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{formatDate(sub.submittedAt)}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setSelectedSubmission(sub)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Eye size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-4 py-3 border-t flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Showing {submissions.length} of {pagination.total} results
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fetchSubmissions(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={20} />
                </button>
                <span className="text-sm">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <button
                  onClick={() => fetchSubmissions(pagination.page + 1)}
                  disabled={pagination.page === pagination.totalPages}
                  className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Detail Modal */}
      {selectedSubmission && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-xl font-semibold">Submission Details #{selectedSubmission.id}</h2>
              <button
                onClick={() => setSelectedSubmission(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                &times;
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-500">Type</label>
                  <p className="font-medium capitalize">{selectedSubmission.type}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">User</label>
                  <p className="font-medium">{selectedSubmission.userEmail}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Area</label>
                  <p className="font-medium">{selectedSubmission.area}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Person Met</label>
                  <p className="font-medium">{selectedSubmission.personMet}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Accompanied By</label>
                  <p className="font-medium">{selectedSubmission.accompaniedBy || '-'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Submitted At</label>
                  <p className="font-medium">{formatDate(selectedSubmission.submittedAt)}</p>
                </div>
                {selectedSubmission.phone && (
                  <div>
                    <label className="text-sm text-gray-500">Phone</label>
                    <p className="font-medium">{selectedSubmission.phone}</p>
                  </div>
                )}
              </div>
              <div>
                <label className="text-sm text-gray-500">Insights / Brand</label>
                <p className="font-medium whitespace-pre-wrap">{selectedSubmission.insights || '-'}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Campaign</label>
                <p className="font-medium whitespace-pre-wrap">{selectedSubmission.campaign || '-'}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Discussion</label>
                <p className="font-medium whitespace-pre-wrap">{selectedSubmission.discussion || '-'}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Outcome</label>
                <p className="font-medium whitespace-pre-wrap">{selectedSubmission.outcome || '-'}</p>
              </div>
            </div>
            <div className="p-6 border-t">
              <button
                onClick={() => setSelectedSubmission(null)}
                className="btn-secondary w-full"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
