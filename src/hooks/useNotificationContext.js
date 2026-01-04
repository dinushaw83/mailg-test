import { setNotificationSettings, setPermissionStatus } from '../store/slices/notificationSlice';
import { useDispatch, useSelector } from 'react-redux';

import { notificationManager } from '../utils/notifications';
import { useCallback } from 'react';

export const useNotificationContext = () => {
  const dispatch = useDispatch();
  const notification = useSelector(state => state.notification);

  const updateNotificationSettings = useCallback((val) => {
    if (typeof val === 'function') {
      const stateCopy = JSON.parse(JSON.stringify(notification.notificationSettings));
      dispatch(setNotificationSettings(val(stateCopy)));
    } else {
      dispatch(setNotificationSettings(val));
    }
  }, [dispatch, notification.notificationSettings]);

  const updatePermissionStatus = useCallback((val) => {
    if (typeof val === 'function') {
      const stateCopy = JSON.parse(JSON.stringify(notification.permissionStatus));
      dispatch(setPermissionStatus(val(stateCopy)));
    } else {
      dispatch(setPermissionStatus(val));
    }
  }, [dispatch, notification.permissionStatus]);

  const showNewMailNotification = async (subject, sender) => {
    const { notificationSettings } = notification;
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
    const { notificationSettings } = notification;
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
    const { notificationSettings } = notification;
    return await notificationManager.showDemoNotification(notificationSettings.sound);
  };

  return {
    notificationSettings: notification.notificationSettings,
    updateNotificationSettings,
    permissionStatus: notification.permissionStatus,
    updatePermissionStatus,
    showNewMailNotification,
    showImportantMailNotification,
    showDemoNotification,
  };
};

