import React, { useState, useEffect, useRef } from "react";
import "./KeyDemoOverlay.css";

const KeyDemoOverlay = ({
  isActive = true,
  duration = 2000,
  position = "top-right",
  className = "",
  onKeySequence = null,
}) => {
  const [keySequence, setKeySequence] = useState([]);
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef(null);
  const keyBufferRef = useRef([]);
  const lastKeyTimeRef = useRef(0);

  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (event) => {
      // Debug all key events
      console.log("Key event:", {
        key: event.key,
        code: event.code,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        altKey: event.altKey,
        shiftKey: event.shiftKey,
        target: event.target.tagName,
      });

      // Prevent default behavior for certain keys to avoid conflicts
      if (event.ctrlKey || event.metaKey || event.altKey) {
        console.log("Ignoring due to modifier keys");
        return;
      }

      // Filter out modifier keys and special keys we don't want to display
      const keysToIgnore = [
        "Shift",
        "Control",
        "Alt",
        "Meta",
        "CapsLock",
        "Tab",
        "Enter",
        "Escape",
        "Backspace",
        "Delete",
        "ArrowUp",
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight",
        "Home",
        "End",
        "PageUp",
        "PageDown",
        "Insert",
        "F1",
        "F2",
        "F3",
        "F4",
        "F5",
        "F6",
        "F7",
        "F8",
        "F9",
        "F10",
        "F11",
        "F12",
      ];

      if (keysToIgnore.includes(event.key)) {
        console.log("Ignoring key:", event.key);
        return;
      }

      // Special debugging for a and s keys
      if (event.key === "a" || event.key === "s") {
        console.log("Special debug for a/s key:", {
          key: event.key,
          code: event.code,
          ctrlKey: event.ctrlKey,
          metaKey: event.metaKey,
          altKey: event.altKey,
          shiftKey: event.shiftKey,
          defaultPrevented: event.defaultPrevented,
          target: event.target.tagName,
          targetId: event.target.id,
          targetClass: event.target.className,
        });
      }

      const currentTime = Date.now();

      // Get the actual character pressed, handling special characters
      let key = event.key;

      // Handle different types of keys
      if (event.key.length === 1) {
        // Single character key
        if (event.shiftKey) {
          // Special character that requires Shift (like *, !, @, etc.)
          key = event.key;
        } else {
          // Regular character, convert to lowercase
          key = event.key.toLowerCase();
        }
      } else {
        // Multi-character keys (like ArrowUp, etc.) - we already filtered these out above
        return;
      }

      // Reset buffer if more than 1 second has passed since last key
      if (currentTime - lastKeyTimeRef.current > 1000) {
        keyBufferRef.current = [];
      }

      keyBufferRef.current.push(key);
      lastKeyTimeRef.current = currentTime;

      // Update the display
      setKeySequence([...keyBufferRef.current]);
      setIsVisible(true);

      // Debug logging
      console.log("Key captured:", key, "Buffer:", keyBufferRef.current);

      // Call the callback if provided
      if (onKeySequence) {
        onKeySequence(keyBufferRef.current);
      }

      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Set new timeout to hide the overlay
      timeoutRef.current = setTimeout(() => {
        setIsVisible(false);
        // Clear the buffer after a longer delay
        setTimeout(() => {
          keyBufferRef.current = [];
          setKeySequence([]);
        }, 500);
      }, duration);
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isActive, duration, onKeySequence]);

  if (!isVisible || keySequence.length === 0) {
    return null;
  }

  const getPositionClass = () => {
    switch (position) {
      case "top-left":
        return "key-demo-overlay--top-left";
      case "top-center":
        return "key-demo-overlay--top-center";
      case "top-right":
        return "key-demo-overlay--top-right";
      case "bottom-left":
        return "key-demo-overlay--bottom-left";
      case "bottom-center":
        return "key-demo-overlay--bottom-center";
      case "bottom-right":
        return "key-demo-overlay--bottom-right";
      case "center":
        return "key-demo-overlay--center";
      default:
        return "key-demo-overlay--top-right";
    }
  };

  return (
    <div className={`key-demo-overlay ${getPositionClass()} ${className}`}>
      <div className="key-demo-overlay__content">
        {keySequence.map((key, index) => (
          <React.Fragment key={index}>
            <span className="key-demo-overlay__key">{key}</span>
            {index < keySequence.length - 1 && <span className="key-demo-overlay__separator">&gt;</span>}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default KeyDemoOverlay;
