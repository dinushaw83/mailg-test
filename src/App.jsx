import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { GlobalContextProvider } from "./contexts/GlobalContext";
import Layout from "./components/Layout";
import Inbox from "./pages/Inbox";
import ComposeEmail from "./components/ComposeEmail/ComposeEmail";
import GlobalSnackbar from "./components/GlobalSnackbar";

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

          {/* Compose Email */}
          <ComposeEmail />
        </Layout>
        
        {/* Global Snackbar */}
        <GlobalSnackbar />
      </Router>
    </GlobalContextProvider>
  );
}

export default App;
