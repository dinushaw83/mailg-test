import {
  clearSelection,
  setCreateLabelModal,
  setCurrentPage,
  setCurrentView,
  setDensity,
  setInboxType,
  setIsLeftSidebarExpanded,
  setItemsPerPage,
  setKeyboardShortcuts,
  setPanelState,
  setRightSidebarActiveTab,
  setRightSidebarExpanded,
  setSelection,
  setShowQuickSettings,
  setShowShortCutsModal,
  setSnackbar,
  setSortOrder,
  setThreading,
  toggleSelection,
} from "../store/slices/uiSlice";
import {
  refreshEmails as refreshEmailsAction,
  setEmails,
  setLabels,
  setPreviewEmailId,
  setSelectedEmails,
  setSearchResults,
  setSoftRemovedLabels,
} from "../store/slices/mailSlice";
import {
  setContactsLeftSidebarExpanded,
  setDeletedRecipients,
  setHiddenRecipients,
  setRecipientLabels,
  setRecipients,
} from "../store/slices/contactsSlice";
import {
  setMailGAccountDataPrivacy,
  setMailGAccountPersonalInfo,
  setManualSyncCount,
  setSignInSettings,
  setThirdPartyApps,
} from "../store/slices/mailGAccountSlice";
import {
  setPrivacySettings,
  setSendAsSettings,
  setSettingsAccounts,
  setSettingsAdvanced,
  setSettingsChat,
  setSettingsFilters,
  setSettingsForwarding,
  setSettingsGeneral,
  setSettingsInbox,
  setSettingsLabels,
  setSettingsOffline,
  setSettingsThemes,
  setSignaturesState,
  setVacationResponder,
} from "../store/slices/settingsSlice";
import { useCallback, useMemo, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";

import { db } from "../components/ReduxInitialization";
import { normalizeEmails } from "../utils/emails";
import { setComposeWindows } from "../store/slices/composeSlice";
import { setLoggedInUser } from "../store/slices/userSlice";
import { setNotificationSettings } from "../store/slices/notificationSlice";

export const useGlobalContext = () => {
  const dispatch = useDispatch();
  const mail = useSelector((state) => state.mail);
  const user = useSelector((state) => state.user);
  const contacts = useSelector((state) => state.contacts);
  const ui = useSelector((state) => state.ui);
  const settings = useSelector((state) => state.settings);
  const notification = useSelector((state) => state.notification);
  const mailGAccount = useSelector((state) => state.mailGAccount);
  const compose = useSelector((state) => state.compose);

  // Keep track of the latest state to handle functional updates correctly
  const stateRef = useRef({ mail, user, contacts, ui, settings, notification, mailGAccount, compose });
  stateRef.current = { mail, user, contacts, ui, settings, notification, mailGAccount, compose };

  // For backward compatibility, default to inbox emails
  // Components can also access specific folders via mail.primary, mail.promotions, etc.
  const normalizedEmails = useMemo(() => normalizeEmails(mail.inbox), [mail.inbox]);

  const selection = useMemo(() => {
    const isSelected = (id) => ui.selectedIds.includes(String(id));
    const count = ui.selectedIds.length;
    const hasSelection = count > 0;

    return {
      ids: new Set(ui.selectedIds),
      isSelected,
      select: (id) => {
        if (!isSelected(id)) dispatch(toggleSelection(String(id)));
      },
      deselect: (id) => {
        if (isSelected(id)) dispatch(toggleSelection(String(id)));
      },
      toggle: (id) => dispatch(toggleSelection(String(id))),
      clear: () => dispatch(clearSelection()),
      setMany: (ids) => dispatch(setSelection(ids.map(String))),
      count,
      hasSelection,
    };
  }, [ui.selectedIds, dispatch]);

  const refreshEmails = useCallback(async () => {
    dispatch(refreshEmailsAction());
    if (db) {
      const attachmentStore = db.transaction("attachments", "readwrite").objectStore("attachments");
      await attachmentStore.clear();
      const embeddedImagesStore = db.transaction("embeddedImages", "readwrite").objectStore("embeddedImages");
      await embeddedImagesStore.clear();
    }
  }, [dispatch]);

  const handleFunctionalUpdate = useCallback(
    (actionCreator, sliceName, fieldName) => (val) => {
      if (typeof val === "function") {
        const currentState = fieldName ? stateRef.current[sliceName][fieldName] : stateRef.current[sliceName];

        // Deep clone to prevent mutations of frozen state, but avoid cloning snackbar
        // which contains non-serializable React elements
        let stateCopy;
        if (fieldName === "snackbar") {
          stateCopy = { ...currentState };
        } else {
          stateCopy = JSON.parse(JSON.stringify(currentState));
        }

        dispatch(actionCreator(val(stateCopy)));
      } else {
        dispatch(actionCreator(val));
      }
    },
    [dispatch]
  );

  return {
    selection,
    loggedInUser: user.loggedInUser,
    setLoggedInUser: handleFunctionalUpdate(setLoggedInUser, "user", "loggedInUser"),
    // Backward compatibility: emails defaults to inbox
    emails: mail.inbox,
    setEmails: handleFunctionalUpdate(setEmails, "mail", "inbox"),
    // Search results for optimistic updates
    searchResults: mail.searchResults,
    setSearchResults: handleFunctionalUpdate(setSearchResults, "mail", "searchResults"),
    // Current search query for context-aware actions
    searchQuery: mail.searchQuery,
    // Access to all folders/categories
    mailFolders: {
      inbox: mail.inbox,
      is_starred: mail.is_starred,
      is_snoozed: mail.is_snoozed,
      sent: mail.sent,
      drafts: mail.drafts,
      is_important: mail.is_important,
      scheduled: mail.scheduled,
      all: mail.all,
      spam: mail.spam,
      trash: mail.trash,
      primary: mail.primary,
      promotions: mail.promotions,
      social: mail.social,
      updates: mail.updates,
    },
    recipients: contacts.recipients,
    setRecipients: handleFunctionalUpdate(setRecipients, "contacts", "recipients"),
    recipientLabels: contacts.recipientLabels,
    setRecipientLabels: handleFunctionalUpdate(setRecipientLabels, "contacts", "recipientLabels"),
    currentView: ui.currentView,
    setCurrentView: handleFunctionalUpdate(setCurrentView, "ui", "currentView"),
    selectedEmails: mail.selectedEmails,
    setSelectedEmails: handleFunctionalUpdate(setSelectedEmails, "mail", "selectedEmails"),
    snackbar: ui.snackbar,
    setSnackbar: handleFunctionalUpdate(setSnackbar, "ui", "snackbar"),
    labels: mail.labels,
    setLabels: handleFunctionalUpdate(setLabels, "mail", "labels"),
    composeWindows: compose.composeWindows,
    setComposeWindows: handleFunctionalUpdate(setComposeWindows, "compose", "composeWindows"),
    currentPage: ui.currentPage,
    setCurrentPage: handleFunctionalUpdate(setCurrentPage, "ui", "currentPage"),
    sortOrder: ui.sortOrder,
    setSortOrder: handleFunctionalUpdate(setSortOrder, "ui", "sortOrder"),
    itemsPerPage: ui.itemsPerPage,
    setItemsPerPage: handleFunctionalUpdate(setItemsPerPage, "ui", "itemsPerPage"),
    normalizedEmails,
    refreshEmails,
    panelState: ui.panelState,
    setPanelState: handleFunctionalUpdate(setPanelState, "ui", "panelState"),
    previewEmailId: mail.previewEmailId,
    setPreviewEmailId: handleFunctionalUpdate(setPreviewEmailId, "mail", "previewEmailId"),
    showQuickSettings: ui.showQuickSettings,
    setShowQuickSettings: handleFunctionalUpdate(setShowQuickSettings, "ui", "showQuickSettings"),
    density: ui.density,
    setDensity: handleFunctionalUpdate(setDensity, "ui", "density"),
    inboxType: ui.inboxType,
    setInboxType: handleFunctionalUpdate(setInboxType, "ui", "inboxType"),
    threading: ui.threading,
    setThreading: handleFunctionalUpdate(setThreading, "ui", "threading"),
    isLeftSidebarExpanded: ui.isLeftSidebarExpanded,
    setIsLeftSidebarExpanded: handleFunctionalUpdate(setIsLeftSidebarExpanded, "ui", "isLeftSidebarExpanded"),
    db,
    rightSidebarExpanded: ui.rightSidebarExpanded,
    setRightSidebarExpanded: handleFunctionalUpdate(setRightSidebarExpanded, "ui", "rightSidebarExpanded"),
    rightSidebarActiveTab: ui.rightSidebarActiveTab,
    setRightSidebarActiveTab: handleFunctionalUpdate(setRightSidebarActiveTab, "ui", "rightSidebarActiveTab"),
    deletedRecipients: contacts.deletedRecipients,
    setDeletedRecipients: handleFunctionalUpdate(setDeletedRecipients, "contacts", "deletedRecipients"),
    hiddenRecipients: contacts.hiddenRecipients,
    setHiddenRecipients: handleFunctionalUpdate(setHiddenRecipients, "contacts", "hiddenRecipients"),
    keyboardShortcuts: ui.keyboardShortcuts,
    setKeyboardShortcuts: handleFunctionalUpdate(setKeyboardShortcuts, "ui", "keyboardShortcuts"),
    showShortCutsModal: ui.showShortCutsModal,
    setShowShortCutsModal: handleFunctionalUpdate(setShowShortCutsModal, "ui", "showShortCutsModal"),
    signaturesState: settings.signaturesState,
    setSignaturesState: handleFunctionalUpdate(setSignaturesState, "settings", "signaturesState"),
    sendAsSettings: settings.sendAsSettings,
    setSendAsSettings: handleFunctionalUpdate(setSendAsSettings, "settings", "sendAsSettings"),
    notificationSettings: notification.notificationSettings,
    setNotificationSettings: handleFunctionalUpdate(setNotificationSettings, "notification", "notificationSettings"),
    privacySettings: settings.privacySettings,
    setPrivacySettings: handleFunctionalUpdate(setPrivacySettings, "settings", "privacySettings"),
    settingsAccounts: settings.settingsAccounts,
    setSettingsAccounts: handleFunctionalUpdate(setSettingsAccounts, "settings", "settingsAccounts"),
    contactsLeftSidebarExpanded: contacts.contactsLeftSidebarExpanded,
    setContactsLeftSidebarExpanded: handleFunctionalUpdate(
      setContactsLeftSidebarExpanded,
      "contacts",
      "contactsLeftSidebarExpanded"
    ),
    vacationResponder: settings.vacationResponder,
    setVacationResponder: handleFunctionalUpdate(setVacationResponder, "settings", "vacationResponder"),
    createLabelModal: ui.createLabelModal,
    setCreateLabelModal: handleFunctionalUpdate(setCreateLabelModal, "ui", "createLabelModal"),
    softRemovedLabels: mail.softRemovedLabels,
    setSoftRemovedLabels: handleFunctionalUpdate(setSoftRemovedLabels, "mail", "softRemovedLabels"),
    settingsGeneral: settings.settingsGeneral,
    setSettingsGeneral: handleFunctionalUpdate(setSettingsGeneral, "settings", "settingsGeneral"),
    settingsAdvanced: settings.settingsAdvanced,
    setSettingsAdvanced: handleFunctionalUpdate(setSettingsAdvanced, "settings", "settingsAdvanced"),
    settingsLabels: settings.settingsLabels,
    setSettingsLabels: handleFunctionalUpdate(setSettingsLabels, "settings", "settingsLabels"),
    settingsInbox: settings.settingsInbox,
    setSettingsInbox: handleFunctionalUpdate(setSettingsInbox, "settings", "settingsInbox"),
    settingsChat: settings.settingsChat,
    setSettingsChat: handleFunctionalUpdate(setSettingsChat, "settings", "settingsChat"),
    settingsFilters: settings.settingsFilters,
    setSettingsFilters: handleFunctionalUpdate(setSettingsFilters, "settings", "settingsFilters"),
    settingsForwarding: settings.settingsForwarding,
    setSettingsForwarding: handleFunctionalUpdate(setSettingsForwarding, "settings", "settingsForwarding"),
    settingsOffline: settings.settingsOffline,
    setSettingsOffline: handleFunctionalUpdate(setSettingsOffline, "settings", "settingsOffline"),
    settingsThemes: settings.settingsThemes,
    setSettingsThemes: handleFunctionalUpdate(setSettingsThemes, "settings", "settingsThemes"),
    mailGAccountPersonalInfo: mailGAccount.mailGAccountPersonalInfo,
    setMailGAccountPersonalInfo: handleFunctionalUpdate(
      setMailGAccountPersonalInfo,
      "mailGAccount",
      "mailGAccountPersonalInfo"
    ),
    mailGAccountDataPrivacy: mailGAccount.mailGAccountDataPrivacy,
    setMailGAccountDataPrivacy: handleFunctionalUpdate(
      setMailGAccountDataPrivacy,
      "mailGAccount",
      "mailGAccountDataPrivacy"
    ),
    thirdPartyApps: mailGAccount.thirdPartyApps,
    setThirdPartyApps: handleFunctionalUpdate(setThirdPartyApps, "mailGAccount", "thirdPartyApps"),
    signInSettings: mailGAccount.signInSettings,
    setSignInSettings: handleFunctionalUpdate(setSignInSettings, "mailGAccount", "signInSettings"),
    manualSyncCount: mailGAccount.manualSyncCount,
    setManualSyncCount: handleFunctionalUpdate(setManualSyncCount, "mailGAccount", "manualSyncCount"),
  };
};
