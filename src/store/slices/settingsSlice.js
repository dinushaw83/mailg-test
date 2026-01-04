import { createSlice } from '@reduxjs/toolkit';

const settingsSlice = createSlice({
  name: 'settings',
  initialState: {
    vacationResponder: {
      enabled: false,
      firstDay: new Date().toISOString().split("T")[0],
      lastDay: "",
      subject: "",
      message: "",
      onlyContacts: false,
    },
    sendAsSettings: {
      displayName: "John Doe",
      email: "john.doe@example.com",
      replyTo: "",
    },
    signaturesState: {
      list: [],
      useForNewEmails: "",
      useForRepliesAndForwards: "",
      insertSignatureBeforeQuotedText: false,
    },
    privacySettings: {
      analyticsEnabled: false,
      crashReportsEnabled: false,
      personalizationEnabled: false,
      adsPersonalizationEnabled: true,
    },
    settingsGeneral: {
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
    },
    settingsAdvanced: {
      autoAdvance: false,
      templates: false,
      customKeyboardShortcuts: false,
      unreadMessageIcon: false,
    },
    settingsLabels: {
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
    },
    settingsInbox: {
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
    },
    settingsChat: {
      chatEnabled: false,
      meetEnabled: false,
    },
    settingsFilters: {
      filters: [],
      blockedAddresses: [],
    },
    settingsForwarding: {
      forwardingEnabled: false,
      forwardingAddress: "",
      forwardingAction: "keep",
      popEnabled: false,
      popAction: "keep",
      imapEnabled: true,
      imapAutoExpunge: false,
      imapDeleteAction: "archive",
    },
    settingsOffline: {
      offlineEnabled: false,
      offlineDays: 30,
    },
    settingsThemes: {
      currentTheme: "default",
    },
    settingsAccounts: {
      markAsRead: true, 
      showAttribution: true, 
    },
  },
  reducers: {
    setVacationResponder: (state, action) => {
      state.vacationResponder = action.payload;
    },
    setSendAsSettings: (state, action) => {
      state.sendAsSettings = action.payload;
    },
    setSignaturesState: (state, action) => {
      state.signaturesState = action.payload;
    },
    setPrivacySettings: (state, action) => {
      state.privacySettings = action.payload;
    },
    setSettingsGeneral: (state, action) => {
      state.settingsGeneral = action.payload;
    },
    setSettingsAdvanced: (state, action) => {
      state.settingsAdvanced = action.payload;
    },
    setSettingsLabels: (state, action) => {
      state.settingsLabels = action.payload;
    },
    setSettingsInbox: (state, action) => {
      state.settingsInbox = action.payload;
    },
    setSettingsChat: (state, action) => {
      state.settingsChat = action.payload;
    },
    setSettingsFilters: (state, action) => {
      state.settingsFilters = action.payload;
    },
    setSettingsForwarding: (state, action) => {
      state.settingsForwarding = action.payload;
    },
    setSettingsOffline: (state, action) => {
      state.settingsOffline = action.payload;
    },
    setSettingsThemes: (state, action) => {
      state.settingsThemes = action.payload;
    },
    setSettingsAccounts: (state, action) => {
      state.settingsAccounts = action.payload;
    },
  },
});

export const {
  setVacationResponder,
  setSendAsSettings,
  setSignaturesState,
  setPrivacySettings,
  setSettingsGeneral,
  setSettingsAdvanced,
  setSettingsLabels,
  setSettingsInbox,
  setSettingsChat,
  setSettingsFilters,
  setSettingsForwarding,
  setSettingsOffline,
  setSettingsThemes,
  setSettingsAccounts,
} = settingsSlice.actions;

export default settingsSlice.reducer;

