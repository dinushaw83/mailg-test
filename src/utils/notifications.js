// Notification utility for MailG
export class NotificationManager {
  constructor() {
    this.sounds = {
      0: null, // None
      1: "/sounds/welcome.mp3", // Welcome
      2: "/sounds/piggyback.mp3", // Piggyback
      3: "/sounds/tones.mp3", // Tones
      4: "/sounds/musicbox.mp3", // Music box
      5: "/sounds/sweet.mp3", // Sweet
      6: "/sounds/treasure.mp3", // Treasure
      7: "/sounds/calm.mp3", // Calm
      8: "/sounds/whistle.mp3", // Whistle
      9: "/sounds/tennis.mp3", // Tennis
      10: "/sounds/snappy.mp3", // Snappy
      11: "/sounds/shrinkray.mp3", // Shrink ray
      12: "/sounds/nudge.mp3", // Nudge
    };
    this.audioContext = null;
    this.setupAudioContext();
  }

  setupAudioContext() {
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch (error) {
      console.warn("Audio context not supported:", error);
    }
  }

  async requestPermission() {
    if (!("Notification" in window)) {
      console.warn("This browser does not support desktop notifications");
      return false;
    }

    if (Notification.permission === "granted") {
      return true;
    }

    if (Notification.permission !== "denied") {
      const permission = await Notification.requestPermission();
      return permission === "granted";
    }

    return false;
  }

  async playSound(soundId) {
    if (!soundId || soundId === "0" || !this.sounds[soundId]) return;

    try {
      // Create a simple beep sound as fallback since we don't have actual sound files
      if (this.audioContext) {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        // Different frequencies for different sounds
        const frequencies = {
          1: 800, // Welcome
          2: 600, // Piggyback
          3: 1000, // Tones
          4: 500, // Music box
          5: 900, // Sweet
          6: 700, // Treasure
          7: 400, // Calm
          8: 1200, // Whistle
          9: 800, // Tennis
          10: 1100, // Snappy
          11: 1300, // Shrink ray
          12: 650, // Nudge
        };

        oscillator.frequency.setValueAtTime(frequencies[soundId] || 800, this.audioContext.currentTime);
        oscillator.type = "sine";

        gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);

        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + 0.3);
      }
    } catch (error) {
      console.warn("Error playing notification sound:", error);
    }
  }

  async showNotification(title, options = {}, soundId = null) {
    const hasPermission = await this.requestPermission();

    if (!hasPermission) {
      console.warn("Notification permission denied");
      return null;
    }

    const defaultOptions = {
      icon: "/favicon.svg",
      badge: "/favicon.svg",
      tag: "mailg-notification",
      requireInteraction: false,
      ...options,
    };

    try {
      const notification = new Notification(title, defaultOptions);

      // Play sound if specified
      if (soundId) {
        await this.playSound(soundId);
      }

      // Auto-close after 5 seconds
      setTimeout(() => {
        notification.close();
      }, 5000);

      return notification;
    } catch (error) {
      console.error("Error showing notification:", error);
      return null;
    }
  }

  async showDemoNotification(soundId = "1") {
    return this.showNotification(
      "MailG Demo Notification",
      {
        body: "This is how notifications will appear when you receive new mail.",
        icon: "/favicon.svg",
        tag: "mailg-demo",
      },
      soundId
    );
  }

  async showNewMailNotification(subject, sender, soundId = "1") {
    return this.showNotification(
      `New mail from ${sender}`,
      {
        body: subject,
        icon: "/favicon.svg",
        tag: "mailg-new-mail",
      },
      soundId
    );
  }

  async showImportantMailNotification(subject, sender, soundId = "1") {
    return this.showNotification(
      `Important mail from ${sender}`,
      {
        body: subject,
        icon: "/favicon.svg",
        tag: "mailg-important-mail",
      },
      soundId
    );
  }
}

// Create a singleton instance
export const notificationManager = new NotificationManager();

// Helper function to get notification permission status
export const getNotificationPermission = () => {
  if (!("Notification" in window)) {
    return "not-supported";
  }
  return Notification.permission;
};

// Helper function to check if notifications are supported
export const isNotificationSupported = () => {
  return "Notification" in window;
};
