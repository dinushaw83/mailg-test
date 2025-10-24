import { useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useGlobalContext } from "../contexts/GlobalContext";
import { isValidEmail } from "../utils/helperFunctions";

export const useComposeModal = () => {
  const { composeWindows, setComposeWindows, emails, rightSidebarActiveTab, recipients } = useGlobalContext();
  const [visibleWindowCount, setVisibleWindowCount] = useState(3);
  const location = useLocation();
  const navigate = useNavigate();

  // Constants needed for the compose modal visible window count calculation
  const NORMAL_WINDOW_WIDTH = 550;
  const MINIMIZED_WINDOW_WIDTH = 350;
  // 70px left + (right sidebar active tab ? 390px : 70px) right
  const TOTAL_MARGINS = rightSidebarActiveTab.activeTab ? 460 : 140;
  const TOTAL_GAPS = 10; // 10px for gaps between windows

  // Calculate visible window count based on available space
  const getVisibleWindowCount = useCallback(
    (isResize = false) => {
      const windowWidth = window.innerWidth;
      const availableSpace = windowWidth - TOTAL_MARGINS - TOTAL_GAPS;

      if (composeWindows.length === 0) {
        setVisibleWindowCount(0);
        return 0;
      }

      // Ensure all windows have isMinimized property (default to false for new windows)
      const windowsWithDefaults = composeWindows.map((w) => ({
        ...w,
        isMinimized: w.isMinimized ?? false,
      }));

      let currentSpaceUsed = 0;
      let visibleCount = 0;

      // Start from the last window and work backwards to see how many fit
      for (let i = windowsWithDefaults.length - 1; i >= 0; i--) {
        const window = windowsWithDefaults[i];
        const windowWidth = window.isMinimized ? MINIMIZED_WINDOW_WIDTH : NORMAL_WINDOW_WIDTH;

        if (currentSpaceUsed + windowWidth <= availableSpace) {
          currentSpaceUsed += windowWidth;
          visibleCount++;
        } else {
          break;
        }
      }

      // If this is a resize and visible count is 1, try to minimize first normal window to show more
      // BUT only if there are multiple normal windows (don't minimize the only normal window)
      if (isResize && visibleCount === 1 && composeWindows.length > 1) {
        const normalWindows = windowsWithDefaults.filter((w) => !w.isMinimized);

        // Only proceed if there are multiple normal windows
        if (normalWindows.length > 1) {
          const firstNormalWindow = normalWindows[0]; // Get the first normal window

          // Check if minimizing the first normal window would allow more windows to be visible
          let testSpaceUsed = 0;
          let testVisibleCount = 0;

          // Start from the last window and work backwards with the first normal window minimized
          for (let i = windowsWithDefaults.length - 1; i >= 0; i--) {
            const window = windowsWithDefaults[i];
            let windowWidth = window.isMinimized ? MINIMIZED_WINDOW_WIDTH : NORMAL_WINDOW_WIDTH;

            // If this is the first normal window, treat it as minimized for this test
            if (window.id === firstNormalWindow.id) {
              windowWidth = MINIMIZED_WINDOW_WIDTH;
            }

            if (testSpaceUsed + windowWidth <= availableSpace) {
              testSpaceUsed += windowWidth;
              testVisibleCount++;
            } else {
              break;
            }
          }

          // If minimizing the first normal window allows more windows to be visible, do it
          if (testVisibleCount > visibleCount) {
            setComposeWindows((prev) =>
              prev.map((window) => (window.id === firstNormalWindow.id ? { ...window, isMinimized: true } : window))
            );

            setVisibleWindowCount(testVisibleCount);
            return testVisibleCount;
          }
        }
      }

      setVisibleWindowCount(visibleCount);
      return visibleCount;
    },
    [composeWindows, setComposeWindows, rightSidebarActiveTab.activeTab]
  );

  // Add new compose window with proper minimized state management
  const addNewComposeWindow = useCallback(
    (draftId = null, fields = {}) => {
      const windowWidth = window.innerWidth;
      const availableSpace = windowWidth - TOTAL_MARGINS - TOTAL_GAPS;

      // Calculate how many normal windows can fit
      const maxNormalWindows = Math.floor(availableSpace / NORMAL_WINDOW_WIDTH);
      const allowedNormalWindows = Math.min(maxNormalWindows, 2); // Max 2 normal windows

      // Get current windows (excluding the new one we're about to add)
      const currentWindows = composeWindows.map((w) => ({
        ...w,
        isMinimized: w.isMinimized ?? false,
      }));

      // Count current normal windows
      const currentNormalCount = currentWindows.filter((w) => !w.isMinimized).length;

      // Create new window
      const newWindow = {
        id: Date.now(),
        draftId: draftId || null,
        isMinimized: false,
        isMaximized: false,
        fields: fields || {},
      };

      // Check if we need to minimize any existing windows
      if (currentNormalCount >= allowedNormalWindows) {
        // We have too many normal windows, need to minimize the first one
        const windowsToUpdate = [];

        // Find the first normal window to minimize
        let foundFirst = false;
        for (let i = 0; i < currentWindows.length; i++) {
          const window = currentWindows[i];
          if (!window.isMinimized && !foundFirst) {
            windowsToUpdate.push({ id: window.id, isMinimized: true });
            foundFirst = true;
          }
        }

        // Add new window and update existing windows
        setComposeWindows((prev) => {
          const updatedWindows = prev.map((window) => {
            const update = windowsToUpdate.find((u) => u.id === window.id);
            if (update) {
              return { ...window, isMinimized: update.isMinimized };
            }
            return window;
          });

          return [...updatedWindows, newWindow];
        });
      } else {
        // We have space for the new normal window
        setComposeWindows((prev) => [...prev, newWindow]);
      }

      // Update URL with compose parameter
      const newSearchParams = new URLSearchParams(location.search);
      newSearchParams.set("compose", draftId ? draftId.toString() : "new");
      const newSearch = newSearchParams.toString();
      const newUrl = `${location.pathname}?${newSearch}`;
      navigate(newUrl);
    },
    [composeWindows, setComposeWindows, location, navigate]
  );

  // Remove compose window and update URL accordingly
  const removeComposeWindow = useCallback(
    (windowId) => {
      setComposeWindows((prev) => {
        const updatedWindows = prev.filter((window) => window.id !== windowId);

        // Update URL based on remaining windows
        if (updatedWindows.length === 0) {
          // No windows left, remove compose parameter
          const newSearchParams = new URLSearchParams(location.search);
          newSearchParams.delete("compose");
          const newSearch = newSearchParams.toString();
          const newUrl = `${location.pathname}${newSearch ? `?${newSearch}` : ""}`;
          navigate(newUrl, { replace: true });
        } else {
          // Windows remaining, set compose parameter to the last window
          const lastWindow = updatedWindows[updatedWindows.length - 1];
          const newSearchParams = new URLSearchParams(location.search);
          newSearchParams.set("compose", lastWindow.draftId ? lastWindow.draftId : "new");
          const newSearch = newSearchParams.toString();
          const newUrl = `${location.pathname}?${newSearch}`;
          navigate(newUrl);
        }

        return updatedWindows;
      });
    },
    [setComposeWindows, location, navigate]
  );

  // Toggle minimize state with space management
  const toggleMinimize = useCallback(
    (windowId) => {
      setComposeWindows((prev) => {
        const browserWindowWidth = window.innerWidth;
        const availableSpace = browserWindowWidth - TOTAL_MARGINS - TOTAL_GAPS;

        // Find the current window
        const currentWindow = prev.find((w) => w.id === windowId);
        if (!currentWindow) return prev;

        const newMinimizedState = !currentWindow.isMinimized;

        // If minimizing, just set to true
        if (newMinimizedState) {
          return prev.map((w) => (w.id === windowId ? { ...w, isMinimized: true } : w));
        }

        // If restoring from minimized, check constraints
        const otherWindows = prev.filter((w) => w.id !== windowId);
        const currentNormalWindows = otherWindows.filter((w) => !w.isMinimized);

        // Check available space
        let currentSpaceUsed = 0;
        for (const otherWindow of otherWindows) {
          const isMinimized = otherWindow.isMinimized ?? false;
          const windowWidth = isMinimized ? MINIMIZED_WINDOW_WIDTH : NORMAL_WINDOW_WIDTH;
          currentSpaceUsed += windowWidth + 5; // 5px gap
        }

        // Add space for the window we're restoring (normal size)
        const totalSpaceNeeded = currentSpaceUsed + NORMAL_WINDOW_WIDTH + 5;

        // If more than 2 normal windows OR not enough space, minimize the first normal window
        if (currentNormalWindows.length >= 2 || totalSpaceNeeded > availableSpace) {
          const firstNormalWindow = otherWindows.find((w) => !w.isMinimized);
          if (firstNormalWindow) {
            // Update both the current window and the first normal window
            return prev.map((w) => {
              if (w.id === windowId) {
                return { ...w, isMinimized: false };
              }
              if (w.id === firstNormalWindow.id) {
                return { ...w, isMinimized: true };
              }
              return w;
            });
          }
        }

        // Enough space and within normal window limit, just restore the current window
        return prev.map((w) => (w.id === windowId ? { ...w, isMinimized: false } : w));
      });
    },
    [setComposeWindows]
  );

  // Toggle maximize state with space management
  const toggleMaximize = useCallback(
    (windowId) => {
      setComposeWindows((prev) => {
        const browserWindowWidth = window.innerWidth;
        const availableSpace = browserWindowWidth - TOTAL_MARGINS - TOTAL_GAPS;

        // Find the current window
        const currentWindow = prev.find((w) => w.id === windowId);
        if (!currentWindow) return prev;

        const newMaximizedState = !currentWindow.isMaximized;

        // If minimizing maximize, just set to false
        if (!newMaximizedState) {
          return prev.map((w) => (w.id === windowId ? { ...w, isMaximized: false } : w));
        }

        // If maximizing, also set minimize to false and check constraints
        const otherWindows = prev.filter((w) => w.id !== windowId);
        const currentNormalWindows = otherWindows.filter((w) => !w.isMinimized);

        // Check available space
        let currentSpaceUsed = 0;
        for (const otherWindow of otherWindows) {
          const isMinimized = otherWindow.isMinimized ?? false;
          const windowWidth = isMinimized ? MINIMIZED_WINDOW_WIDTH : NORMAL_WINDOW_WIDTH;
          currentSpaceUsed += windowWidth + 5; // 5px gap
        }

        // Add space for the current window (normal size since we're setting minimize to false)
        const totalSpaceNeeded = currentSpaceUsed + NORMAL_WINDOW_WIDTH + 5;

        // If more than 2 normal windows OR not enough space, minimize the first normal window
        if (currentNormalWindows.length >= 2 || totalSpaceNeeded > availableSpace) {
          const firstNormalWindow = otherWindows.find((w) => !w.isMinimized);
          if (firstNormalWindow) {
            // Update both the current window and the first normal window
            return prev.map((w) => {
              if (w.id === windowId) {
                return { ...w, isMaximized: true, isMinimized: false };
              }
              if (w.id === firstNormalWindow.id) {
                return { ...w, isMinimized: true };
              }
              return w;
            });
          }
        }

        // Enough space and within normal window limit, just maximize the current window
        return prev.map((w) => (w.id === windowId ? { ...w, isMaximized: true, isMinimized: false } : w));
      });
    },
    [setComposeWindows]
  );

  // Handle URL parameters and create compose windows accordingly
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const composeParam = searchParams.get("compose");

    // Early return if no compose parameter or composeWindows is not empty
    if (!composeParam || composeWindows.length > 0) {
      return;
    }

    // Handle URL parameters - we know composeParam exists and composeWindows is empty
    if (composeParam === "new") {
      // Check if to parameter is present in the url
      const toParam = searchParams.get("to");

      let contactObj = {};

      // If to param exists verify if it's a valid email
      if (toParam && isValidEmail(toParam)) {
        // Check if the contact is in the recipients array
        const contact = recipients.find((recipient) => recipient.emails.some((email) => email.value === toParam));

        // Create a contact object with the contact if it exists
        if (contact) {
          const { emails, ...rest } = contact;
          contactObj = { ...rest, email: toParam };
        } else {
          // Create a custom contact object with the email
          contactObj = {
            id: `custom-${toParam}`,
            name: toParam,
            email: toParam,
          };
        }
      }

      // Create a new compose window
      const newWindow = {
        id: Date.now(),
        draftId: null,
        isMinimized: false,
        isMaximized: false,
        fields: Object.keys(contactObj).length > 0 ? { to: [contactObj] } : {},
      };

      setComposeWindows([newWindow]);

      // Now remove the to parameter from the url
      const newSearchParams = new URLSearchParams(location.search);
      newSearchParams.delete("to");
      const newSearch = newSearchParams.toString();
      const newUrl = `${location.pathname}?${newSearch}`;
      navigate(newUrl);
    } else {
      // Check if the composeParam is a valid draft ID
      const draftEmails = emails.filter((email) => email.labels.includes("Drafts"));
      const validDraft = draftEmails.find((email) => email.id.toString() === composeParam);

      if (validDraft) {
        // Create a compose window with the draft ID
        const newWindow = {
          id: Date.now(),
          draftId: validDraft.id,
          isMinimized: false,
          isMaximized: false,
          fields: {},
        };
        setComposeWindows([newWindow]);
      } else {
        // Invalid draft ID, replace URL with compose=new
        const newSearchParams = new URLSearchParams(location.search);
        newSearchParams.set("compose", "new");
        const newSearch = newSearchParams.toString();
        const newUrl = `${location.pathname}?${newSearch}`;
        navigate(newUrl);
      }
    }
  }, [location.search]);

  // Calculate visible window count on mount and window resize
  useEffect(() => {
    getVisibleWindowCount();

    // Add window resize listener
    const handleResize = () => getVisibleWindowCount(true);
    window.addEventListener("resize", handleResize);

    // Cleanup listener on unmount
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [getVisibleWindowCount]);

  return {
    composeWindows,
    visibleWindowCount,
    getVisibleWindowCount,
    addNewComposeWindow,
    removeComposeWindow,
    toggleMinimize,
    toggleMaximize,
  };
};
