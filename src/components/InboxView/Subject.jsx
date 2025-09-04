import styled from "@emotion/styled";
import React from "react";
import { Icon } from "./ActionBar";

const StyledSubject = styled.h2`
  font-weight: 400;
  margin-left: 5rem; // profile image width
  margin-bottom: 0.5rem;
  font-size: 1.375rem;
`;

const SubjectContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.25rem;
`;

export const Subject = ({ email }) => {
  return (
    <SubjectContainer>
      <StyledSubject>{email.subject}</StyledSubject>
      <div>
        <Icon name="print" label="Print all" placement="top" />
        <Icon name="open_in_new" label="In new window" placement="top" />
      </div>
    </SubjectContainer>
  );
};
