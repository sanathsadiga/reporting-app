import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { LogOut, Send, Key, User } from 'lucide-react';
import toast from 'react-hot-toast';

const SUBMISSION_TYPES = [
  { value: 'depo', label: 'Depo' },
  { value: 'vendor', label: 'Vendor' },
  { value: 'dealer', label: 'Dealer' },
  { value: 'stall', label: 'Stall' },
  { value: 'reader', label: 'Reader' },
  { value: 'ooh', label: 'OOH' }
];

const initialFormData = {
  area: '',
  personMet: '',
  accompaniedBy: '',
  insights: '',
  campaign: '',
  discussion: '',
  outcome: '',
  phone: ''
};

export default function UserDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [selectedType, setSelectedType] = useState('');
  const [formData, setFormData] = useState(initialFormData);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedType) {
      toast.error('Please select a submission type');
      return;
    }

    if (selectedType === 'ooh' && !formData.phone) {
      toast.error('Phone number is required for OOH submissions');
      return;
    }

    setSubmitting(true);

    try {
      await api.post('/submissions', {
        type: selectedType,
        ...formData
      });
      toast.success('Submitted successfully');
      setFormData(initialFormData);
      setSelectedType('');
    } catch (error) {
      const message = error.response?.data?.error || 'Submission failed';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const today = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Times Group Reporting</h1>
            <p className="text-sm text-gray-500">{user?.email}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/reset-password')}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
              title="Change Password"
            >
              <Key size={20} />
            </button>
            <button
              onClick={handleLogout}
              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
              title="Logout"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Type Selector */}
        <div className="flex justify-center mb-8">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="input max-w-xs text-center text-lg"
          >
            <option value="">-- Select Submission Type --</option>
            {SUBMISSION_TYPES.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {/* Form */}
        {selectedType && (
          <div className="card">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="label">Area *</label>
                  <input
                    type="text"
                    name="area"
                    value={formData.area}
                    onChange={handleChange}
                    className="input"
                    placeholder="Enter area"
                    required
                  />
                </div>

                <div>
                  <label className="label">Person Met *</label>
                  <input
                    type="text"
                    name="personMet"
                    value={formData.personMet}
                    onChange={handleChange}
                    className="input"
                    placeholder="Enter person met"
                    required
                  />
                </div>

                <div>
                  <label className="label">Date</label>
                  <input
                    type="text"
                    value={today}
                    className="input bg-gray-100"
                    readOnly
                  />
                </div>

                <div>
                  <label className="label">Accompanied By</label>
                  <input
                    type="text"
                    name="accompaniedBy"
                    value={formData.accompaniedBy}
                    onChange={handleChange}
                    className="input"
                    placeholder="Enter companion name"
                  />
                </div>

                {selectedType === 'ooh' && (
                  <div className="md:col-span-2">
                    <label className="label">Phone Number *</label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="input"
                      placeholder="Enter phone number"
                      required
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="label">Insights / Brand</label>
                <textarea
                  name="insights"
                  value={formData.insights}
                  onChange={handleChange}
                  className="input min-h-[100px]"
                  placeholder="Enter insights or brand information"
                />
              </div>

              <div>
                <label className="label">Campaign</label>
                <textarea
                  name="campaign"
                  value={formData.campaign}
                  onChange={handleChange}
                  className="input min-h-[100px]"
                  placeholder="Enter campaign details"
                />
              </div>

              <div>
                <label className="label">Discussion</label>
                <textarea
                  name="discussion"
                  value={formData.discussion}
                  onChange={handleChange}
                  className="input min-h-[100px]"
                  placeholder="Enter discussion points"
                />
              </div>

              <div>
                <label className="label">Outcome</label>
                <textarea
                  name="outcome"
                  value={formData.outcome}
                  onChange={handleChange}
                  className="input min-h-[100px]"
                  placeholder="Enter outcome"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <>
                    <Send size={20} />
                    Submit
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {!selectedType && (
          <div className="text-center py-16 text-gray-500">
            <User size={64} className="mx-auto mb-4 text-gray-300" />
            <p className="text-lg">Select a submission type to get started</p>
          </div>
        )}
      </main>
    </div>
  );
}
