import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { GlobalContextProvider } from "./contexts/GlobalContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import Layout from "./components/Layout";
import EmailDetails from "./pages/EmailDetails";
import MailView from "./pages/MailView";
import ComposeEmailWrapper from "./components/ComposeEmail/ComposeEmailWrapper";
import GlobalSnackbar from "./components/GlobalSnackbar";
import VerificationDashboard from "./pages/VerificationDashboard";
import Settings from "./pages/Settings";
import Contacts from "./pages/Contacts/Contacts";
import Frequent from "./pages/Contacts/Frequent";
import OtherContacts from "./pages/Contacts/OtherContacts";
import ContactsByLabel from "./pages/Contacts/ContactsByLabel";
import ContactDetails from "./pages/Contacts/ContactDetails";
import ContactTrash from "./pages/Contacts/ContactTrash";
import ContactsSearch from "./pages/Contacts/ContactsSearch";
import MergeAndFix from "./pages/Contacts/MergeAndFix";

import SearchResultsView from "./pages/SearchResultsView";
import { initializeSearchIndex } from "./utils/search";

function App() {
  useEffect(() => {
    // Initialize search index on app startup
    initializeSearchIndex();
  }, []);

  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <GlobalContextProvider>
        <NotificationProvider>
          <Layout>
          <Routes>
            <Route path="/" element={<Navigate to="/inbox" replace />} />
            <Route path="/:folder/:threadId" element={<EmailDetails />} />
            <Route path="/label/:label/:threadId" element={<EmailDetails />} />
            <Route path="/:folder" element={<MailView />} />
            <Route path="/label/:label" element={<MailView />} />
            <Route path="/search/:query" element={<SearchResultsView />} />
            <Route path="/verify" element={<VerificationDashboard />} />
            <Route path="/settings/:tab" element={<Settings />} />
            <Route path="/settings" element={<Navigate to="/settings/general" replace />} />

            {/* Contacts paths */}
            <Route path="/contacts" element={<Contacts />} />
            <Route path="/contacts/frequent" element={<Frequent />} />
            <Route path="/contacts/other" element={<OtherContacts />} />
            <Route path="/contacts/label/:labelId" element={<ContactsByLabel />} />
            <Route path="/contacts/person/:contactId" element={<ContactDetails />} />
            <Route path="/contacts/trash" element={<ContactTrash />} />
            <Route path="/contacts/search/:query" element={<ContactsSearch />} />
            <Route path="/contacts/suggestions" element={<MergeAndFix />} />

            <Route path="*" element={<Navigate to="/inbox" replace />} />
          </Routes>

          {/* Compose Email Wrapper */}
          <ComposeEmailWrapper />
        </Layout>

        {/* Global Snackbar */}
        <GlobalSnackbar />
        </NotificationProvider>
      </GlobalContextProvider>
    </Router>
  );
}

export default App;
