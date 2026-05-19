import React, { useState, useEffect } from 'react';
import './InstallPrompt.css';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem('maktaba_install_dismissed') === '1'
  );

  useEffect(() => {
    if (dismissed) return;
    function handler(e) {
      e.preventDefault();
      setDeferredPrompt(e);
      setShow(true);
    }
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, [dismissed]);

  async function handleInstall() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setShow(false);
    if (outcome === 'dismissed') {
      localStorage.setItem('maktaba_install_dismissed', '1');
      setDismissed(true);
    }
  }

  function handleDismiss() {
    setShow(false);
    localStorage.setItem('maktaba_install_dismissed', '1');
    setDismissed(true);
  }

  if (!show) return null;

  return (
    <div className="install-prompt">
      <div className="install-prompt-icon">📚</div>
      <div className="install-prompt-text">
        <strong>Install Maktaba</strong>
        <span>Add to your home screen for offline access</span>
      </div>
      <div className="install-prompt-actions">
        <button className="btn btn-gold btn-sm" onClick={handleInstall}>Install</button>
        <button className="install-dismiss" onClick={handleDismiss} aria-label="Dismiss">✕</button>
      </div>
    </div>
  );
}
