import React from 'react';
import ActionButton from '../common/ActionButton';
import replyImage from "../../icons/reply.png";
import replyAllImage from "../../icons/replyall.png";
import forwardImage from "../../icons/forward.png";
import ReplySectionREFERENCE from './ReplySectionREF';
import ReplySection from './ReplySection';

const EmailResponseView = () => {
  const handleReply = () => {
    // TODO: Implement reply functionality
    console.log('Reply clicked');
  };

  const handleReplyAll = () => {
    // TODO: Implement reply all functionality
    console.log('Reply all clicked');
  };

  const handleForward = () => {
    // TODO: Implement forward functionality
    console.log('Forward clicked');
  };

  return (
    <div style={{ marginTop: '4rem', marginBottom: '2rem' }}>
      <div style={{ marginLeft: '78px' }}>
        <ActionButton text="Reply" onClick={handleReply} icon={<img src={replyImage} alt="Reply" />} />
        <ActionButton text="Reply all" onClick={handleReplyAll} icon={<img src={replyAllImage} alt="Reply all" />} />
        <ActionButton text="Forward" onClick={handleForward} icon={<img src={forwardImage} alt="Forward" />} />
      </div>
      {/* <ReplySectionREFERENCE /> */}
      <br />
      <ReplySection />
    </div>
  );
};

export default EmailResponseView;