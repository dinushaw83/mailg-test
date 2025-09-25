import React from "react";
import LeftSidebar from "./LeftSidebar";
import Header from "./Header";
import RightSidebar from "./RightSidebar";
import styled from "@emotion/styled";

import { useGlobalContext } from "../contexts/GlobalContext";

const ContentContainer = styled.div`
  background-color: transparent;
  position: relative;
  display: flex;
`;

const Layout = ({ children }) => {
  const { isLeftSidebarExpanded } = useGlobalContext();

  return (
    <div className="tVu25">
      <div tabIndex={0} />
      <div className="nH">
        <div className="nH" style={{ position: "relative" }}>
          <Header />
          <ContentContainer id="content-container">
            <LeftSidebar />
            {!isLeftSidebarExpanded && <div style={{ width: "72px" }} />}
            {children}
            <RightSidebar />
          </ContentContainer>
        </div>
      </div>
    </div>
  );
};

export default Layout;
