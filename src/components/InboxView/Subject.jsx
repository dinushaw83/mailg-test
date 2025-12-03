import styled from "@emotion/styled";
import React, { useCallback } from "react";
import { Icon } from "./ActionBar";
import EmailLabelChips from "../Labels/EmailLabelChips";
import useMailActions from "../../hooks/useMailActions";

const StyledSubject = styled.h2`
  font-weight: 400;
  margin: 0;
  font-size: 1.375rem;
  line-height: 1;
`;

const SubjectContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.25rem;
`;

const LeftSection = styled.div`
  display: flex;
  flex: 1;
  min-width: 0;
  gap: 0.4rem;
  align-items: center;
  margin-left: 5rem;
`;

const RightSection = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
  align-items: center;
`;

const ImportantMarker = styled.span`
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  
  .material-symbols-outlined {
    font-size: 22px;
    color: ${props => props.isImportant ? '#f4b400' : '#dadce0'};
    transition: color 0.15s ease;
    font-variation-settings: ${props => props.isImportant ? "'FILL' 1, 'wght' 400" : "'FILL' 0, 'wght' 500"};
  }
  
  &:hover .material-symbols-outlined {
    color: ${props => props.isImportant ? '#f4b400' : '#5f6368'};
  }
`;

export const Subject = ({ subject, message }) => {
  const { toggleImportant } = useMailActions();
  const isImportant = message?.important || false;

  const handleImportant = useCallback((e) => {
    e?.stopPropagation();
    if (message?.id) {
      toggleImportant([message.id]);
    }
  }, [message, toggleImportant]);

  return (
    <SubjectContainer>
      {/* Left side: subject + important marker + labels */}
      <LeftSection>
        <StyledSubject>{subject}</StyledSubject>
        <ImportantMarker 
          isImportant={isImportant} 
          onClick={handleImportant}
          title={isImportant ? "Click to mark as not important" : "Click to mark as important"}
        >
          <span className="material-symbols-outlined">
            label_important
          </span>
        </ImportantMarker>
        <EmailLabelChips onRemove={() => { }} message={message} />
      </LeftSection>

      {/* Right side: action icons */}
      <RightSection>
        <Icon name="print" label="Print all" placement="top" />
        <Icon name="open_in_new" label="In new window" placement="top" />
      </RightSection>
    </SubjectContainer>
  );
};
