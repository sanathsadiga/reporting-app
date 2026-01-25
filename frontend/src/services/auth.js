import api from './api';

export const authService = {
  async login(email, password) {
    const response = await api.post('/auth/login', { email, password });
    if (response.data.accessToken) {
      localStorage.setItem('accessToken', response.data.accessToken);
    }
    return response.data;
  },

  async logout() {
    try {
      await api.post('/auth/logout');
    } finally {
      localStorage.removeItem('accessToken');
    }
  },

  async getProfile() {
    const response = await api.get('/auth/me');
    return response.data;
  },

  async forceResetPassword(newPassword) {
    const response = await api.post('/auth/force-reset', { newPassword });
    return response.data;
  },

  async resetPassword(currentPassword, newPassword) {
    const response = await api.post('/auth/reset-password', { currentPassword, newPassword });
    return response.data;
  },

  async refreshToken() {
    const response = await api.post('/auth/refresh');
    if (response.data.accessToken) {
      localStorage.setItem('accessToken', response.data.accessToken);
    }
    return response.data;
  }
};
