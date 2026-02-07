import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Send, LogOut, Key, User } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../services/api';

const NEWSPAPER_OPTIONS = ['VK', 'VV', 'PV', 'SK', 'BV', 'VK Money', 'VK Luxury'];
const OOH_SEGMENTS = ['Hotels', 'Hospitals', 'Schools', 'Colleges', 'Travel', 'Jewellery', 'Bank', 'Others'];
const COLLECTION_MODES = ['DD', 'Cash', 'Cheque', 'Online Pay'];

const initialFormData = {
  area: '',
  // Depo
  personMet: '',
  competitionActivity: '',
  discussion: '',
  outcome: '',
  // Vendor
  vendorName: '',
  phone: '',
  // Dealer & Stall
  dealerName: '',
  stallOwner: '',
  duesAmount: '',
  collectionMode: '',
  collectionAmount: '',
  competitionNewspapers: [],
  newspaperNumbers: {},
  // Reader
  readerName: '',
  contactDetails: '',
  presentReading: [],
  readersFeedback: '',
  // OOH
  segment: '',
  contactPerson: '',
  existingNewspaper: [],
  feedbackSuggestion: '',
  // Common
  accompaniedBy: ''
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

  const handleCheckboxChange = (e, fieldName) => {
    const { value, checked } = e.target;
    setFormData(prev => {
      let arr = [...(prev[fieldName] || [])];  // Change const to let
      if (checked) {
        arr.push(value);
      } else {
        arr = arr.filter(item => item !== value);
      }
      return { ...prev, [fieldName]: arr };
    });
  };

  const handleNumberFieldChange = (e, newspaper) => {
    const { value } = e.target;
    setFormData(prev => ({
      ...prev,
      newspaperNumbers: {
        ...prev.newspaperNumbers,
        [newspaper]: value
      }
    }));
  };

  const handleAddNewspaper = (newspaper, fieldName) => {
    if (formData[fieldName].includes(newspaper)) {
      return; // Already added
    }
    setFormData(prev => ({
      ...prev,
      [fieldName]: [...prev[fieldName], newspaper]
    }));
  };

  const handleRemoveNewspaper = (newspaper, fieldName) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: prev[fieldName].filter(item => item !== newspaper),
      newspaperNumbers: { ...prev.newspaperNumbers, [newspaper]: '' }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedType) {
      toast.error('Please select a submission type');
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        type: selectedType,
        area: formData.area
      };

      // Only add accompaniedBy for types that need it
      if (selectedType !== 'ooh' && selectedType !== 'reader') {
        payload.accompaniedBy = formData.accompaniedBy;
      }

      if (selectedType === 'depo') {
        payload.personMet = formData.personMet;
        payload.competitionActivity = formData.competitionActivity;
        payload.discussion = formData.discussion;
        payload.outcome = formData.outcome;
      } else if (selectedType === 'vendor') {
        payload.vendorName = formData.vendorName;
        payload.phone = formData.phone;
        payload.outcome = formData.outcome;
      } else if (selectedType === 'dealer') {
        payload.dealerName = formData.dealerName;
        payload.duesAmount = parseFloat(formData.duesAmount) || 0;
        payload.collectionMode = formData.collectionMode;
        payload.collectionAmount = parseFloat(formData.collectionAmount) || 0;
        payload.competitionNewspapers = formData.competitionNewspapers.map(paper => ({
          name: paper,
          number: formData.newspaperNumbers[paper] || ''
        }));
        payload.discussion = formData.discussion;
        payload.outcome = formData.outcome;
      } else if (selectedType === 'stall') {
        payload.stallOwner = formData.stallOwner;
        payload.duesAmount = parseFloat(formData.duesAmount) || 0;
        payload.collectionMode = formData.collectionMode;
        payload.collectionAmount = parseFloat(formData.collectionAmount) || 0;
        payload.competitionNewspapers = formData.competitionNewspapers.map(paper => ({
          name: paper,
          number: formData.newspaperNumbers[paper] || ''
        }));
        payload.discussion = formData.discussion;
        payload.outcome = formData.outcome;
      } else if (selectedType === 'reader') {
        payload.readerName = formData.readerName;
        payload.contactDetails = formData.contactDetails;
        payload.presentReading = formData.presentReading;
        payload.readersFeedback = formData.readersFeedback;
      } else if (selectedType === 'ooh') {
        payload.segment = formData.segment;
        payload.contactPerson = formData.contactPerson;
        payload.existingNewspaper = formData.existingNewspaper;
        payload.feedbackSuggestion = formData.feedbackSuggestion;
      }

      await api.post('/submissions', payload);
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

  const renderDepoForm = () => (
    <>
      <div>
        <label className="label">Person Met *</label>
        <input
          type="text"
          name="personMet"
          value={formData.personMet}
          onChange={handleChange}
          className="input"
          placeholder="Enter person name"
          required
        />
      </div>

      <div>
        <label className="label">Competition / Activity *</label>
        <textarea
          name="competitionActivity"
          value={formData.competitionActivity}
          onChange={handleChange}
          className="input min-h-[100px]"
          placeholder="Enter competition or activity details"
          required
        />
      </div>

      <div>
        <label className="label">Discussion</label>
        <textarea
          name="discussion"
          value={formData.discussion}
          onChange={handleChange}
          className="input min-h-[100px]"
          placeholder="Enter discussion details"
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
    </>
  );

  const renderVendorForm = () => (
    <>
      <div>
        <label className="label">Vendor Name *</label>
        <input
          type="text"
          name="vendorName"
          value={formData.vendorName}
          onChange={handleChange}
          className="input"
          placeholder="Enter vendor name"
          required
        />
      </div>

      <div>
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
    </>
  );

  const renderDealerForm = () => (
    <>
      <div>
        <label className="label">Dealer Name *</label>
        <input
          type="text"
          name="dealerName"
          value={formData.dealerName}
          onChange={handleChange}
          className="input"
          placeholder="Enter dealer name"
          required
        />
      </div>

      <div>
        <label className="label">Dues Amount</label>
        <input
          type="number"
          name="duesAmount"
          value={formData.duesAmount}
          onChange={handleChange}
          className="input"
          placeholder="Enter dues amount"
          step="0.01"
          min="0"
        />
      </div>

      <div>
        <label className="label">Collection Mode</label>
        <select
          name="collectionMode"
          value={formData.collectionMode}
          onChange={handleChange}
          className="input"
        >
          <option value="">-- Select Mode --</option>
          {COLLECTION_MODES.map(mode => (
            <option key={mode} value={mode}>{mode}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="label">Collection Amount</label>
        <input
          type="number"
          name="collectionAmount"
          value={formData.collectionAmount}
          onChange={handleChange}
          className="input"
          placeholder="Enter collection amount"
          step="0.01"
          min="0"
        />
      </div>

      <div>
        <label className="label text-blue-600 font-semibold">
          Outstanding: {(parseFloat(formData.duesAmount || 0) - parseFloat(formData.collectionAmount || 0)).toFixed(2)}
        </label>
      </div>

      <div className="md:col-span-2">
        <label className="label">Competition Newspapers *</label>
        <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
          {NEWSPAPER_OPTIONS.map(newspaper => (
            <div key={newspaper} className="flex items-end gap-3">
              <label className="flex items-center gap-2 flex-1">
                <input
                  type="checkbox"
                  checked={formData.competitionNewspapers.includes(newspaper)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      handleAddNewspaper(newspaper, 'competitionNewspapers');
                    } else {
                      handleRemoveNewspaper(newspaper, 'competitionNewspapers');
                    }
                  }}
                  className="w-4 h-4"
                />
                <span className="font-medium">{newspaper}</span>
              </label>
              {formData.competitionNewspapers.includes(newspaper) && (
                <input
                  type="number"
                  value={formData.newspaperNumbers[newspaper] || ''}
                  onChange={(e) => handleNumberFieldChange(e, newspaper)}
                  className="input w-24"
                  placeholder="Number"
                  min="0"
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="md:col-span-2">
        <label className="label">Discussion</label>
        <textarea
          name="discussion"
          value={formData.discussion}
          onChange={handleChange}
          className="input min-h-[100px]"
          placeholder="Enter discussion details"
        />
      </div>

      <div className="md:col-span-2">
        <label className="label">Outcome</label>
        <textarea
          name="outcome"
          value={formData.outcome}
          onChange={handleChange}
          className="input min-h-[100px]"
          placeholder="Enter outcome"
        />
      </div>
    </>
  );

  const renderStallForm = () => (
    <>
      <div>
        <label className="label">Stall Owner *</label>
        <input
          type="text"
          name="stallOwner"
          value={formData.stallOwner}
          onChange={handleChange}
          className="input"
          placeholder="Enter stall owner name"
          required
        />
      </div>

      <div>
        <label className="label">Dues Amount</label>
        <input
          type="number"
          name="duesAmount"
          value={formData.duesAmount}
          onChange={handleChange}
          className="input"
          placeholder="Enter dues amount"
          step="0.01"
          min="0"
        />
      </div>

      <div>
        <label className="label">Collection Mode</label>
        <select
          name="collectionMode"
          value={formData.collectionMode}
          onChange={handleChange}
          className="input"
        >
          <option value="">-- Select Mode --</option>
          {COLLECTION_MODES.map(mode => (
            <option key={mode} value={mode}>{mode}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="label">Collection Amount</label>
        <input
          type="number"
          name="collectionAmount"
          value={formData.collectionAmount}
          onChange={handleChange}
          className="input"
          placeholder="Enter collection amount"
          step="0.01"
          min="0"
        />
      </div>

      <div>
        <label className="label text-blue-600 font-semibold">
          Outstanding: {(parseFloat(formData.duesAmount || 0) - parseFloat(formData.collectionAmount || 0)).toFixed(2)}
        </label>
      </div>

      <div className="md:col-span-2">
        <label className="label">Competition Newspapers *</label>
        <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
          {NEWSPAPER_OPTIONS.map(newspaper => (
            <div key={newspaper} className="flex items-end gap-3">
              <label className="flex items-center gap-2 flex-1">
                <input
                  type="checkbox"
                  checked={formData.competitionNewspapers.includes(newspaper)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      handleAddNewspaper(newspaper, 'competitionNewspapers');
                    } else {
                      handleRemoveNewspaper(newspaper, 'competitionNewspapers');
                    }
                  }}
                  className="w-4 h-4"
                />
                <span className="font-medium">{newspaper}</span>
              </label>
              {formData.competitionNewspapers.includes(newspaper) && (
                <input
                  type="number"
                  value={formData.newspaperNumbers[newspaper] || ''}
                  onChange={(e) => handleNumberFieldChange(e, newspaper)}
                  className="input w-24"
                  placeholder="Number"
                  min="0"
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="md:col-span-2">
        <label className="label">Discussion</label>
        <textarea
          name="discussion"
          value={formData.discussion}
          onChange={handleChange}
          className="input min-h-[100px]"
          placeholder="Enter discussion details"
        />
      </div>

      <div className="md:col-span-2">
        <label className="label">Outcome</label>
        <textarea
          name="outcome"
          value={formData.outcome}
          onChange={handleChange}
          className="input min-h-[100px]"
          placeholder="Enter outcome"
        />
      </div>
    </>
  );

  const renderReaderForm = () => (
    <>
      <div>
        <label className="label">Reader Name *</label>
        <input
          type="text"
          name="readerName"
          value={formData.readerName}
          onChange={handleChange}
          className="input"
          placeholder="Enter reader name"
          required
        />
      </div>

      <div>
        <label className="label">Contact Details *</label>
        <input
          type="text"
          name="contactDetails"
          value={formData.contactDetails}
          onChange={handleChange}
          className="input"
          placeholder="Enter contact details"
          required
        />
      </div>

      <div className="md:col-span-2">
        <label className="label">Present Reading *</label>
        <div className="space-y-2 bg-gray-50 p-4 rounded-lg">
          {NEWSPAPER_OPTIONS.map(newspaper => (
            <label key={newspaper} className="flex items-center gap-2">
              <input
                type="checkbox"
                value={newspaper}
                checked={formData.presentReading.includes(newspaper)}
                onChange={(e) => handleCheckboxChange(e, 'presentReading')}
                className="w-4 h-4"
              />
              <span>{newspaper}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="md:col-span-2">
        <label className="label">Readers Feedback</label>
        <textarea
          name="readersFeedback"
          value={formData.readersFeedback}
          onChange={handleChange}
          className="input min-h-[100px]"
          placeholder="Enter reader feedback"
        />
      </div>
    </>
  );

  const renderOOHForm = () => (
    <>
      <div>
        <label className="label">Segment *</label>
        <select
          name="segment"
          value={formData.segment}
          onChange={handleChange}
          className="input"
          required
        >
          <option value="">-- Select Segment --</option>
          {OOH_SEGMENTS.map(segment => (
            <option key={segment} value={segment}>{segment}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="label">Contact Person *</label>
        <input
          type="text"
          name="contactPerson"
          value={formData.contactPerson}
          onChange={handleChange}
          className="input"
          placeholder="Enter contact person name"
          required
        />
      </div>

      <div className="md:col-span-2">
        <label className="label">Existing Newspaper *</label>
        <div className="space-y-2 bg-gray-50 p-4 rounded-lg">
          {NEWSPAPER_OPTIONS.map(newspaper => (
            <label key={newspaper} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.existingNewspaper.includes(newspaper)}
                onChange={(e) => {
                  if (e.target.checked) {
                    handleAddNewspaper(newspaper, 'existingNewspaper');
                  } else {
                    handleRemoveNewspaper(newspaper, 'existingNewspaper');
                  }
                }}
                className="w-4 h-4"
              />
              <span className="font-medium">{newspaper}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="md:col-span-2">
        <label className="label">Feedback / Suggestion</label>
        <textarea
          name="feedbackSuggestion"
          value={formData.feedbackSuggestion}
          onChange={handleChange}
          className="input min-h-[100px]"
          placeholder="Enter feedback or suggestion"
        />
      </div>
    </>
  );

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const today = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  const renderFormFields = () => {
    switch (selectedType) {
      case 'depo':
        return renderDepoForm();
      case 'vendor':
        return renderVendorForm();
      case 'dealer':
        return renderDealerForm();
      case 'stall':
        return renderStallForm();
      case 'reader':
        return renderReaderForm();
      case 'ooh':
        return renderOOHForm();
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">RMD Daily Call Report</h1>
            <p className="text-sm text-gray-500">{user?.email}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/reset-password')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 font-medium rounded-lg hover:bg-blue-100 hover:text-blue-700 transition-all duration-200 border border-blue-200 shadow-sm hover:shadow-md"
              title="Change Password"
            >
              <Key size={20} />
              <span>Reset Password</span>
            </button>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 font-medium rounded-lg hover:bg-red-100 hover:text-red-700 transition-all duration-200 border border-red-200 shadow-sm hover:shadow-md"
              title="Logout"
            >
              <LogOut size={20} />
              <span>Logout</span>
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
            onChange={(e) => {
              setSelectedType(e.target.value);
              setFormData(initialFormData);
            }}
            className="input max-w-xs text-center text-lg"
          >
            <option value="">-- Select Submission Type --</option>
            <option value="depo">Depo</option>
            <option value="vendor">Vendor</option>
            <option value="dealer">Dealer</option>
            <option value="stall">Stall</option>
            <option value="reader">Reader</option>
            <option value="ooh">OOH</option>
          </select>
        </div>

        {/* Form */}
        {selectedType && (
          <div className="card">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Common Fields */}
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

                {/* Type-specific Fields */}
                {renderFormFields()}

                {/* Date Field */}
                <div>
                  <label className="label">Date</label>
                  <input
                    type="text"
                    value={today}
                    className="input bg-gray-100"
                    readOnly
                  />
                </div>
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
