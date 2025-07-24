import { Injectable } from '@angular/core';
import { API_URL } from '../../constants/api';

function setCookie(name: string, value: string, days = 7) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = name + '=' + encodeURIComponent(value) + '; expires=' + expires + '; path=/';
}

function getCookie(name: string) {
  return document.cookie.split('; ').reduce((r, v) => {
    const parts = v.split('=');
    return parts[0] === name ? decodeURIComponent(parts[1]) : r;
  }, '');
}

function deleteCookie(name: string) {
  document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
}

@Injectable({
  providedIn: 'root'
})
export class Auth {
  backendUrl = API_URL;

  async login(username: string, password: string) {
    const res = await fetch(`${this.backendUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (res.ok && data.token) {
      setCookie('token', data.token);
      return data;
    } else {
      throw new Error(data.message || 'Login failed');
    }
  }

  async register(user: any) {
    const res = await fetch(`${this.backendUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user)
    });
    const data = await res.json();
    if (res.ok) {
      return data;
    } else {
      throw new Error(data.message || 'Registration failed');
    }
  }

  logout() {
    deleteCookie('token');
  }

  isAuthenticated() {
    return !!getCookie('token');
  }

  getToken() {
    return getCookie('token');
  }
}
