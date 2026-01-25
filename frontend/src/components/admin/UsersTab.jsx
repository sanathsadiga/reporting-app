import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { UserPlus, Key, Shield, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function UsersTab() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(null);
  const [creating, setCreating] = useState(false);
  const [resetting, setResetting] = useState(false);

  const [newUser, setNewUser] = useState({
    email: '',
    role: 'user',
    tempPassword: ''
  });

  const [tempPassword, setTempPassword] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users');
      setUsers(response.data);
    } catch (error) {
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setCreating(true);

    try {
      await api.post('/users', newUser);
      toast.success('User created successfully');
      setShowCreateModal(false);
      setNewUser({ email: '', role: 'user', tempPassword: '' });
      fetchUsers();
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to create user';
      toast.error(message);
    } finally {
      setCreating(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setResetting(true);

    try {
      await api.patch(`/users/${showResetModal.id}/reset-password`, {
        tempPassword
      });
      toast.success('Password reset successfully');
      setShowResetModal(null);
      setTempPassword('');
      fetchUsers();
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to reset password';
      toast.error(message);
    } finally {
      setResetting(false);
    }
  };

  const handleChangeRole = async (userId, newRole) => {
    try {
      await api.patch(`/users/${userId}/role`, { role: newRole });
      toast.success('Role updated successfully');
      fetchUsers();
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to update role';
      toast.error(message);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      await api.delete(`/users/${userId}`);
      toast.success('User deleted successfully');
      fetchUsers();
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to delete user';
      toast.error(message);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const canManageUser = (targetUser) => {
    if (currentUser.role === 'ceo') return targetUser.role !== 'ceo';
    if (currentUser.role === 'admin') return targetUser.role === 'user';
    return false;
  };

  const canCreateRole = (role) => {
    if (currentUser.role === 'ceo') return true;
    if (currentUser.role === 'admin') return role === 'user';
    return false;
  };

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
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <UserPlus size={20} />
          Create User
        </button>
      </div>

      {/* Users Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Login</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.map(user => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-700 font-semibold text-sm">
                          {user.email[0].toUpperCase()}
                        </span>
                      </div>
                      <span className="text-sm text-gray-900">{user.email}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`
                      px-2 py-1 text-xs font-medium rounded-full capitalize
                      ${user.role === 'ceo' ? 'bg-purple-100 text-purple-800' :
                        user.role === 'admin' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'}
                    `}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {user.forcePasswordReset ? (
                      <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                        Pending Reset
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                        Active
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {formatDate(user.lastLogin)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {formatDate(user.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {canManageUser(user) && (
                        <>
                          <button
                            onClick={() => setShowResetModal(user)}
                            className="p-1 text-blue-600 hover:text-blue-800"
                            title="Reset Password"
                          >
                            <Key size={18} />
                          </button>
                          {currentUser.role === 'ceo' && (
                            <>
                              <button
                                onClick={() => handleChangeRole(user.id, user.role === 'admin' ? 'user' : 'admin')}
                                className="p-1 text-purple-600 hover:text-purple-800"
                                title="Change Role"
                              >
                                <Shield size={18} />
                              </button>
                              <button
                                onClick={() => handleDeleteUser(user.id)}
                                className="p-1 text-red-600 hover:text-red-800"
                                title="Delete User"
                              >
                                <Trash2 size={18} />
                              </button>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-xl font-semibold">Create New User</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              <div>
                <label className="label">Email</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                  className="input"
                  placeholder="user@example.com"
                  required
                />
              </div>
              <div>
                <label className="label">Role</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser(prev => ({ ...prev, role: e.target.value }))}
                  className="input"
                  required
                >
                  <option value="user">User</option>
                  {currentUser.role === 'ceo' && (
                    <option value="admin">Admin</option>
                  )}
                </select>
                {currentUser.role === 'admin' && (
                  <p className="text-xs text-gray-500 mt-1">
                    Only CEO can create Admin users
                  </p>
                )}
              </div>
              <div>
                <label className="label">Temporary Password</label>
                <input
                  type="text"
                  value={newUser.tempPassword}
                  onChange={(e) => setNewUser(prev => ({ ...prev, tempPassword: e.target.value }))}
                  className="input"
                  placeholder="Min 6 characters"
                  minLength={6}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  User will be required to change this on first login
                </p>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="btn-primary flex-1"
                >
                  {creating ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-xl font-semibold">Reset Password</h2>
              <button
                onClick={() => setShowResetModal(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleResetPassword} className="p-6 space-y-4">
              <p className="text-gray-600">
                Reset password for <strong>{showResetModal.email}</strong>
              </p>
              <div>
                <label className="label">New Temporary Password</label>
                <input
                  type="text"
                  value={tempPassword}
                  onChange={(e) => setTempPassword(e.target.value)}
                  className="input"
                  placeholder="Min 6 characters"
                  minLength={6}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  User will be required to change this on next login
                </p>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowResetModal(null)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetting}
                  className="btn-primary flex-1"
                >
                  {resetting ? 'Resetting...' : 'Reset Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
