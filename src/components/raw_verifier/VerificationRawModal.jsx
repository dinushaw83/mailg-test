import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  CircularProgress,
  IconButton,
  Paper,
} from '@mui/material';
import {
  ExpandMore,
  CheckCircle,
  Cancel,
  PlayArrow,
  Clear,
  ChevronLeft,
  ChevronRight,
  AccessTime,
} from '@mui/icons-material';
import { RDT_OPERATORS } from '../../lib/utils/assertion-operators';
import DiffViewer from '../ui/DiffViewer';
import { getActualState } from '../../services/verificationApi';

const VerificationRawModal = ({
  isOpen,
  onClose,
  promptId,
  prompt,
  assertions: initialAssertions,
  onNavigate,
  hasPrevious = false,
  hasNext = false,
  currentIndex = 0,
  totalCount = 0,
}) => {
  const [assertions, setAssertions] = useState([]);
  const [expandedAssertions, setExpandedAssertions] = useState(new Set());
  const [isRunning, setIsRunning] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);
  const [executionLog, setExecutionLog] = useState([]);
  const [assertionStatuses, setAssertionStatuses] = useState({});
  const [modelResponses, setModelResponses] = useState({});
  const [modelResponsesErrors, setModelResponsesErrors] = useState({});
  const executionLogRef = useRef(null);

  const requiresModelResponse = (operator) => {
    return RDT_OPERATORS.includes(operator);
  };

  useEffect(() => {
    if (isOpen && initialAssertions) {
      setAssertions(
        initialAssertions.map(assertion => ({
          ...assertion,
          status: 'pending',
        }))
      );
      setExpandedAssertions(new Set());
      setCompletedCount(0);
      setExecutionLog([]);
      setModelResponses({});
      setModelResponsesErrors({});
      setAssertionStatuses({});
    }
  }, [isOpen, initialAssertions]);

  useEffect(() => {
    if (executionLogRef.current) {
      executionLogRef.current.scrollTop = executionLogRef.current.scrollHeight;
    }
  }, [executionLog]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!isOpen) return;
      if (event.key === 'ArrowLeft' && hasPrevious) {
        event.preventDefault();
        onNavigate?.('prev');
      } else if (event.key === 'ArrowRight' && hasNext) {
        event.preventDefault();
        onNavigate?.('next');
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, hasPrevious, hasNext, onNavigate]);

  const addLogEntry = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString('en-US', {
      hour12: true,
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
    });
    setExecutionLog(prev => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
        timestamp: `[${timestamp}]`,
        message,
        type,
      },
    ]);
  };

  const toggleAssertionExpansion = (assertionIndex) => {
    setExpandedAssertions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(assertionIndex)) {
        newSet.delete(assertionIndex);
      } else {
        newSet.add(assertionIndex);
      }
      return newSet;
    });
  };

  const runAssertion = async (assertionIndex) => {
    const assertion = assertions[assertionIndex];
    if (!assertion) return;

    if (requiresModelResponse(assertion.operator) && !modelResponses[assertionIndex]) {
      setModelResponsesErrors(prev => ({
        ...prev,
        [assertionIndex]: 'Please enter a model response for this assertion.',
      }));
      setExpandedAssertions(prev => new Set([...prev, assertionIndex]));
      return;
    }

    addLogEntry(`Starting assertion: ${assertion.title || `Assertion ${assertionIndex + 1}`}`);

    setAssertions(prev =>
      prev.map((a, index) => (index === assertionIndex ? { ...a, status: 'running' } : a))
    );

    try {
      // Capture current localStorage data
      const localStorageData = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          localStorageData[key] = localStorage.getItem(key);
        }
      }

      // Call client-side API
      const result = await getActualState(
        promptId,
        localStorageData,
        JSON.stringify(assertion),
        modelResponses[assertionIndex] || null
      );

      // Update assertion with the result
      setAssertions(prev =>
        prev.map((a, index) =>
          index === assertionIndex
            ? {
                ...a,
                status: result.result === 'pass' ? 'passed' : 'failed',
                actual: result.actual,
                error: result.error,
                executionTime: result.executionTime,
                score: result.score,
                details: result.details,
              }
            : a
        )
      );

      setAssertionStatuses(prev => ({
        ...prev,
        [assertionIndex]: result.result === 'pass' ? 'passed' : 'failed',
      }));

      if (result.result === 'pass') {
        addLogEntry(
          `Assertion ${assertionIndex + 1} PASSED: ${assertion.title || `Assertion ${assertionIndex + 1}`}`,
          'success'
        );
        addLogEntry(`Actual value: ${JSON.stringify(result.actual)}`);
        addLogEntry(`Expected value: ${JSON.stringify(result.expected)}`);
        if (result.executionTime) {
          addLogEntry(`Execution time: ${result.executionTime}ms`);
        }
      } else {
        addLogEntry(
          `Assertion ${assertionIndex + 1} FAILED: ${assertion.title || `Assertion ${assertionIndex + 1}`}`,
          'error'
        );
        if (result.error) {
          addLogEntry(`Error: ${result.error}`);
        }
        addLogEntry(`Actual value: ${JSON.stringify(result.actual)}`);
        addLogEntry(`Expected value: ${JSON.stringify(result.expected)}`);
        if (result.executionTime) {
          addLogEntry(`Execution time: ${result.executionTime}ms`);
        }
      }
      setCompletedCount(prev => prev + 1);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setAssertions(prev =>
        prev.map((a, index) =>
          index === assertionIndex
            ? {
                ...a,
                status: 'failed',
                error: errorMessage,
                executionTime: 0,
              }
            : a
        )
      );
      addLogEntry(
        `Assertion ${assertionIndex + 1} FAILED: ${assertion.title || `Assertion ${assertionIndex + 1}`}`,
        'error'
      );
      addLogEntry(`Error: ${errorMessage}`);
    }
  };

  const runAllAssertions = async () => {
    setIsRunning(true);
    setCompletedCount(0);
    addLogEntry(`Starting execution of ${assertions.length} assertions`);

    for (let i = 0; i < assertions.length; i++) {
      if (requiresModelResponse(assertions[i].operator) && !modelResponses[i]) {
        setModelResponsesErrors(prev => ({
          ...prev,
          [i]: 'Please enter a model response for this assertion.',
        }));
        setExpandedAssertions(prev => new Set([...prev, i]));
        setIsRunning(false);
        return;
      }
    }

    for (let i = 0; i < assertions.length; i++) {
      await runAssertion(i);
    }

    addLogEntry(`Execution completed. All assertions have been processed.`);
    setIsRunning(false);
  };

  const clearResults = () => {
    setAssertions(prev =>
      prev.map(a => ({
        ...a,
        status: 'pending',
        actual: undefined,
        error: undefined,
        executionTime: undefined,
        score: undefined,
        details: undefined,
      }))
    );
    setAssertionStatuses({});
    setModelResponses({});
    setModelResponsesErrors({});
    setCompletedCount(0);
    setExecutionLog([]);
    setTimeout(() => {
      addLogEntry('Results cleared');
    }, 0);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'passed':
        return <CheckCircle sx={{ color: 'success.main', fontSize: 20 }} />;
      case 'failed':
        return <Cancel sx={{ color: 'error.main', fontSize: 20 }} />;
      case 'running':
        return <CircularProgress size={20} />;
      default:
        return <AccessTime sx={{ color: 'text.disabled', fontSize: 20 }} />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'passed':
        return 'PASSED';
      case 'failed':
        return 'FAILED';
      case 'running':
        return 'RUNNING';
      default:
        return 'PENDING';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'passed':
        return 'success';
      case 'failed':
        return 'error';
      case 'running':
        return 'info';
      default:
        return 'default';
    }
  };

  const getTaskStatus = () => {
    const statusValues = Object.values(assertionStatuses);
    if (statusValues.length === 0) {
      return { status: 'pending', message: 'Ready to run', color: 'default' };
    }
    if (statusValues.length !== assertions.length) {
      return {
        status: 'partial',
        message: `${statusValues.length} / ${assertions.length} assertions running`,
        color: 'warning',
      };
    }
    if (statusValues.every(status => status === 'passed')) {
      return { status: 'passed', message: 'All assertions passed', color: 'success' };
    }
    const failedCount = statusValues.filter(status => status === 'failed').length;
    return {
      status: 'failed',
      message: `${failedCount} / ${assertions.length} assertions failed`,
      color: 'error',
    };
  };

  const taskStatus = getTaskStatus();

  if (!isOpen) return null;

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h6">Raw Verifier - {promptId}</Typography>
            {totalCount > 0 && (
              <Typography variant="caption" color="text.secondary">
                {currentIndex + 1} of {totalCount} tasks
              </Typography>
            )}
          </Box>
          <Chip label={taskStatus.message} color={taskStatus.color} size="small" />
        </Box>
      </DialogTitle>

      <DialogContent dividers sx={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* Prompt Section */}
        <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
          <Typography variant="subtitle2" gutterBottom fontWeight="bold">
            Prompt:
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {prompt}
          </Typography>
        </Paper>

        {/* Assertions Section */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {assertions.map((assertion, index) => {
            const isExpanded = expandedAssertions.has(index);
            const status = assertion.status || 'pending';
            const isRDT = requiresModelResponse(assertion.operator);

            return (
              <Accordion
                key={index}
                expanded={isExpanded}
                onChange={() => toggleAssertionExpansion(index)}
              >
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                    {getStatusIcon(status)}
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" fontWeight="medium">
                        {assertion.title || `Assertion ${index + 1}`}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {assertion.operator} {assertion.path && `• ${assertion.path}`}
                      </Typography>
                    </Box>
                    <Chip
                      label={getStatusText(status)}
                      color={getStatusColor(status)}
                      size="small"
                    />
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<PlayArrow />}
                      onClick={(e) => {
                        e.stopPropagation();
                        runAssertion(index);
                      }}
                      disabled={isRunning || status === 'running'}
                    >
                      Run
                    </Button>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {isRDT && (
                      <Box>
                        <TextField
                          fullWidth
                          multiline
                          rows={4}
                          label="Model Response"
                          value={modelResponses[index] || ''}
                          onChange={(e) => {
                            setModelResponses(prev => ({ ...prev, [index]: e.target.value }));
                            setModelResponsesErrors(prev => ({ ...prev, [index]: '' }));
                          }}
                          error={!!modelResponsesErrors[index]}
                          helperText={modelResponsesErrors[index]}
                          placeholder="Enter the model response for this RDT assertion..."
                        />
                      </Box>
                    )}

                    {/* Assertion Details */}
                    <Box>
                      <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                        Operator: {assertion.operator}
                      </Typography>
                      {assertion.path && (
                        <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                          Path: {assertion.path}
                        </Typography>
                      )}
                      {assertion.expected !== undefined && (
                        <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                          Expected: {JSON.stringify(assertion.expected)}
                        </Typography>
                      )}
                    </Box>

                    {/* Verification Result */}
                    {status !== 'pending' && status !== 'running' && (
                      <Box>
                        {isRDT && assertion.details ? (
                          <Box>
                            <Typography variant="subtitle2" gutterBottom>
                              Score: {assertion.score?.toFixed(2)} / 5.0
                            </Typography>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                              {assertion.details.rationale}
                            </Typography>
                            {Object.keys(assertion.details.criteria || {}).length > 0 && (
                              <Box sx={{ mt: 1 }}>
                                <Typography variant="caption" fontWeight="bold" display="block" gutterBottom>
                                  Criteria Scores:
                                </Typography>
                                {Object.entries(assertion.details.criteria).map(([key, value]) => (
                                  <Chip
                                    key={key}
                                    label={`${key}: ${value}`}
                                    size="small"
                                    sx={{ mr: 0.5, mb: 0.5 }}
                                  />
                                ))}
                              </Box>
                            )}
                          </Box>
                        ) : (
                          <DiffViewer
                            actual={assertion.actual}
                            expected={assertion.expected}
                            title={`Assertion ${index + 1} Result`}
                          />
                        )}
                        {assertion.error && (
                          <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                            Error: {assertion.error}
                          </Typography>
                        )}
                        {assertion.executionTime && (
                          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                            Execution time: {assertion.executionTime}ms
                          </Typography>
                        )}
                      </Box>
                    )}
                  </Box>
                </AccordionDetails>
              </Accordion>
            );
          })}
        </Box>

        {/* Execution Log */}
        <Paper sx={{ p: 2, bgcolor: 'grey.50', maxHeight: '200px', overflow: 'auto' }} ref={executionLogRef}>
          <Typography variant="subtitle2" gutterBottom fontWeight="bold">
            Execution Log:
          </Typography>
          {executionLog.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No log entries yet
            </Typography>
          ) : (
            <Box component="pre" sx={{ fontSize: '0.75rem', fontFamily: 'monospace', m: 0 }}>
              {executionLog.map(entry => (
                <Box
                  key={entry.id}
                  sx={{
                    color: entry.type === 'error' ? 'error.main' : entry.type === 'success' ? 'success.main' : 'text.primary',
                  }}
                >
                  {entry.timestamp} {entry.message}
                </Box>
              ))}
            </Box>
          )}
        </Paper>
      </DialogContent>

      <DialogActions>
        <Button onClick={clearResults} startIcon={<Clear />}>
          Clear Results
        </Button>
        <Box sx={{ flex: 1 }} />
        {hasPrevious && (
          <IconButton onClick={() => onNavigate?.('prev')}>
            <ChevronLeft />
          </IconButton>
        )}
        {hasNext && (
          <IconButton onClick={() => onNavigate?.('next')}>
            <ChevronRight />
          </IconButton>
        )}
        <Button
          onClick={runAllAssertions}
          variant="contained"
          startIcon={<PlayArrow />}
          disabled={isRunning}
        >
          Run All Assertions
        </Button>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default VerificationRawModal;

