import { useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthContext from '../contexts/AuthContext';

export default function useAuth() {
  const auth = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (!auth.loading && !auth.isAuthenticated) {
      const token = localStorage.getItem('token');
      if (token) {
        auth.checkAuth();
      }
    }
  }, []);

  const login = async (email, password) => {
    try {
      await auth.login({ email, password });
      navigate('/dashboard');
    } catch (error) {
      throw error;
    }
  };

  const register = async (userData) => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        throw new Error('Registration failed');
      }

      const data = await response.json();
      await login(userData.email, userData.password);
      return data;
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    auth.logout();
    navigate('/login');
  };

  const updateProfile = async (userData) => {
    try {
      const response = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      const data = await response.json();
      auth.updateUser(data);
      return data;
    } catch (error) {
      throw error;
    }
  };

  const updateOrganization = async (orgData) => {
    try {
      const response = await fetch('/api/organization', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(orgData),
      });

      if (!response.ok) {
        throw new Error('Failed to update organization');
      }

      const data = await response.json();
      auth.updateOrganization(data);
      return data;
    } catch (error) {
      throw error;
    }
  };

  const forgotPassword = async (email) => {
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        throw new Error('Failed to send reset email');
      }

      return true;
    } catch (error) {
      throw error;
    }
  };

  const resetPassword = async (token, password) => {
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, password }),
      });

      if (!response.ok) {
        throw new Error('Failed to reset password');
      }

      return true;
    } catch (error) {
      throw error;
    }
  };

  return {
    user: auth.user,
    organization: auth.organization,
    isAuthenticated: auth.isAuthenticated,
    loading: auth.loading,
    error: auth.error,
    login,
    register,
    logout,
    updateProfile,
    updateOrganization,
    forgotPassword,
    resetPassword,
    clearError: auth.clearError
  };
}