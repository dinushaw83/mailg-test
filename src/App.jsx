import { Navigate, Route, BrowserRouter as Router, Routes, useLocation } from "react-router-dom";
import React, { useEffect } from "react";
import { persistor, store } from "./store";

import ComposeEmailWrapper from "./components/ComposeEmail/ComposeEmailWrapper";
import ContactDetailsPage from "./pages/Contacts/ContactDetailsPage";
import ContactTrash from "./pages/Contacts/ContactTrash";
import Contacts from "./pages/Contacts/Contacts";
import ContactsByLabel from "./pages/Contacts/ContactsByLabel";
import ContactsSearch from "./pages/Contacts/ContactsSearch";
import CreateContactPage from "./pages/Contacts/CreateContactPage";
import EmailDetails from "./pages/EmailDetails";
import Frequent from "./pages/Contacts/Frequent";
import GlobalSnackbar from "./components/GlobalSnackbar";
import Layout from "./components/Layout";
import LocalStorageDownload from "./pages/LocalStorageDownload";
import MailGAccount from "./pages/MailGAccount";
import MailView from "./pages/MailView";
import MergeAndFix from "./pages/Contacts/MergeAndFix";
import OtherContacts from "./pages/Contacts/OtherContacts";
import { PersistGate } from "redux-persist/integration/react";
import { Provider } from "react-redux";
import ReduxInitialization from "./components/ReduxInitialization";
import SearchResultsView from "./pages/SearchResultsView";
import Settings from "./pages/Settings";
import VerificationDashboard from "./pages/VerificationDashboard";
import VerificationLocalStorage from "./pages/VerificationLocalStorage";
import VerifyRawPage from "./pages/VerifyRawPage";
import { initializeSearchIndex } from "./utils/search";

// Component to handle contact details with edit parameter
const ContactDetailsWithEdit = () => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const isEdit = searchParams.get("edit") === "1";

  return isEdit ? <CreateContactPage /> : <ContactDetailsPage />;
};

function App() {
  useEffect(() => {
    // Initialize search index on app startup
    initializeSearchIndex();
  }, []);

  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <ReduxInitialization>
            <Routes>
              {/* Standalone verification page without Layout */}
              <Route path="/verify-ls" element={<VerificationLocalStorage />} />

              {/* Standalone verification page without Layout */}
              <Route path="/verify" element={<VerificationDashboard />} />

              {/* Standalone verify_raw page without Layout */}
              <Route path="/verify_raw" element={<VerifyRawPage />} />

              <Route path="/localStorage" element={<LocalStorageDownload />} />

              {/* All other routes wrapped in Layout */}
              <Route
                path="/*"
                element={
                  <Layout>
                    <Routes>
                      <Route path="/" element={<Navigate to="/inbox" replace />} />
                      <Route path="/:folder/:threadId" element={<EmailDetails />} />
                      <Route path="/label/:label/:threadId" element={<EmailDetails />} />
                      <Route path="/:folder" element={<MailView />} />
                      <Route path="/label/:label" element={<MailView />} />
                      <Route path="/search/:query" element={<SearchResultsView />} />
                      <Route path="/search" element={<SearchResultsView />} />
                      <Route path="/settings/:tab" element={<Settings />} />
                      <Route path="/settings" element={<Navigate to="/settings/general" replace />} />
                      <Route path="/mailg-account/:view?" element={<MailGAccount />} />
                      <Route path="/mailg-account" element={<MailGAccount />} />

                      {/* Contacts paths */}
                      <Route path="/contacts" element={<Contacts />} />
                      <Route path="/contacts/frequent" element={<Frequent />} />
                      <Route path="/contacts/other" element={<OtherContacts />} />
                      <Route path="/contacts/label/:labelId" element={<ContactsByLabel />} />
                      <Route path="/contacts/person/:contactId" element={<ContactDetailsWithEdit />} />
                      <Route path="/contacts/trash" element={<ContactTrash />} />
                      <Route path="/contacts/search/:query" element={<ContactsSearch />} />
                      <Route path="/contacts/suggestions" element={<MergeAndFix />} />
                      <Route path="/contacts/new" element={<CreateContactPage />} />

                      <Route path="*" element={<Navigate to="/inbox" replace />} />
                    </Routes>

                    {/* Compose Email Wrapper (only for Layout pages) */}
                    <ComposeEmailWrapper />
                  </Layout>
                }
              />
            </Routes>

            {/* Global Snackbar */}
            <GlobalSnackbar />
          </ReduxInitialization>
        </Router>
      </PersistGate>
    </Provider>
  );
}

export default App;
