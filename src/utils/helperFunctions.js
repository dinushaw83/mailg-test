// Generate a consistent color based on the name
export const generateAvatarColor = (name) => {
  const colors = [
    "#f44336",
    "#e91e63",
    "#9c27b0",
    "#673ab7",
    "#3f51b5",
    "#2196f3",
    "#03a9f4",
    "#00bcd4",
    "#009688",
    "#4caf50",
    "#8bc34a",
    "#cddc39",
    "#ffeb3b",
    "#ffc107",
    "#ff9800",
    "#ff5722",
    "#795548",
    "#607d8b",
  ];

  // Handle undefined or null names
  if (!name || typeof name !== "string") {
    return colors[0];
  }

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

// Generate a random thread ID
export const generateThreadId = () => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000000000000000000);
  return `#thread-f:${timestamp}${random}`;
};

// Generate a random legacy thread ID
export const generateLegacyThreadId = () => {
  const chars = "0123456789abcdef";
  let result = "";
  for (let i = 0; i < 16; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Generate the next integer ID (highest existing ID + 1)
export const generateNextIntegerId = (arr) => {
  if (!arr || arr.length === 0) return 1;
  const maxId = Math.max(...arr.map((item) => item.id));
  return maxId + 1;
};
