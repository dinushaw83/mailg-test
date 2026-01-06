import { useNotificationContext } from "../hooks/useNotificationContext";

// For backward compatibility
export { useNotificationContext };

export const NotificationProvider = ({ children }) => children;
const NotificationContext = {
  // Empty context object for safety
};

export default NotificationContext;
