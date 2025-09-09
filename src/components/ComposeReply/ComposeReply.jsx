import React, { useEffect, useState } from 'react';
import ActionButton from '../common/ActionButton';
import replyImage from "../../icons/reply.png";
import replyAllImage from "../../icons/replyall.png";
import forwardImage from "../../icons/forward.png";
import ReplyContainer from './ReplyContainer';

const ComposeReply = React.forwardRef(({ email, draft }, ref) => {
  React.useImperativeHandle(ref, () => ({
    handleReply
  }));
  const [showReplyContainer, setShowReplyContainer] = useState(Boolean(draft));
  const [replyType, setReplyType] = useState(null);
  const [currentDraftId, setCurrentDraftId] = useState(draft ? draft.id : null);

  useEffect(() => {
    setShowReplyContainer(Boolean(draft))
    setCurrentDraftId(draft ? draft.id : null);
  }, [draft]);

  const handleReply = () => {
    setReplyType('reply');
    setShowReplyContainer(true);
    setCurrentDraftId(null);
  };

  const handleReplyAll = () => {
    setReplyType('replyAll');
    setShowReplyContainer(true);
    setCurrentDraftId(null);
  };

  const handleForward = () => {
    setReplyType('forward');
    setShowReplyContainer(true);
    setCurrentDraftId(null);
  };

  return (
    <div data-testid="email-response-view" style={{ marginTop: '4rem', marginBottom: '2rem' }}>
      {
        !showReplyContainer && !draft &&
        <div style={{ marginLeft: '78px' }}>
          <ActionButton text="Reply" onClick={handleReply} icon={<img src={replyImage} alt="Reply" />} />
          <ActionButton text="Reply all" onClick={handleReplyAll} icon={<img src={replyAllImage} alt="Reply all" />} />
          <ActionButton text="Forward" onClick={handleForward} icon={<img src={forwardImage} alt="Forward" />} />
        </div>
      }
      {(showReplyContainer || !!draft) && (
        <ReplyContainer 
          email={email}
          draft={draft}
          replyType={draft ? (draft.replyType || 'reply') : replyType}
          currentDraftId={draft ? draft.id : currentDraftId}
          onClose={() => setShowReplyContainer(false)} 
          onUndoDelete={(restoredId) => {
            setCurrentDraftId(restoredId);
            setShowReplyContainer(true);
          }}
        />
      )}
    </div>
  );
});

export default React.memo(ComposeReply);