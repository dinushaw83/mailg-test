// Email notification utilities
import { notificationManager } from './notifications';

// Get notification settings from localStorage
const getNotificationSettings = () => {
  try {
    const stored = localStorage.getItem('mailg-notification-settings');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.warn('Error reading notification settings:', error);
  }
  
  // Default settings
  return {
    type: 'off',
    sound: '1',
    enabled: false
  };
};

// Check if email should trigger notification based on current settings
const shouldNotify = (email, settings) => {
  if (!settings.enabled || settings.type === 'off') {
    return false;
  }

  // For "new" type, notify for all new emails in inbox
  if (settings.type === 'new') {
    return email.folder === 'inbox' && !email.read;
  }

  // For "important" type, only notify for important emails
  if (settings.type === 'important') {
    return email.folder === 'inbox' && !email.read && email.important;
  }

  return false;
};

// Show notification for new email
export const notifyNewEmail = async (email) => {
  const settings = getNotificationSettings();
  
  if (!shouldNotify(email, settings)) {
    return null;
  }

  const sender = email.from?.name || email.from?.email || 'Unknown sender';
  const subject = email.subject || 'No subject';

  if (settings.type === 'important' && email.important) {
    return await notificationManager.showImportantMailNotification(
      subject,
      sender,
      settings.sound
    );
  } else {
    return await notificationManager.showNewMailNotification(
      subject,
      sender,
      settings.sound
    );
  }
};

// Show notification for batch of new emails
export const notifyNewEmails = async (emails) => {
  const settings = getNotificationSettings();
  
  if (!settings.enabled || settings.type === 'off') {
    return;
  }

  const relevantEmails = emails.filter(email => shouldNotify(email, settings));
  
  if (relevantEmails.length === 0) {
    return;
  }

  if (relevantEmails.length === 1) {
    return await notifyNewEmail(relevantEmails[0]);
  }

  // For multiple emails, show a summary notification
  const importantCount = relevantEmails.filter(email => email.important).length;
  const totalCount = relevantEmails.length;
  
  let title = `${totalCount} new messages`;
  let body = '';
  
  if (settings.type === 'important' && importantCount > 0) {
    title = importantCount === 1 ? '1 new important message' : `${importantCount} new important messages`;
    body = relevantEmails
      .filter(email => email.important)
      .slice(0, 3)
      .map(email => `${email.from?.name || email.from?.email}: ${email.subject}`)
      .join('\n');
  } else {
    body = relevantEmails
      .slice(0, 3)
      .map(email => `${email.from?.name || email.from?.email}: ${email.subject}`)
      .join('\n');
    
    if (relevantEmails.length > 3) {
      body += `\n...and ${relevantEmails.length - 3} more`;
    }
  }

  return await notificationManager.showNotification(
    title,
    {
      body,
      icon: "/favicon.svg",
      tag: "mailg-batch-notification"
    },
    settings.sound
  );
};

// Test notification function (can be called from browser console)
export const testNotification = async () => {
  const testEmail = {
    id: 'test-email',
    from: { name: 'Test Sender', email: 'test@example.com' },
    subject: 'Test Email Notification',
    folder: 'inbox',
    read: false,
    important: false
  };

  return await notifyNewEmail(testEmail);
};

// Make test function available globally for debugging
if (typeof window !== 'undefined') {
  window.testMailGNotification = testNotification;
}
