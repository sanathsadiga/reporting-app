import { useState, useEffect } from 'react';
import api from '../../services/api';
import { Download, Search, ChevronLeft, ChevronRight, Eye, X } from 'lucide-react';
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
  const [detailLoading, setDetailLoading] = useState(false);
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

  // Re-fetch areas when type filter changes
  useEffect(() => {
    fetchAreas();
  }, [filters.type]);

  // Auto-fetch submissions when filters change
  useEffect(() => {
    fetchSubmissions(1);
  }, [filters.area, filters.user, filters.from, filters.to, filters.type]);

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
      const params = new URLSearchParams();
      if (filters.type) params.append('type', filters.type);
      
      const response = await api.get(`/submissions/areas?${params}`);
      setAreas(response.data || []);
    } catch (error) {
      console.error('Failed to fetch areas');
    }
  };

  const fetchSubmissionDetails = async (type, id) => {
    setDetailLoading(true);
    try {
      const response = await api.get(`/submissions/${type}/${id}`);
      setSelectedSubmission(response.data);
    } catch (error) {
      toast.error('Failed to fetch submission details');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    const newFilters = { ...filters, [name]: value };
    
    // Reset area filter when type changes
    if (name === 'type') {
      newFilters.area = '';
    }
    
    setFilters(newFilters);
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
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Invalid Date';
    }
  };

  const renderSubmissionDetails = () => {
    if (!selectedSubmission) return null;

    const type = selectedSubmission.type || '';

    const Section = ({ title, children }) => (
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b-2 border-blue-200">{title}</h3>
        {children}
      </div>
    );

    const Field = ({ label, value, fullWidth = false }) => (
      <div className={fullWidth ? 'mb-3' : ''}>
        <label className="text-sm font-medium text-gray-600">{label}</label>
        <p className="text-gray-900 mt-1 break-words">{value || '-'}</p>
      </div>
    );

    const TextArea = ({ label, value }) => (
      <div className="mb-4">
        <label className="text-sm font-medium text-gray-600">{label}</label>
        <div className="mt-1 bg-gray-50 p-3 rounded-lg border border-gray-200">
          <p className="text-gray-900 whitespace-pre-wrap">{value || '-'}</p>
        </div>
      </div>
    );

    const NewspaperList = ({ label, newspapers }) => (
      <div className="mb-4">
        <label className="text-sm font-medium text-gray-600">{label}</label>
        <div className="mt-2 space-y-2">
          {Array.isArray(newspapers) && newspapers.length > 0 ? (
            newspapers.map((item, idx) => (
              <div key={idx} className="bg-gray-50 p-3 rounded-lg border border-gray-200 flex justify-between">
                <span className="font-medium">{item.name || item}</span>
                {item.number && <span className="text-gray-600">Count: {item.number}</span>}
              </div>
            ))
          ) : (
            <p className="text-gray-500">None</p>
          )}
        </div>
      </div>
    );

    return (
      <div className="space-y-6">
        {/* Common Fields */}
        <Section title="Basic Information">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Submission ID" value={selectedSubmission.id} />
            <Field label="Type" value={type.toUpperCase()} />
            <Field label="User Email" value={selectedSubmission.userEmail || '-'} />
            <Field label="Area" value={selectedSubmission.area || '-'} />
            <div className="col-span-2">
              <Field label="Submitted Date" value={formatDate(selectedSubmission.submitted_at)} fullWidth />
            </div>
          </div>
        </Section>

        {/* DEPO */}
        {type === 'depo' && (
          <>
            <Section title="Person & Accompaniment">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Person Met" value={selectedSubmission.person_met} />
                <Field label="Accompanied By" value={selectedSubmission.accompanied_by} />
              </div>
            </Section>

            <Section title="Competition & Activity">
              <TextArea label="Competition / Activity Details" value={selectedSubmission.competition_activity} />
            </Section>

            <Section title="Discussion & Outcome">
              <TextArea label="Discussion" value={selectedSubmission.discussion} />
              <TextArea label="Outcome" value={selectedSubmission.outcome} />
            </Section>
          </>
        )}

        {/* VENDOR */}
        {type === 'vendor' && (
          <>
            <Section title="Vendor Information">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Vendor Name" value={selectedSubmission.vendor_name} />
                <Field label="Phone Number" value={selectedSubmission.phone} />
                <Field label="Accompanied By" value={selectedSubmission.accompanied_by} />
              </div>
            </Section>

            <Section title="Outcome">
              <TextArea label="Outcome" value={selectedSubmission.outcome} />
            </Section>
          </>
        )}

        {/* DEALER */}
        {type === 'dealer' && (
          <>
            <Section title="Dealer Information">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Dealer Name" value={selectedSubmission.dealer_name} />
                <Field label="Accompanied By" value={selectedSubmission.accompanied_by} />
              </div>
            </Section>

            <Section title="Financial Details">
              <div className="grid grid-cols-3 gap-4 bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div>
                  <label className="text-sm font-medium text-gray-600">Dues Amount</label>
                  <p className="text-xl font-bold text-gray-900">₹{parseFloat(selectedSubmission.dues_amount || 0).toFixed(2)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Collection Amount</label>
                  <p className="text-xl font-bold text-green-600">₹{parseFloat(selectedSubmission.collection_amount || 0).toFixed(2)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Outstanding</label>
                  <p className="text-xl font-bold text-red-600">₹{(parseFloat(selectedSubmission.dues_amount || 0) - parseFloat(selectedSubmission.collection_amount || 0)).toFixed(2)}</p>
                </div>
              </div>
              <div className="mt-4">
                <Field label="Collection Mode" value={selectedSubmission.collection_mode} fullWidth />
              </div>
            </Section>

            <Section title="Competition Newspapers">
              <NewspaperList label="Newspapers" newspapers={selectedSubmission.competition_newspapers} />
            </Section>

            <Section title="Discussion & Outcome">
              <TextArea label="Discussion" value={selectedSubmission.discussion} />
              <TextArea label="Outcome" value={selectedSubmission.outcome} />
            </Section>
          </>
        )}

        {/* STALL */}
        {type === 'stall' && (
          <>
            <Section title="Stall Information">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Stall Owner" value={selectedSubmission.stall_owner} />
                <Field label="Accompanied By" value={selectedSubmission.accompanied_by} />
              </div>
            </Section>

            <Section title="Financial Details">
              <div className="grid grid-cols-3 gap-4 bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div>
                  <label className="text-sm font-medium text-gray-600">Dues Amount</label>
                  <p className="text-xl font-bold text-gray-900">₹{parseFloat(selectedSubmission.dues_amount || 0).toFixed(2)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Collection Amount</label>
                  <p className="text-xl font-bold text-green-600">₹{parseFloat(selectedSubmission.collection_amount || 0).toFixed(2)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Outstanding</label>
                  <p className="text-xl font-bold text-red-600">₹{(parseFloat(selectedSubmission.dues_amount || 0) - parseFloat(selectedSubmission.collection_amount || 0)).toFixed(2)}</p>
                </div>
              </div>
              <div className="mt-4">
                <Field label="Collection Mode" value={selectedSubmission.collection_mode} fullWidth />
              </div>
            </Section>

            <Section title="Competition Newspapers">
              <NewspaperList label="Newspapers" newspapers={selectedSubmission.competition_newspapers} />
            </Section>

            <Section title="Discussion & Outcome">
              <TextArea label="Discussion" value={selectedSubmission.discussion} />
              <TextArea label="Outcome" value={selectedSubmission.outcome} />
            </Section>
          </>
        )}

        {/* READER */}
        {type === 'reader' && (
          <>
            <Section title="Reader Information">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Reader Name" value={selectedSubmission.reader_name} />
                <Field label="Contact Details" value={selectedSubmission.contact_details} />
              </div>
            </Section>

            <Section title="Present Reading">
              <div className="space-y-2">
                {Array.isArray(selectedSubmission.present_reading) && selectedSubmission.present_reading.length > 0 ? (
                  selectedSubmission.present_reading.map((newspaper, idx) => (
                    <div key={idx} className="bg-blue-50 p-3 rounded-lg border border-blue-200 font-medium text-gray-900">
                      {newspaper}
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500">None</p>
                )}
              </div>
            </Section>

            <Section title="Feedback">
              <TextArea label="Readers Feedback" value={selectedSubmission.readers_feedback} />
            </Section>
          </>
        )}

        {/* OOH */}
        {type === 'ooh' && (
          <>
            <Section title="OOH Information">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Segment" value={selectedSubmission.segment} />
                <Field label="Contact Person" value={selectedSubmission.contact_person} />
              </div>
            </Section>

            <Section title="Existing Newspapers">
              <div className="space-y-2">
                {Array.isArray(selectedSubmission.existing_newspaper) && selectedSubmission.existing_newspaper.length > 0 ? (
                  selectedSubmission.existing_newspaper.map((newspaper, idx) => (
                    <div key={idx} className="bg-green-50 p-3 rounded-lg border border-green-200 font-medium text-gray-900">
                      {newspaper}
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500">None</p>
                )}
              </div>
            </Section>

            <Section title="Feedback">
              <TextArea label="Feedback / Suggestion" value={selectedSubmission.feedback_suggestion} />
            </Section>
          </>
        )}
      </div>
    );
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
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {submissions.map(sub => (
                    <tr key={`${sub.type}-${sub.id}`} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">{sub.id}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full capitalize">
                          {sub.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">{sub.area}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{sub.userEmail || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{formatDate(sub.submitted_at)}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => fetchSubmissionDetails(sub.type, sub.id)}
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
            <div className="p-6 border-b flex items-center justify-between sticky top-0 bg-white">
              <h2 className="text-xl font-semibold">Submission Details #{selectedSubmission.id}</h2>
              <button
                onClick={() => setSelectedSubmission(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-6">
              {detailLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                renderSubmissionDetails()
              )}
            </div>
            <div className="p-6 border-t sticky bottom-0 bg-white">
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
