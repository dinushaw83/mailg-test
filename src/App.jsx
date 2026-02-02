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
import FeatureUnavailablePage from "./pages/FeatureUnavailablePage";
import Frequent from "./pages/Contacts/Frequent";
import GlobalSnackbar from "./components/GlobalSnackbar";
import ImportDataMain from "./components/import_data/ImportDataMain";
import Layout from "./components/Layout";
import LocalStorageDownload from "./pages/LocalStorageDownload";
import Login from "./pages/Login";
import MailGAccount from "./pages/MailGAccount";
import MailView from "./pages/MailView";
import OtherContacts from "./pages/Contacts/OtherContacts";
import { PersistGate } from "redux-persist/integration/react";
import ProtectedRoute from "./components/common/ProtectedRoute";
import { Provider } from "react-redux";
import ReduxInitialization from "./components/ReduxInitialization";
import SearchResultsView from "./pages/SearchResultsView";
import SessionId from "./pages/SessionId";
import Settings from "./pages/Settings";
import TaskVerifier from "../task_verifier/TaskVerifier";
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
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/task_verifier" element={<TaskVerifier />} />

              {/* Standalone verification pages (Protected) */}
              <Route
                path="/verify-ls"
                element={
                  <ProtectedRoute>
                    <VerificationLocalStorage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/verify"
                element={
                  <ProtectedRoute>
                    <VerificationDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/verify_raw"
                element={
                  <ProtectedRoute>
                    <VerifyRawPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/localStorage"
                element={
                  <ProtectedRoute>
                    <LocalStorageDownload />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/sessionid"
                element={
                  <ProtectedRoute>
                    <SessionId />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/502"
                element={
                  <ProtectedRoute>
                    <FeatureUnavailablePage />
                  </ProtectedRoute>
                }
              />

              {/* All other routes wrapped in Layout and ProtectedRoute */}
              <Route
                path="/*"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Routes>
                        <Route path="/" element={<Navigate to="/inbox" replace />} />
                        <Route path="/:folder/:thread_id" element={<EmailDetails />} />
                        <Route path="/label/:label/:thread_id" element={<EmailDetails />} />
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
                        <Route path="/contacts/suggestions" element={<Navigate to="/502" replace />} />
                        <Route path="/contacts/new" element={<CreateContactPage />} />

                        <Route path="*" element={<Navigate to="/inbox" replace />} />
                      </Routes>

                      {/* Compose Email Wrapper (only for Layout pages) */}
                      <ComposeEmailWrapper />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route path="/import-data" element={<ImportDataMain />} />
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
