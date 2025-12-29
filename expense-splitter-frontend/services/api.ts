import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const API_URL = 'http://192.168.29.52:3000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests automatically
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth APIs
export const authAPI = {
  register: async (name: string, email: string, password: string) => {
    const response = await api.post('/auth/register', { name, email, password });
    if (response.data.token) {
      await AsyncStorage.setItem('authToken', response.data.token);
      await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  login: async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    if (response.data.token) {
      await AsyncStorage.setItem('authToken', response.data.token);
      await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  logout: async () => {
    await AsyncStorage.removeItem('authToken');
    await AsyncStorage.removeItem('user');
  },

  getProfile: async () => {
    const response = await api.get('/auth/profile');
    return response.data;
  },

  updateProfile: async (name: string, phone: string, venmoHandle: string, zelleHandle: string, paypalHandle: string) => {
    const response = await api.put('/auth/profile', {
      name,
      phone,
      venmoHandle,
      zelleHandle,
      paypalHandle,
    });
    return response.data;
  },
};

// Group APIs
export const groupAPI = {
  getAll: async () => {
    const response = await api.get('/groups');
    return response.data.groups;
  },

  create: async (name: string, description: string, memberEmails: string[]) => {
    const response = await api.post('/groups', { name, description, memberEmails });
    return response.data;
  },

  getDetails: async (groupId: number) => {
    const response = await api.get(`/groups/${groupId}`);
    return response.data;
  },

  addMember: async (groupId: number, email: string) => {
    const response = await api.post(`/groups/${groupId}/members`, { email });
    return response.data;
  },
};

// Expense APIs
export const expenseAPI = {
  getGroupExpenses: async (groupId: number) => {
    const response = await api.get(`/expenses/group/${groupId}`);
    return response.data.expenses;
  },

  create: async (groupId: number, amount: number, description: string, category: string) => {
    const response = await api.post('/expenses', {
      groupId,
      amount,
      description,
      category,
      expenseDate: new Date().toISOString().split('T')[0],
    });
    return response.data;
  },

  update: async (expenseId: number, amount: number, description: string, category: string) => {
    const response = await api.put(`/expenses/${expenseId}`, {
      amount,
      description,
      category,
    });
    return response.data;
  },

  delete: async (expenseId: number) => {
    const response = await api.delete(`/expenses/${expenseId}`);
    return response.data;
  },

  getBalance: async (groupId: number) => {
    const response = await api.get(`/expenses/balance/${groupId}`);
    return response.data;
  },

  getGroupBalances: async (groupId: number) => {
    const response = await api.get(`/expenses/balances/${groupId}`);
    return response.data.balances;
  },
};


export default api;