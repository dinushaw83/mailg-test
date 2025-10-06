import React from "react";
import { useLocation } from "react-router-dom";
import LeftSidebar from "./LeftSidebar";
import Header from "./Header";
import RightSidebar from "./RightSidebar";
import VacationResponderBar from "./VacationResponderBar";
import styled from "@emotion/styled";
import ContactsHeader from "./ContactsHeader";
import ContactsLeftSidebar from "./ContactsLeftSidebar";

import { useGlobalContext } from "../contexts/GlobalContext";

const ContentContainer = styled.div`
  background-color: transparent;
  position: relative;
  display: flex;
`;

const Layout = ({ children }) => {
  const location = useLocation();
  const { isLeftSidebarExpanded, rightSidebarExpanded, rightSidebarActiveTab } = useGlobalContext();
  const isContactsPage = location.pathname.startsWith("/contacts");

  // Calculate the empty div width when left sidebar is collapsed
  const calculateEmptyDivWidth = () => {
    if (!isLeftSidebarExpanded) {
      if (rightSidebarExpanded && rightSidebarActiveTab.activeTab) {
        return "114px";
      } else if (rightSidebarExpanded && !rightSidebarActiveTab.activeTab) {
        return "92px";
      } else {
        return "90px";
      }
    } else {
      return 0;
    }
  };

  return (
    <div className="tVu25">
      <div tabIndex={0} />
      <div className="nH">
        <div className="nH" style={{ position: "relative" }}>
          {!isContactsPage && <VacationResponderBar />}
          {isContactsPage ? <ContactsHeader /> : <Header />}
          <ContentContainer id="content-container">
            {isContactsPage ? <ContactsLeftSidebar /> : <LeftSidebar />}
            {!isLeftSidebarExpanded && !isContactsPage && <div style={{ width: calculateEmptyDivWidth() }} />}
            {children}
            {!isContactsPage && <RightSidebar />}
          </ContentContainer>
        </div>
      </div>
    </div>
  );
};

export default Layout;
