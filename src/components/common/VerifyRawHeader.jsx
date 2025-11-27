import React from 'react';
import { Refresh, Download } from '@mui/icons-material';
import { Button, Box, Typography, Chip } from '@mui/material';

const VerifyRawHeader = ({
  title = "Declarative Raw Verifier",
  taskCount,
  loading = false,
  isFiltered = false,
  onClearResults,
  withDownload = false,
  onDownloadState,
  apiBaseUrl,
  headerLevel = 'primary',
  withSidebar = false
}) => {
  const handleClearResults = () => {
    if (onClearResults) {
      onClearResults();
    } else {
      // Default behavior: clear localStorage and reload
      if (typeof window !== 'undefined') {
        localStorage.clear();
        window.location.reload();
      }
    }
  };

  const handleDownloadState = () => {
    // If custom handler is provided, use it
    if (onDownloadState) {
      onDownloadState();
      return;
    }

    // Download localStorage as JSON
    if (typeof window !== 'undefined') {
      const localStorageData = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        try {
          localStorageData[key] = JSON.parse(localStorage.getItem(key));
        } catch (e) {
          localStorageData[key] = localStorage.getItem(key);
        }
      }
      
      const blob = new Blob([JSON.stringify(localStorageData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `localStorage-${new Date().toISOString()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <Box
      sx={{
        position: headerLevel === 'primary' ? 'fixed' : 'sticky',
        top: headerLevel === 'primary' ? 0 : 64,
        left: 0,
        right: 0,
        zIndex: headerLevel === 'primary' ? 50 : 40,
        bgcolor: 'background.paper',
        borderBottom: '1px solid',
        borderColor: 'divider',
        boxShadow: 1,
      }}
    >
      <Box sx={{ maxWidth: '1400px', mx: 'auto', px: { xs: 2, md: 3 }, py: { xs: 1, md: 2 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
          {/* Left Side - Title and Description */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: { xs: 0, md: 0.5 } }}>
              <Typography variant="h5" component="h1" sx={{ fontWeight: 'bold', color: 'text.primary' }}>
                {title}
              </Typography>
              {!loading && taskCount !== undefined && (
                <Chip
                  label={`${taskCount} ${taskCount === 1 ? 'task' : 'tasks'}`}
                  size="small"
                  color="primary"
                  sx={{ fontWeight: 'medium' }}
                />
              )}
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ display: { xs: 'none', md: 'block' } }}>
              Test and debug individual and full assertions with comprehensive verification tools
              {!loading && isFiltered && (
                <Chip
                  label="Filtered by TASK_IDS"
                  size="small"
                  sx={{ ml: 1, fontSize: '0.7rem' }}
                />
              )}
            </Typography>
          </Box>

          {/* Right Side - Action Buttons */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* Reset State Description Text - Hidden on smaller screens */}
            <Box sx={{ display: { xs: 'none', md: 'block' }, maxWidth: '320px', mr: 1 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', lineHeight: 1.2 }}>
                Reset states using <strong>Reset State</strong> button before starting new task.
                {withDownload && " The download button will download the localStorage."}
              </Typography>
            </Box>

            {/* Download localStorage Button */}
            {withDownload && (
              <Button
                onClick={handleDownloadState}
                variant="outlined"
                size="small"
                startIcon={<Download />}
                sx={{ minWidth: 'auto', px: 1.5 }}
                title="Download localStorage"
                aria-label="Download localStorage"
              >
                <Box sx={{ display: { xs: 'none', sm: 'inline' } }}>Download</Box>
              </Button>
            )}

            {/* Reset State Button */}
            <Button
              onClick={handleClearResults}
              variant="contained"
              color="error"
              size="small"
              startIcon={<Refresh />}
              sx={{ minWidth: 'auto' }}
              aria-label="Reset state"
            >
              Reset State
            </Button>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default VerifyRawHeader;

