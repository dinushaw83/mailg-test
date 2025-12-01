import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Card, CardContent, CircularProgress, Chip } from '@mui/material';
import { PlayArrow } from '@mui/icons-material';
import VerificationRawModal from './VerificationRawModal';
import VerifyRawHeader from '../common/VerifyRawHeader';
import { getExpectedState } from '../../services/verificationApi';

const VerificationRaw = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState(null);
  const [assertions, setAssertions] = useState({});
  const [loading, setLoading] = useState(true);

  // useEffect(() => {
  //   const fetchAssertions = async () => {
  //     try {
  //       const data = await getExpectedState();
  //       setAssertions(data.verifiers || {});
  //     } catch (error) {
  //       console.error('Error fetching assertions:', error);
  //     } finally {
  //       setLoading(false);
  //     }
  //   };

  //   fetchAssertions();
  // }, []);
  useEffect(() => {
    const fetchAssertions = async () => {
      try {
        const response = await fetch('/api/v1/get_expected_state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}) // No taskId = get all tasks
        })
        
        console.log('Fetched assertions:', response, response.ok)
        if (response.ok) {
          const data = await response.json()
          console.log('Fetched assertions:', data)
          setAssertions(data.verifiers || {})
        } else {
          console.error('Failed to fetch assertions:', response.statusText)
        }
      } catch (error) {
        console.error('Error fetching assertions:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchAssertions()
  }, [])

  useEffect(() => {
    document.title = "Raw Verifier - Mailg";
  }, []);

  // Get all prompt IDs in order
  const promptIds = Object.keys(assertions);
  const currentIndex = selectedPrompt ? promptIds.indexOf(selectedPrompt.promptId) : -1;

  const handleOpenVerifier = (promptId) => {
    console.log('Opening verifier for promptId:', promptId, assertions[promptId]);
    if (assertions[promptId]) {
      setSelectedPrompt({
        promptId,
        prompt: assertions[promptId].prompt,
        assertions: assertions[promptId].assertions,
      });
      setModalOpen(true);
    }
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedPrompt(null);
  };

  const handleNavigate = (direction) => {
    if (!selectedPrompt) return;
    
    const newIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex >= 0 && newIndex < promptIds.length) {
      const newPromptId = promptIds[newIndex];
      if (assertions[newPromptId]) {
        setSelectedPrompt({
          promptId: newPromptId,
          prompt: assertions[newPromptId].prompt,
          assertions: assertions[newPromptId].assertions,
        });
      }
    }
  };

  const downloadLocalStorage = () => {
    try {
      const localStorageData = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          localStorageData[key] = localStorage.getItem(key);
        }
      }
      
      const blob = new Blob([JSON.stringify(localStorageData, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `localStorage-${new Date().toISOString()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading localStorage:', error);
      alert('Error downloading localStorage: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const clearResults = () => {
    localStorage.clear();
    window.location.reload();
  };

  console.log('Assertions loaded:', assertions);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50' }}>
      {/* Header Component */}
      <VerifyRawHeader
        title="Declarative Raw Verifier"
        taskCount={promptIds.length}
        loading={loading}
        isFiltered={!loading && promptIds.length < 9}
        onClearResults={clearResults}
        withDownload={true}
        onDownloadState={downloadLocalStorage}
      />

      {/* Content Area */}
      <Box sx={{ pt: 20, pb: 4 }}>
        <Box sx={{ maxWidth: '1200px', mx: 'auto', px: 3 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <Typography variant="h4" gutterBottom sx={{ mb: 3, fontWeight: 'bold' }}>
                Available Tasks
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {promptIds.length === 0 ? (
                  <Typography variant="body1" color="text.secondary">
                    No tasks available
                  </Typography>
                ) : (
                  promptIds.map((promptId) => {
                    const task = assertions[promptId];
                    return (
                      <Card key={promptId} variant="outlined">
                        <CardContent>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2 }}>
                            <Box sx={{ flex: 1 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                <Typography variant="h6" component="h3">
                                  {promptId}
                                </Typography>
                                <Chip
                                  label={`${task.assertions?.length || 0} assertions`}
                                  size="small"
                                  color="primary"
                                  variant="outlined"
                                />
                              </Box>
                              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                {task.prompt}
                              </Typography>
                            </Box>
                            <Button
                              variant="contained"
                              startIcon={<PlayArrow />}
                              onClick={() => handleOpenVerifier(promptId)}
                            >
                              Open Verifier
                            </Button>
                          </Box>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </Box>
            </>
          )}
        </Box>
      </Box>

      {/* Modal */}
      {selectedPrompt && (
        <VerificationRawModal
          isOpen={modalOpen}
          onClose={handleCloseModal}
          promptId={selectedPrompt.promptId}
          prompt={selectedPrompt.prompt}
          assertions={selectedPrompt.assertions}
          onNavigate={handleNavigate}
          hasPrevious={currentIndex > 0}
          hasNext={currentIndex < promptIds.length - 1}
          currentIndex={currentIndex}
          totalCount={promptIds.length}
        />
      )}
    </Box>
  );
};

export default VerificationRaw;

