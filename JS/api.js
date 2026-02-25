const API_BASE = 'https://mozaker-production.up.railway.app';

class ChatAPI {
  constructor() {
    this.token = localStorage.getItem('authToken');
  }

  setToken(token) {
    this.token = token;
    localStorage.setItem('authToken', token);
  }

  getHeaders() {
    return {
      'Content-Type': 'application/json',
      ...(this.token && { 'Authorization': `Bearer ${this.token}` })
    };
  }

  async request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: { ...this.getHeaders(), ...options.headers }
    });

    if (response.status === 401) {
      this.token = null;
      localStorage.removeItem('authToken');
      window.location.href = 'signin.html';
      throw new Error('Authentication failed');
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || 'Request failed');
    }

    return response;
  }

  async createChat(firstMessage) {
    const response = await this.request('/chat/new', {
      method: 'POST',
      body: JSON.stringify({ firstMessage })
    });
    return response.json();
  }

  async getAllChats() {
    const response = await this.request('/chat/all', { method: 'GET' });
    return response.json();
  }

  async getChat(chatId) {
    const response = await this.request(`/chat/${chatId}`, { method: 'GET' });
    return response.json();
  }

  async sendMessage(chatId, content) {
    const response = await this.request(`/chat/${chatId}/message`, {
      method: 'POST',
      body: JSON.stringify({ content })
    });
    return response.json();
  }

  async deleteChat(chatId) {
    const response = await this.request(`/chat/${chatId}`, { method: 'DELETE' });
    return response.json();
  }

  async toggleStar(chatId) {
    const response = await this.request(`/chat/${chatId}/star`, { method: 'PUT' });
    return response.json();
  }

  async updateTitle(chatId, title) {
    const response = await this.request(`/chat/${chatId}/title`, {
      method: 'PUT',
      body: JSON.stringify({ title })
    });
    return response.json();
  }
}