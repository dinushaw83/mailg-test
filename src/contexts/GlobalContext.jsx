import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { usePersistedState } from "../hooks/usePersistedState";

import { initialUser } from "./fixtures/me";
import { initialEmails } from "./fixtures/emails";
import { recipients as initialRecipients } from "./fixtures/recipients";
import { recipientLabels as initialRecipientLabels } from "./fixtures/recipientLabels";
import { initialLabels } from "./fixtures/labels";
import { normalizeEmails } from "../utils/emails";
import { openDB } from "idb";

export const GlobalContext = createContext();

export const GlobalContextProvider = ({ children }) => {
  const [loggedInUser, setLoggedInUser] = usePersistedState("loggedInUser", initialUser);
  const [emails, setEmails] = usePersistedState("emails", initialEmails);

  // Recipients / Contacts
  const [recipients, setRecipients] = usePersistedState("recipients", initialRecipients);
  const [recipientLabels, setRecipientLabels] = usePersistedState("recipientLabels", initialRecipientLabels);
  const [deletedRecipients, setDeletedRecipients] = usePersistedState("deletedRecipients", []);
  const [hiddenRecipients, setHiddenRecipients] = usePersistedState("hiddenRecipients", []);

  const [currentView, setCurrentView] = usePersistedState("currentView", "inbox");
  const [selectedEmails, setSelectedEmails] = usePersistedState("selectedEmails", []);
  const [labels, setLabels] = usePersistedState("labels", initialLabels);
  // Store multiple compose windows
  const [composeWindows, setComposeWindows] = useState([]);
  const [sortOrder, setSortOrder] = usePersistedState("sortOrder", "newest");
  const [currentPage, setCurrentPage] = usePersistedState("currentPage", 1);
  const [itemsPerPage, setItemsPerPage] = usePersistedState("itemsPerPage", 25);
  const [panelState, setPanelState] = usePersistedState("panelState", {
    showPanel: false,
    direction: "vertical",
  });
  const [softRemovedLabels, setSoftRemovedLabels] = useState({});
  const [previewEmailId, setPreviewEmailId] = useState(null);
  const [showQuickSettings, setShowQuickSettings] = usePersistedState("showQuickSettings", false);
  const [density, setDensity] = usePersistedState("density", "default");
  const [threading, setThreading] = usePersistedState("threading", true);
  const [inboxType, setInboxType] = usePersistedState("inboxType", "default");
  const [isLeftSidebarExpanded, setIsLeftSidebarExpanded] = usePersistedState("isLeftSidebarExpanded", true);

  // Vacation responder state
  const [vacationResponder, setVacationResponder] = usePersistedState("vacationResponder", {
    enabled: false,
    firstDay: new Date().toISOString().split("T")[0],
    lastDay: "",
    subject: "",
    message: "",
    onlyContacts: false,
  });

  // Right sidebar states
  const [rightSidebarExpanded, setRightSidebarExpanded] = usePersistedState("rightSidebarExpanded", true);
  const [rightSidebarActiveTab, setRightSidebarActiveTab] = usePersistedState("rightSidebarActiveTab", {
    contact: { screen: "CONTACTS" },
    activeTab: null,
  });

  // Contact management states
  const [contactsLeftSidebarExpanded, setContactsLeftSidebarExpanded] = useState(true);
  const [createLabelModal, setCreateLabelModal] = useState({
    show: false,
    type: "create",
    label: null,
  });

  // Signatures related settings
  const [signaturesState, setSignaturesState] = usePersistedState("signatures", {
    list: [],
    useForNewEmails: "",
    useForRepliesAndForwards: "",
    insertSignatureBeforeQuotedText: false,
  });

  // Notification settings state
  const [notificationSettings, setNotificationSettings] = usePersistedState("notificationSettings", {
    type: "off", // "off", "new", "important"
    sound: "1",  // Sound ID
    enabled: false
  });

  // Privacy settings state
  const [privacySettings, setPrivacySettings] = usePersistedState("privacySettings", {
    analyticsEnabled: false,
    crashReportsEnabled: false,
    personalizationEnabled: false,
    adsPersonalizationEnabled: true,
  });

  // General Settings Tab state
  const [settingsGeneral, setSettingsGeneral] = usePersistedState("settingsGeneral", {
    language: "en",
    enableInputTools: false,
    rtlSupport: false,
    maxPageSize: 50,
    undoSendDelay: 30,
    defaultReplyBehavior: "reply",
    hoverActions: true,
    sendAndArchive: true,
    defaultTextStyle: {
      fontFamily: "Sans Serif",
      fontSize: "Normal",
    },
    images: "ask",
    dynamicEmail: true,
    grammar: true,
    spelling: true,
    autoCorrect: true,
    smartCompose: true,
    smartComposePersonalization: true,
    conversationView: true,
    nudges: {
      suggestReplies: true,
      suggestFollowUps: true,
    },
    smartReply: true,
    smartFeatures: true,
    workspaceSmartFeatures: true,
    packageTracking: true,
    stars: ["star", "info", "question", "exclamation", "star_outline"],
    keyboardShortcuts: true,
    buttonLabels: "text",
    showMyPicture: true,
    autoCompleteContacts: true,
    adsImportanceSignals: true,
    personalLevelIndicators: true,
    snippets: true,
  });

  // Advanced Settings Tab state
  const [settingsAdvanced, setSettingsAdvanced] = usePersistedState("settingsAdvanced", {
    autoAdvance: false,
    templates: false,
    customKeyboardShortcuts: false,
    unreadMessageIcon: false,
  });

  // Labels Settings Tab state
  const [settingsLabels, setSettingsLabels] = usePersistedState("settingsLabels", {
    systemLabels: {
      inbox: { show: true, showUnread: true },
      starred: { show: true, showUnread: false },
      snoozed: { show: true, showUnread: false },
      sent: { show: true, showUnread: false },
      drafts: { show: true, showUnread: false },
      spam: { show: false, showUnread: false },
      trash: { show: false, showUnread: false },
      important: { show: true, showUnread: false },
    },
    categories: {
      social: true,
      promotions: true,
      updates: true,
      forums: true,
    },
    customLabels: [],
  });

  // Inbox Settings Tab state
  const [settingsInbox, setSettingsInbox] = usePersistedState("settingsInbox", {
    inboxType: "default",
    inboxSections: [],
    categoriesEnabled: {
      primary: true,
      social: false,
      promotions: false,
      updates: false,
      forums: false,
    },
    readingPane: "no_split",
    importanceMarkers: "show",
    maxPageSize: 50,
  });

  // Chat Settings Tab state
  const [settingsChat, setSettingsChat] = usePersistedState("settingsChat", {
    chatEnabled: false,
    meetEnabled: false,
  });

  // Filters Settings Tab state
  const [settingsFilters, setSettingsFilters] = usePersistedState("settingsFilters", {
    filters: [],
    blockedAddresses: [],
  });

  // Forwarding Settings Tab state
  const [settingsForwarding, setSettingsForwarding] = usePersistedState("settingsForwarding", {
    forwardingEnabled: false,
    forwardingAddress: "",
    forwardingAction: "keep",
    popEnabled: false,
    popAction: "keep",
    imapEnabled: true,
    imapAutoExpunge: false,
    imapDeleteAction: "archive",
  });

  // Offline Settings Tab state
  const [settingsOffline, setSettingsOffline] = usePersistedState("settingsOffline", {
    offlineEnabled: false,
    offlineDays: 30,
  });

  // Themes Settings Tab state
  const [settingsThemes, setSettingsThemes] = usePersistedState("settingsThemes", {
    currentTheme: "default",
  });

  // MailG Account - Personal Info state
  const [mailGAccountPersonalInfo, setMailGAccountPersonalInfo] = usePersistedState("mailGAccountPersonalInfo", {
    name: "John Doe",
    nickname: "",
    birthday: {
      month: "January",
      day: "1",
      year: "2001",
    },
    gender: "Rather not say",
    emails: ["john.doe@example.com"],
    phone: {
      number: "+1 555 123 4567",
      verified: false,
    },
    addresses: {
      home: "123 Main Street, New York, NY 10001",
      work: "456 Business Ave, New York, NY 10002",
    },
    // About section
    about: {
      places: [],
      links: ["JohnDoe.com"],
      profileLinks: [],
      contributorLinks: [],
      introduction: "",
    },
    // Work & education section
    workAndEducation: {
      occupation: "Software Engineer",
      workHistory: ["Tech Corp - Senior Developer", "StartupXYZ - Lead Engineer"],
      educationHistory: ["Harvard University - Computer Science"],
    },
  });

  // MailG Account - Data & Privacy state
  const [mailGAccountDataPrivacy, setMailGAccountDataPrivacy] = usePersistedState("mailGAccountDataPrivacy", {
    // Web & App Activity
    webActivityEnabled: true,
    webActivitySubsettings: {
      includeWebHistory: true,
      includeVoiceAudio: false,
      includeVisualSearch: false,
    },
    webActivityAutoDelete: "18m",
    
    // Location History / Timeline
    locationHistoryEnabled: false,
    locationHistorySubsettings: {
      shareEdits: true,
    },
    
    // YouTube History
    youtubeHistoryEnabled: true,
    
    // Ad Personalization
    adPersonalizationEnabled: true,
    
    // Search Personalization
    searchPersonalizationEnabled: true,
    
    // Auto-delete
    autoDeleteActivity: "18m",
    
    // Profile Visibility Settings (Info you can share with others)
    profileVisibility: {
      nameVisibility: "anyone", // "onlyYou" or "anyone"
      genderVisibility: "onlyYou", // "onlyYou" or "anyone"
      birthdayVisibility: "onlyYou", // "onlyYou" or "anyone"
      emailVisibility: "anyone", // "onlyYou" or "anyone"
      phoneVisibility: "onlyYou", // "onlyYou" or "anyone"
      addressVisibility: "onlyYou", // "onlyYou" or "anyone"
      profilePictureVisibility: "anyone", // "onlyYou" or "anyone"
      linksVisibility: "anyone", // "onlyYou" or "anyone"
      workVisibility: "anyone", // "onlyYou" or "anyone"
      educationVisibility: "anyone", // "onlyYou" or "anyone"
    },
  });

  // Sign-in settings
  const [signInSettings, setSignInSettings] = usePersistedState("signInSettings", {
    signInPromptsEnabled: true,
  });

  // MailG Account - Third-party Apps & Services
  const [thirdPartyApps, setThirdPartyApps] = usePersistedState("thirdPartyApps", [
    {
      id: "cursor-ai",
      name: "Cursor",
      icon: "cursor",
      access: "Sign in with Google",
      accessCount: 12,
      description: "Access to Any account access",
      lastAccessed: "2 days ago",
    },
    {
      id: "evernote",
      name: "Evernote",
      icon: "evernote",
      access: "Sign in with Google",
      accessCount: 12,
      description: "Access to Any account access",
      lastAccessed: "1 week ago",
    },
    {
      id: "jibble",
      name: "Jibble 2.0",
      icon: "jibble",
      access: "Sign in with Google",
      accessCount: 12,
      description: "Access to Any account access",
      lastAccessed: "3 weeks ago",
    },
    {
      id: "openai",
      name: "OpenAI",
      icon: "openai",
      access: "Sign in with Google",
      accessCount: 12,
      description: "Access to Any account access",
      lastAccessed: "1 month ago",
    },
    {
      id: "slack",
      name: "Slack",
      icon: "slack",
      access: "Sign in with Google",
      accessCount: 12,
      description: "Access to Any account access",
      lastAccessed: "2 months ago",
    },
  ]);

  // Global snackbar state
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    action: null,
    autoHideDuration: null,
    hideClose: false,
  });

  const [selected, setSelected] = useState(() => new Set());

  // Clear selection on navigation (folder/label changes)
  const location = useLocation();
  useEffect(() => {
    setSelected(new Set());
  }, [location.pathname]);

  // Reset compose windows

  const selection = useMemo(() => {
    const isSelected = (id) => selected.has(id);
    const count = selected.size;
    const hasSelection = count > 0;

    const select = (id) =>
      setSelected((prev) => {
        const s = new Set(prev);
        s.add(id);
        return s;
      });

    const deselect = (id) =>
      setSelected((prev) => {
        const s = new Set(prev);
        s.delete(id);
        return s;
      });

    const toggle = (id) =>
      setSelected((prev) => {
        const s = new Set(prev);
        s.has(id) ? s.delete(id) : s.add(id);
        return s;
      });

    const clear = () => setSelected(new Set());

    const setMany = (ids) => setSelected(() => new Set(ids)); // replace with exactly these ids

    return {
      ids: selected,
      isSelected,
      select,
      deselect,
      toggle,
      clear,
      setMany,
      count,
      hasSelection,
    };
  }, [selected]);

  const normalizedEmails = useMemo(() => {
    return normalizeEmails(emails);
  }, [emails]);

  // Handle IndexedDB as a state
  const [db, setDb] = useState(null);

  useEffect(() => {
    const initDB = async () => {
      try {
        const database = await openDB("my-database", 2, {
          upgrade(db, oldVer, newVer, tx) {
            // runs only when version > oldVer
            if (!db.objectStoreNames.contains("attachments")) {
              const store = db.createObjectStore("attachments", { keyPath: "id" }); // primary key
              store.createIndex("name", "name", { unique: false }); // secondary index
            }
            if (!db.objectStoreNames.contains("embeddedImages")) {
              const store = db.createObjectStore("embeddedImages", { keyPath: "id" }); // primary key
              store.createIndex("emailId", "emailId", { unique: false }); // secondary index
            }
          },
        });

        setDb(database);
      } catch (error) {
        console.error("Failed to open database:", error);
      }
    };

    initDB();
  }, []);

  const refreshEmails = useCallback(async () => {
    setEmails(initialEmails);

    // reset the database, delete all attachments and embedded images
    if (db) {
      const attachmentStore = db.transaction("attachments", "readwrite").objectStore("attachments");
      await attachmentStore.clear();

      const embeddedImagesStore = db.transaction("embeddedImages", "readwrite").objectStore("embeddedImages");
      await embeddedImagesStore.clear();
    }
  }, [db]);

  const contextValue = {
    selection,
    loggedInUser,
    setLoggedInUser,
    emails,
    setEmails,
    recipients,
    setRecipients,
    recipientLabels,
    setRecipientLabels,
    currentView,
    setCurrentView,
    selectedEmails,
    setSelectedEmails,
    snackbar,
    setSnackbar,
    labels,
    setLabels,
    composeWindows,
    setComposeWindows,
    currentPage,
    setCurrentPage,
    sortOrder,
    setSortOrder,
    itemsPerPage,
    setItemsPerPage,
    normalizedEmails,
    refreshEmails,
    panelState,
    setPanelState,
    previewEmailId,
    setPreviewEmailId,
    showQuickSettings,
    setShowQuickSettings,
    density,
    setDensity,
    inboxType,
    setInboxType,
    threading,
    setThreading,
    isLeftSidebarExpanded,
    setIsLeftSidebarExpanded,
    db,
    rightSidebarExpanded,
    setRightSidebarExpanded,
    rightSidebarActiveTab,
    setRightSidebarActiveTab,
    deletedRecipients,
    setDeletedRecipients,
    signaturesState,
    setSignaturesState,
    notificationSettings,
    setNotificationSettings,
    privacySettings,
    setPrivacySettings,
    contactsLeftSidebarExpanded,
    setContactsLeftSidebarExpanded,
    vacationResponder,
    setVacationResponder,
    createLabelModal,
    setCreateLabelModal,
    hiddenRecipients,
    setHiddenRecipients,
    softRemovedLabels,
    setSoftRemovedLabels,
    // Settings tabs state
    settingsGeneral,
    setSettingsGeneral,
    settingsAdvanced,
    setSettingsAdvanced,
    settingsLabels,
    setSettingsLabels,
    settingsInbox,
    setSettingsInbox,
    settingsChat,
    setSettingsChat,
    settingsFilters,
    setSettingsFilters,
    settingsForwarding,
    setSettingsForwarding,
    settingsOffline,
    setSettingsOffline,
    settingsThemes,
    setSettingsThemes,
    // MailG Account state
    mailGAccountPersonalInfo,
    setMailGAccountPersonalInfo,
    mailGAccountDataPrivacy,
    setMailGAccountDataPrivacy,
    thirdPartyApps,
    setThirdPartyApps,
    signInSettings,
    setSignInSettings,
  };

  return <GlobalContext.Provider value={contextValue}>{children}</GlobalContext.Provider>;
};

export const useGlobalContext = () => useContext(GlobalContext);
