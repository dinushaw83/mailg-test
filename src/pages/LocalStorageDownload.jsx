import React, { useEffect } from "react";

export default function LocalStorageDownload() {
  useEffect(() => {
    // Function to trigger the download
    const downloadLocalStorage = () => {
      // Collect localStorage data
      const snapshot = {};
      for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        if (key) {
          snapshot[key] = localStorage.getItem(key);
        }
      }

      // Create a Blob from the JSON string
      const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
        type: "application/json",
      });

      // Create a download URL
      const downloadUrl = URL.createObjectURL(blob);

      // Create an anchor element and simulate a click
      const anchor = document.createElement("a");
      anchor.href = downloadUrl;
      anchor.download = "localStorage.json";
      document.body.appendChild(anchor);

      // Use requestAnimationFrame to ensure headless browsers register the click
      requestAnimationFrame(() => {
        anchor.click();

        // Cleanup
        document.body.removeChild(anchor);
        URL.revokeObjectURL(downloadUrl);
      });
    };

    downloadLocalStorage();
  }, []);

  return (
    <div style={{ padding: "24px", fontFamily: "sans-serif" }}>
      <h1>Preparing download…</h1>
      <p>
        Collecting localStorage data and starting a download. You can close this
        tab once the download finishes.
      </p>
    </div>
  );
}
