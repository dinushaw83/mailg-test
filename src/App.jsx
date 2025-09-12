import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { GlobalContextProvider } from "./contexts/GlobalContext";
import Layout from "./components/Layout";
import EmailDetails from "./pages/EmailDetails";
import MailView from "./pages/MailView";
import ComposeEmailWrapper from "./components/ComposeEmail/ComposeEmailWrapper";
import GlobalSnackbar from "./components/GlobalSnackbar";
import VerificationDashboard from "./pages/VerificationDashboard";

import { initialUser } from "./contexts/fixtures/me";

function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <GlobalContextProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<Navigate to="/inbox" replace />} />
            <Route path="/inbox/:threadId" element={<EmailDetails />} />
            <Route path="/sent/:threadId" element={<EmailDetails />} />
            <Route path="/:folder" element={<MailView />} />
            <Route path="/label/:label" element={<MailView />} />
            <Route path="/verify" element={<VerificationDashboard />} />
            <Route path="*" element={<Navigate to="/inbox" replace />} />
          </Routes>

          {/* Compose Email Wrapper */}
          <ComposeEmailWrapper />
        </Layout>

        {/* Global Snackbar */}
        <GlobalSnackbar />
      </GlobalContextProvider>
    </Router>
  );
}

export default App;
