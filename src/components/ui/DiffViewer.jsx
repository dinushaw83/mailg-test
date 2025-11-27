import React, { useState } from 'react';
import { createPatch } from 'diff';
import { parseDiff, Diff, Hunk, withSourceExpansion } from 'react-diff-view';
import 'react-diff-view/style/index.css';
import { Box, Typography, Chip, Collapse, IconButton } from '@mui/material';
import { ExpandMore, ExpandLess } from '@mui/icons-material';

// Component for expanding collapsed sections
const UnfoldCollapsed = ({ previousHunk, currentHunk, onClick }) => {
  const start = previousHunk ? previousHunk.oldStart + previousHunk.oldLines : 1;
  const end = currentHunk.oldStart - 1;

  if (start > end) {
    return null;
  }

  return (
    <tbody onClick={() => onClick(start, end + 1)} style={{ cursor: 'pointer', backgroundColor: '#f3f4f6' }}>
      <tr>
        <td colSpan={4} style={{ textAlign: 'center', padding: '8px', fontSize: '0.875rem', color: '#6b7280' }}>
          Expand lines {start} - {end}
        </td>
      </tr>
    </tbody>
  );
};

// Enhanced DiffView component
const EnhancedDiffView = withSourceExpansion()(({ hunks, onExpandRange }) => {
  const renderHunk = (children, hunk) => {
    const previousElement = children[children.length - 1];
    const decorationElement = (
      <UnfoldCollapsed
        key={"decoration-" + hunk.content}
        previousHunk={previousElement && previousElement.props.hunk}
        currentHunk={hunk}
        onClick={onExpandRange}
      />
    );
    children.push(decorationElement);

    const hunkElement = <Hunk key={"hunk-" + hunk.content} hunk={hunk} />;
    children.push(hunkElement);

    return children;
  };

  return (
    <Diff hunks={hunks} diffType="modify" viewType="split">
      {(hunks) => hunks.reduce(renderHunk, [])}
    </Diff>
  );
});

const DiffViewer = ({ 
  actual, 
  expected, 
  className,
  maxHeight = "500px",
  showLegend = true,
  title = "Comparison View",
  viewType = "split"
}) => {
  const [showRawJson, setShowRawJson] = useState(false);

  // Handle undefined/null values
  const expectedStr = expected !== undefined && expected !== null 
    ? JSON.stringify(expected, null, 2) 
    : '(not specified)';
  const actualStr = actual !== undefined && actual !== null 
    ? JSON.stringify(actual, null, 2) 
    : '(not specified)';
  
  let patch = createPatch('comparison', expectedStr, actualStr);
  if (!patch) {
    patch = '';
  } else {
    patch = patch.split('\n').slice(2).join('\n');
  }
  
  let diffFile;
  let hunks = [];
  
  try {
    const parsedDiff = parseDiff(patch);
    if (parsedDiff && Array.isArray(parsedDiff) && parsedDiff.length > 0 && parsedDiff[0]) {
      diffFile = parsedDiff[0];
      hunks = diffFile.hunks || [];
    }
  } catch (error) {
    console.warn('Failed to parse diff:', error);
  }

  const hasDifferences = hunks.length > 0;
  const maxHeightValue = maxHeight.replace('max-h-', '').replace('[', '').replace(']', '').replace('px', '') + 'px';

  return (
    <Box className={className} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="body2" fontWeight="medium" color="text.secondary">
          {title}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {showLegend && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: '0.75rem', color: 'text.secondary' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box sx={{ width: 12, height: 12, bgcolor: '#fee2e2', border: '1px solid #fecaca', borderRadius: '4px' }} />
                <span>Removed</span>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box sx={{ width: 12, height: 12, bgcolor: '#dcfce7', border: '1px solid #bbf7d0', borderRadius: '4px' }} />
                <span>Added</span>
              </Box>
            </Box>
          )}
          <Typography variant="caption" color="text.secondary">
            {hasDifferences ? `${hunks.length} change${hunks.length !== 1 ? 's' : ''}` : 'No differences'}
          </Typography>
        </Box>
      </Box>

      {/* Diff View */}
      <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
        {hasDifferences ? (
          <Box sx={{ overflow: 'auto', maxHeight: maxHeightValue }}>
            <EnhancedDiffView 
              hunks={hunks} 
              onExpandRange={() => {}} 
            />
          </Box>
        ) : (
          <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary', bgcolor: 'grey.50' }}>
            <Typography variant="h6" color="success.main" sx={{ mb: 1 }}>✓</Typography>
            <Typography variant="body2">No differences found</Typography>
            <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5, display: 'block' }}>
              Actual and expected values match perfectly
            </Typography>
          </Box>
        )}
      </Box>

      {/* Collapsible Raw JSON Comparison */}
      <Box>
        <Box
          onClick={() => setShowRawJson(!showRawJson)}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            cursor: 'pointer',
            py: 1,
            '&:hover': { bgcolor: 'action.hover' }
          }}
        >
          <IconButton size="small">
            {showRawJson ? <ExpandLess /> : <ExpandMore />}
          </IconButton>
          <Typography variant="body2" fontWeight="medium" color="text.secondary">
            Show raw JSON comparison
          </Typography>
        </Box>
        <Collapse in={showRawJson}>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mt: 1 }}>
            <Box>
              <Typography variant="caption" fontWeight="medium" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                Actual
              </Typography>
              <Box
                component="pre"
                sx={{
                  bgcolor: 'grey.50',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  p: 1.5,
                  fontSize: '0.75rem',
                  overflow: 'auto',
                  fontFamily: 'monospace',
                  maxHeight: '256px',
                  m: 0
                }}
              >
                {actualStr}
              </Box>
            </Box>
            <Box>
              <Typography variant="caption" fontWeight="medium" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                Expected
              </Typography>
              <Box
                component="pre"
                sx={{
                  bgcolor: 'grey.50',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  p: 1.5,
                  fontSize: '0.75rem',
                  overflow: 'auto',
                  fontFamily: 'monospace',
                  maxHeight: '256px',
                  m: 0
                }}
              >
                {expectedStr}
              </Box>
            </Box>
          </Box>
        </Collapse>
      </Box>
    </Box>
  );
};

export default DiffViewer;

