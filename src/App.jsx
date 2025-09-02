import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { GlobalContextProvider } from "./contexts/GlobalContext";
import Layout from "./components/Layout";
import Inbox from "./pages/Inbox";

import { initialState } from "./contexts/fixtures";

function App() {
  useEffect(() => {
    document.title = `Inbox(2) - ${initialState.user.email} - MailG`;
  }, []);

  return (
    <GlobalContextProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Inbox />} />
          </Routes>
        </Layout>
      </Router>
    </GlobalContextProvider>
  );
}

export default App;
