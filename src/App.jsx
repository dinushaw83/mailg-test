import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { GlobalContextProvider } from "./contexts/GlobalContext";
import Layout from "./components/Layout";
import MailView from "./pages/MailView";

import { initialState } from "./contexts/fixtures";

function App() {
  useEffect(() => {
    document.title = `MailView(2) - ${initialState.user.email} - MailG`;
  }, []);

  return (
    <GlobalContextProvider>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Layout>
          <Routes>
            <Route path="/" element={<MailView />} />
            <Route path="/:folder" element={<MailView />} />
            <Route path="/label/:label" element={<MailView />} />
          </Routes>
        </Layout>
      </Router>
    </GlobalContextProvider>
  );
}

export default App;
