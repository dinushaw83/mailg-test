import { useSelector, useDispatch } from 'react-redux';
import { setNotificationSettings, setPermissionStatus } from '../store/slices/notificationSlice';
import { notificationManager } from '../utils/notifications';

export const useNotificationContext = () => {
  const dispatch = useDispatch();
  const notification = useSelector(state => state.notification);

  const updateNotificationSettings = (newSettings) => {
    dispatch(setNotificationSettings(newSettings));
  };

  const updatePermissionStatus = (status) => {
    dispatch(setPermissionStatus(status));
  };

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

