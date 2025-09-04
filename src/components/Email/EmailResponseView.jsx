import React, { useState } from 'react';
import ActionButton from '../common/ActionButton';
import replyImage from "../../icons/reply.png";
import replyAllImage from "../../icons/replyall.png";
import forwardImage from "../../icons/forward.png";
import ReplyContainer from './ReplyContainer';

const EmailResponseView = ({ email }) => {
  const [showReplyContainer, setShowReplyContainer] = useState(false);
  const [replyType, setReplyType] = useState(null);

  const handleReply = () => {
    setReplyType('reply');
    setShowReplyContainer(true);
  };

  const handleReplyAll = () => {
    setReplyType('replyAll');
    setShowReplyContainer(true);
  };

  const handleForward = () => {
    setReplyType('forward');
    setShowReplyContainer(true);
  };

  return (
    <div style={{ marginTop: '4rem', marginBottom: '2rem' }}>
      {
        !showReplyContainer &&
        <div style={{ marginLeft: '78px' }}>
          <ActionButton text="Reply" onClick={handleReply} icon={<img src={replyImage} alt="Reply" />} />
          <ActionButton text="Reply all" onClick={handleReplyAll} icon={<img src={replyAllImage} alt="Reply all" />} />
          <ActionButton text="Forward" onClick={handleForward} icon={<img src={forwardImage} alt="Forward" />} />
        </div>
      }
      {showReplyContainer && <ReplyContainer email={email} replyType={replyType} />}
    </div>
  );
};

export default EmailResponseView;