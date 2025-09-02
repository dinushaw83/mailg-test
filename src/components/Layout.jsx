import React from "react";
import LeftSidebar from "./LeftSidebar";
import Header from "./Header";
import RightSidebar from "./RightSidebar";

const Layout = ({ children }) => {
  return (
    <div className="tVu25">
      <div tabIndex={0} />
      <div className="nH" style={{ width: 1920 }}>
        <div className="nH" style={{ position: "relative" }}>
          <Header />
          <div className="nH aqk aql bkL">
            <LeftSidebar />
            {children}
            <RightSidebar />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Layout;
