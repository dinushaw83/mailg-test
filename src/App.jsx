import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { GlobalContextProvider } from "./contexts/GlobalContext";
import Layout from "./components/Layout";
import EmailDetails from "./pages/EmailDetails";
import MailView from "./pages/MailView";
import ComposeEmail from "./components/ComposeEmail/ComposeEmail";
import GlobalSnackbar from "./components/GlobalSnackbar";

import { initialUser } from "./contexts/fixtures/me";

function App() {
  useEffect(() => {
    document.title = `Inbox(2) - ${initialUser.email} - MailG`;
  }, []);

  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <GlobalContextProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<Navigate to="/inbox" replace />} />
            <Route path="/inbox/:threadId" element={<EmailDetails />} />
            <Route path="/:folder" element={<MailView />} />
            <Route path="/label/:label" element={<MailView />} />
            <Route path="*" element={<Navigate to="/inbox" replace />} />
          </Routes>

          {/* Compose Email */}
          <ComposeEmail />
        </Layout>

        {/* Global Snackbar */}
        <GlobalSnackbar />
      </GlobalContextProvider>
    </Router>
  );
}

export default App;
