import React, { createContext, useContext, useState } from 'react';
import { usePersistedState } from '../hooks/usePersistedState';
import { notificationManager } from '../utils/notifications';

const NotificationContext = createContext();

export const useNotificationContext = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotificationContext must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  // Persisted notification settings
  const [notificationSettings, setNotificationSettings] = usePersistedState('mailg-notification-settings', {
    type: 'off', // 'off', 'new', 'important'
    sound: '1',  // Sound ID
    enabled: false
  });

  // Runtime permission status
  const [permissionStatus, setPermissionStatus] = useState('default');

  const updateNotificationSettings = (newSettings) => {
    setNotificationSettings(prev => ({
      ...prev,
      ...newSettings
    }));
  };

  const updatePermissionStatus = (status) => {
    setPermissionStatus(status);
  };

  // Helper function to show notification based on current settings
  const showNewMailNotification = async (subject, sender) => {
    if (notificationSettings.type === 'new' && notificationSettings.enabled) {
      return await notificationManager.showNewMailNotification(
        subject, 
        sender, 
        notificationSettings.sound
      );
    }
    return null;
  };

  const showImportantMailNotification = async (subject, sender) => {
    if ((notificationSettings.type === 'new' || notificationSettings.type === 'important') && notificationSettings.enabled) {
      return await notificationManager.showImportantMailNotification(
        subject, 
        sender, 
        notificationSettings.sound
      );
    }
    return null;
  };

  const showDemoNotification = async () => {
    return await notificationManager.showDemoNotification(notificationSettings.sound);
  };

  return (
    <NotificationContext.Provider
      value={{
        notificationSettings,
        updateNotificationSettings,
        permissionStatus,
        updatePermissionStatus,
        showNewMailNotification,
        showImportantMailNotification,
        showDemoNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationContext;
