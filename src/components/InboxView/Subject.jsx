import styled from "@emotion/styled";
import React from "react";
import { Icon } from "./ActionBar";
import EmailLabelChips from "../Labels/EmailLabelChips";

const StyledSubject = styled.h2`
  font-weight: 400;
  margin-bottom: 0.1rem;
  font-size: 1.375rem;
`;

const SubjectContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.25rem;
`;

 const LeftSection = styled.div`
   display: flex;
   flex-wrap: wrap;
   flex: 1;
   min-width: 0;
   gap: 0.8rem;
   align-items: baseline;
   margin-left: 5rem;  // profile image width
 `;

const RightSection = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
`;

export const Subject = ({ subject, message }) => {
  return (
    <SubjectContainer>
      {/* Left side: subject + labels */}
      <LeftSection>
        <StyledSubject>{subject}</StyledSubject>
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
