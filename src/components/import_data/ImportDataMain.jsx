import React, { useState, useEffect, useRef } from "react";
import { Button } from "@mui/material";
import { useToast, Notification } from "../../hooks/useToast";
import apiClient from "../../services/apiClient";
import "./ImportDataMain.css";

// Import modular components
import ImportForm from "./components/ImportForm";
import ImportHistory from "./components/ImportHistory";
import ImportStatusWidget from "./components/ImportStatusWidget";
import { SuccessModal, ErrorModal } from "./components/ImportModals";

const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export default function ImportDataMain() {
  const { addToast } = useToast();
  const processingToastCloseRef = useRef(null);

  // Form state
  const [selectedFile, setSelectedFile] = useState(null);
  const [tableName, setTableName] = useState("");
  const [validationError, setValidationError] = useState("");
  const [recloneCurrentRun, setRecloneCurrentRun] = useState(true); // Default to checked

  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Import tracking
  const [activeImports, setActiveImports] = useState([]);
  const [importStatuses, setImportStatuses] = useState({});

  // Modal state
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [successDetails, setSuccessDetails] = useState(null);
  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const [errorDetails, setErrorDetails] = useState({});
  const [isCancelling, setIsCancelling] = useState(false);

  // Database reset state
  const [isResettingDb, setIsResettingDb] = useState(false);

  // View state
  const [showHistory, setShowHistory] = useState(false);

  // Set document title
  useEffect(() => {
    document.title = `Import Data - MailG`;
  });

  // Poll for active import status
  useEffect(() => {
    if (activeImports.length === 0) return;

    const pollInterval = setInterval(async () => {
      for (const importInfo of activeImports) {
        try {
          const response = await apiClient.get(
            `/v1/import-data?import_id=${importInfo.import_id}&filename=${encodeURIComponent(importInfo.filename)}`
          );
          // Backend wraps response in { success, data: { ... } } format
          const statusData = response.data.data || response.data;

          setImportStatuses((prev) => ({
            ...prev,
            [importInfo.import_id]: statusData,
          }));

          // If completed, remove from active imports and show notification
          if (statusData.status === "success" || statusData.status === "failure" || statusData.status === "cancelled") {
            setActiveImports((prev) => prev.filter((info) => info.import_id !== importInfo.import_id));

            // Dismiss processing toast
            if (processingToastCloseRef.current) {
              processingToastCloseRef.current();
              processingToastCloseRef.current = null;
            }

            // Show result notification
            if (statusData.status === "success") {
              const successInfo = {
                filename: statusData.filename,
                total_records: statusData.total_records,
                file_type: statusData.file_type,
                table_results: statusData.table_results || null,
                started_at: statusData.started_at,
                finished_at: statusData.finished_at,
              };

              addToast(
                ({ close }) => (
                  <Notification type="success">
                    Import of {statusData.filename} completed successfully.{" "}
                    <button
                      onClick={() => {
                        setSuccessDetails(successInfo);
                        setSuccessModalOpen(true);
                        close();
                      }}
                      style={{
                        color: "inherit",
                        textDecoration: "underline",
                        background: "none",
                        border: "none",
                        padding: 0,
                        cursor: "pointer",
                        fontWeight: 600,
                      }}
                    >
                      View details
                    </button>
                    <Notification.Close onClick={close} aria-label="Close toast" />
                  </Notification>
                ),
                { placement: "top-end", autoDismiss: false }
              );
            } else if (statusData.status === "failure") {
              const errorInfo = {
                filename: statusData.filename,
                message: statusData.message || "Unknown error occurred during import",
              };

              addToast(
                ({ close }) => (
                  <Notification type="error">
                    Import of {statusData.filename} failed.{" "}
                    <button
                      onClick={() => {
                        setErrorDetails(errorInfo);
                        setErrorModalOpen(true);
                        close();
                      }}
                      style={{
                        color: "inherit",
                        textDecoration: "underline",
                        background: "none",
                        border: "none",
                        padding: 0,
                        cursor: "pointer",
                        fontWeight: 600,
                      }}
                    >
                      View details
                    </button>
                    <Notification.Close onClick={close} aria-label="Close toast" />
                  </Notification>
                ),
                { placement: "top-end", autoDismiss: false }
              );
            }
          }
        } catch (error) {
          console.error(`Error polling import status for ${importInfo.import_id}:`, error);
        }
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [activeImports, addToast]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    setValidationError("");

    if (file && file.size > MAX_FILE_SIZE_BYTES) {
      setValidationError(
        `File size (${(file.size / 1024 / 1024).toFixed(2)} MB) exceeds maximum allowed size of ${MAX_FILE_SIZE_MB} MB.`
      );
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file || null);

    // Auto-clear table name if ZIP file is selected
    if (file?.name.toLowerCase().endsWith(".zip")) {
      setTableName("");
    }
  };

  const handleTableNameChange = (e) => {
    setTableName(e.target.value);
    setValidationError("");
  };

  const handleRecloneChange = (e) => {
    setRecloneCurrentRun(e.target.checked);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedFile) {
      setValidationError("Please select a file to upload.");
      return;
    }

    const isZip = selectedFile.name.toLowerCase().endsWith(".zip");
    if (!isZip && !tableName) {
      setValidationError("Please select a table name for JSON/CSV files.");
      return;
    }

    setValidationError("");
    setIsSubmitting(true);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      if (tableName) {
        formData.append("table_name", tableName);
      }
      // Tell backend to reclone current session (backend gets run_id from JWT token)
      if (recloneCurrentRun) {
        formData.append("reclone_current_session", "true");
      }

      const response = await apiClient.post("/v1/import-data", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        },
      });

      setIsUploading(false);
      setUploadProgress(0);

      // Add to active imports tracking
      // Backend wraps response in { success, data: { ... } } format
      const responseData = response.data.data || response.data;
      const { import_id, filename } = responseData;
      setActiveImports((prev) => [...prev, { import_id, filename }]);

      // Reset form
      setSelectedFile(null);
      setTableName("");

      // Show background processing notification
      addToast(
        ({ close }) => {
          processingToastCloseRef.current = close;
          return (
            <Notification type="info">
              Import request submitted. Processing in background...
              <Notification.Close onClick={close} aria-label="Close toast" />
            </Notification>
          );
        },
        { placement: "top-end" }
      );
    } catch (error) {
      setIsUploading(false);
      setUploadProgress(0);

      const errorMessage = error?.response?.data?.detail || error?.message || "Failed to import data";
      setValidationError(errorMessage);

      const isConflict = error?.response?.status === 409;
      let activeImportId = null;
      let activeImportFilename = null;

      if (isConflict && errorMessage) {
        const idMatch = errorMessage.match(/ID:\s*([a-f0-9-]+)/i);
        const fileMatch = errorMessage.match(/file:\s*([^)]+)\)/i);
        if (idMatch) activeImportId = idMatch[1];
        if (fileMatch) activeImportFilename = fileMatch[1].trim();
      }

      const errorInfo = {
        filename: selectedFile?.name || "unknown",
        message: errorMessage,
        canCancel: isConflict,
        import_id: activeImportId,
        activeFilename: activeImportFilename,
      };

      addToast(
        ({ close }) => (
          <Notification type="error">
            Import of {selectedFile?.name || "file"} failed.{" "}
            <button
              onClick={() => {
                setErrorDetails(errorInfo);
                setErrorModalOpen(true);
                close();
              }}
              style={{
                color: "inherit",
                textDecoration: "underline",
                background: "none",
                border: "none",
                padding: 0,
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              View details
            </button>
            <Notification.Close onClick={close} aria-label="Close toast" />
          </Notification>
        ),
        { placement: "top-end", autoDismiss: false }
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelImport = async () => {
    if (!errorDetails.import_id || !errorDetails.activeFilename) return;

    setIsCancelling(true);
    try {
      await apiClient.delete(
        `/v1/import-data/cancel?import_id=${errorDetails.import_id}&filename=${encodeURIComponent(
          errorDetails.activeFilename
        )}`
      );

      setErrorModalOpen(false);

      addToast(
        ({ close }) => (
          <Notification type="success">
            Import cancelled successfully.
            <Notification.Close onClick={close} aria-label="Close toast" />
          </Notification>
        ),
        { placement: "top-end", autoDismiss: 5000 }
      );
    } catch (error) {
      console.error("Failed to cancel import:", error);
      addToast(
        ({ close }) => (
          <Notification type="error">
            Failed to cancel import: {error?.response?.data?.detail || error?.message}
            <Notification.Close onClick={close} aria-label="Close toast" />
          </Notification>
        ),
        { placement: "top-end", autoDismiss: 5000 }
      );
    } finally {
      setIsCancelling(false);
    }
  };

  const handleResetToOriginal = async () => {
    if (
      !window.confirm(
        "Are you sure you want to reset the database to its original state? This will restore all data from before any imports."
      )
    ) {
      return;
    }

    setIsResettingDb(true);
    try {
      const response = await apiClient.post("/v1/reset-seed-db/original");
      addToast(
        ({ close }) => (
          <Notification type="success">
            {response.data.message}
            {response.data.record_counts && (
              <div style={{ fontSize: "12px", marginTop: "4px" }}>
                {Object.entries(response.data.record_counts).map(([table, count]) => (
                  <div key={table}>
                    {table}: {count} records
                  </div>
                ))}
              </div>
            )}
            <Notification.Close onClick={close} aria-label="Close toast" />
          </Notification>
        ),
        { placement: "top-end", autoDismiss: 10000 }
      );
    } catch (error) {
      console.error("Failed to reset database:", error);
      addToast(
        ({ close }) => (
          <Notification type="error">
            Failed to reset database: {error?.response?.data?.detail || error?.message}
            <Notification.Close onClick={close} aria-label="Close toast" />
          </Notification>
        ),
        { placement: "top-end", autoDismiss: 5000 }
      );
    } finally {
      setIsResettingDb(false);
    }
  };

  const handleResetToEmpty = async () => {
    if (
      !window.confirm(
        "Are you sure you want to empty the database? This will remove ALL data from all tables. This action cannot be undone."
      )
    ) {
      return;
    }

    setIsResettingDb(true);
    try {
      const response = await apiClient.post("/v1/reset-seed-db/empty");
      addToast(
        ({ close }) => (
          <Notification type="success">
            {response.data.message}
            <Notification.Close onClick={close} aria-label="Close toast" />
          </Notification>
        ),
        { placement: "top-end", autoDismiss: 5000 }
      );
    } catch (error) {
      console.error("Failed to reset database:", error);
      addToast(
        ({ close }) => (
          <Notification type="error">
            Failed to reset database: {error?.response?.data?.detail || error?.message}
            <Notification.Close onClick={close} aria-label="Close toast" />
          </Notification>
        ),
        { placement: "top-end", autoDismiss: 5000 }
      );
    } finally {
      setIsResettingDb(false);
    }
  };

  return (
    <main id="main_panes" className="ember-view">
      <section className="ember-view main_panes flush_top ImportData">
        <div className="pane">
          <div className="sc-mhvwgh-0 lnjyUB">
            <main className="sc-1w9o8n1-0 gRdlsl import-data-main">
              {/* Header */}
              <div className="import-data-header">
                <div style={{ flex: 1 }}>
                  <h1 className="garden-title">Import Data</h1>
                  <div className="garden-subtitle">Upload data files to import into your database tables.</div>
                </div>
                <div style={{ display: "flex", gap: "12px" }}>
                  <Button variant="outlined" onClick={() => setShowHistory(!showHistory)} style={{ fontSize: "13px" }}>
                    {showHistory ? "Hide History" : "View History"}
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={handleResetToOriginal}
                    disabled={isResettingDb || activeImports.length > 0}
                    style={{ fontSize: "13px" }}
                  >
                    Reset to Original
                  </Button>
                </div>
              </div>

              {/* Active Imports Status */}
              <ImportStatusWidget activeImports={activeImports} />

              {/* Import History */}
              {showHistory && <ImportHistory />}

              {/* Import Form */}
              {!showHistory && (
                <ImportForm
                  selectedFile={selectedFile}
                  tableName={tableName}
                  validationError={validationError}
                  isUploading={isUploading}
                  isSubmitting={isSubmitting}
                  uploadProgress={uploadProgress}
                  onFileChange={handleFileChange}
                  onTableNameChange={handleTableNameChange}
                  onSubmit={handleSubmit}
                  recloneCurrentRun={recloneCurrentRun}
                  onRecloneChange={handleRecloneChange}
                />
              )}
            </main>
          </div>
        </div>
      </section>

      {/* Modals */}
      {successModalOpen && (
        <SuccessModal isOpen={successModalOpen} onClose={() => setSuccessModalOpen(false)} details={successDetails} />
      )}

      {errorModalOpen && (
        <ErrorModal
          isOpen={errorModalOpen}
          onClose={() => setErrorModalOpen(false)}
          details={errorDetails}
          onCancel={handleCancelImport}
          isCancelling={isCancelling}
        />
      )}
    </main>
  );
}
