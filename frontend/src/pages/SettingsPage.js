import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import './SettingsPage.css';

const API = '';

export default function SettingsPage() {
  const { user, login } = useAuth();

  const [username, setUsername] = useState(user?.username || '');
  const [usernameSuccess, setUsernameSuccess] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [usernameLoading, setUsernameLoading] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  async function handleUsernameSubmit(e) {
    e.preventDefault();
    if (!username.trim()) return setUsernameError('Username cannot be empty');
    if (username === user.username) return setUsernameError('That is already your username');
    setUsernameError('');
    setUsernameSuccess('');
    setUsernameLoading(true);
    try {
      const res = await axios.put(`${API}/api/auth/settings`, { username });
      login(res.data.token, res.data.user);
      setUsernameSuccess('Username updated successfully');
    } catch (err) {
      setUsernameError(err.response?.data?.error || 'Failed to update username');
    } finally {
      setUsernameLoading(false);
    }
  }

  async function handlePasswordSubmit(e) {
    e.preventDefault();
    if (!currentPassword) return setPasswordError('Please enter your current password');
    if (!newPassword) return setPasswordError('Please enter a new password');
    if (newPassword.length < 6) return setPasswordError('New password must be at least 6 characters');
    if (newPassword !== confirmPassword) return setPasswordError('New passwords do not match');
    setPasswordError('');
    setPasswordSuccess('');
    setPasswordLoading(true);
    try {
      await axios.put(`${API}/api/auth/settings`, {
        current_password: currentPassword,
        new_password: newPassword
      });
      setPasswordSuccess('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordError(err.response?.data?.error || 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  }

  return (
    <div className="container settings-page">
      <div className="page-header">
        <h1>Settings</h1>
      </div>

      {/* Account Info */}
      <div className="settings-card card">
        <h2>Account Info</h2>
        <div className="info-row">
          <span className="info-label">Email</span>
          <span className="info-value">{user?.email}</span>
        </div>
        <div className="info-row">
          <span className="info-label">Username</span>
          <span className="info-value">{user?.username}</span>
        </div>
        <div className="info-row">
          <span className="info-label">Password</span>
          <span className="info-value">••••••••</span>
        </div>
      </div>

      {/* Change Username */}
      <div className="settings-card card">
        <h2>Change Username</h2>
        {usernameSuccess && <div className="success-message">{usernameSuccess}</div>}
        {usernameError && <div className="error-message">{usernameError}</div>}
        <form onSubmit={handleUsernameSubmit}>
          <div className="form-group">
            <label>New Username</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Enter new username"
            />
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={usernameLoading}>
              {usernameLoading ? 'Saving...' : 'Update Username'}
            </button>
          </div>
        </form>
      </div>

      {/* Change Password */}
      <div className="settings-card card">
        <h2>Change Password</h2>
        {passwordSuccess && <div className="success-message">{passwordSuccess}</div>}
        {passwordError && <div className="error-message">{passwordError}</div>}
        <form onSubmit={handlePasswordSubmit}>
          <div className="form-group">
            <label>Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
            />
          </div>
          <div className="form-group">
            <label>New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="At least 6 characters"
            />
          </div>
          <div className="form-group">
            <label>Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Repeat new password"
            />
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={passwordLoading}>
              {passwordLoading ? 'Saving...' : 'Change Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
