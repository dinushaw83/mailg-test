/* eslint-disable */

import { useRef } from "react";

export const SyncScrollPane = ({
  leftTitle,
  rightTitle,
  leftContent,
  rightContent,
  compact = false,
}) => {
  const leftRef = useRef(null);
  const rightRef = useRef(null);
  const isScrolling = useRef(false);

  const handleScroll =
    (source) => (e) => {
      if (isScrolling.current) return;
      isScrolling.current = true;
      const target = source === "left" ? rightRef.current : leftRef.current;
      if (target) {
        target.scrollTop = e.currentTarget.scrollTop;
        target.scrollLeft = e.currentTarget.scrollLeft;
      }
      requestAnimationFrame(() => {
        isScrolling.current = false;
      });
    };

  return (
    <div className={`sync-scroll-pane ${compact ? "compact" : ""}`}>
      <div className="sync-pane">
        <h5>{leftTitle}</h5>
        <div
          ref={leftRef}
          className={`json-viewer-container ${compact ? "compact" : ""}`}
          onScroll={handleScroll("left")}
        >
          {leftContent}
        </div>
      </div>
      <div className="sync-pane">
        <h5>{rightTitle}</h5>
        <div
          ref={rightRef}
          className={`json-viewer-container ${compact ? "compact" : ""}`}
          onScroll={handleScroll("right")}
        >
          {rightContent}
        </div>
      </div>
    </div>
  );
};
