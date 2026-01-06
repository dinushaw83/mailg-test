import { createSlice } from "@reduxjs/toolkit";

const uiSlice = createSlice({
  name: "ui",
  initialState: {
    currentView: "inbox",
    sortOrder: "newest",
    currentPage: 1,
    itemsPerPage: 25,
    panelState: {
      showPanel: false,
      direction: "no-split",
    },
    showQuickSettings: false,
    density: "default",
    threading: true,
    inboxType: "default",
    isLeftSidebarExpanded: true,
    rightSidebarExpanded: true,
    rightSidebarActiveTab: {
      contact: { screen: "CONTACTS" },
      activeTab: null,
    },
    keyboardShortcuts: "shortcuts-off",
    showShortCutsModal: false,
    createLabelModal: {
      show: false,
      type: "create",
      label: null,
    },
    snackbar: {
      open: false,
      message: "",
      action: null,
      autoHideDuration: null,
      hideClose: false,
    },
    selectedIds: [], // Added for global selection management
  },
  reducers: {
    setCurrentView: (state, action) => {
      state.currentView = action.payload;
    },
    setSortOrder: (state, action) => {
      state.sortOrder = action.payload;
    },
    setCurrentPage: (state, action) => {
      state.currentPage = action.payload;
    },
    setItemsPerPage: (state, action) => {
      state.itemsPerPage = action.payload;
    },
    setPanelState: (state, action) => {
      state.panelState = action.payload;
    },
    setShowQuickSettings: (state, action) => {
      state.showQuickSettings = action.payload;
    },
    setDensity: (state, action) => {
      state.density = action.payload;
    },
    setThreading: (state, action) => {
      state.threading = action.payload;
    },
    setInboxType: (state, action) => {
      state.inboxType = action.payload;
    },
    setIsLeftSidebarExpanded: (state, action) => {
      state.isLeftSidebarExpanded = action.payload;
    },
    setRightSidebarExpanded: (state, action) => {
      state.rightSidebarExpanded = action.payload;
    },
    setRightSidebarActiveTab: (state, action) => {
      state.rightSidebarActiveTab = action.payload;
    },
    setKeyboardShortcuts: (state, action) => {
      state.keyboardShortcuts = action.payload;
    },
    setShowShortCutsModal: (state, action) => {
      state.showShortCutsModal = action.payload;
    },
    setCreateLabelModal: (state, action) => {
      state.createLabelModal = action.payload;
    },
    setSnackbar: (state, action) => {
      state.snackbar = { ...state.snackbar, ...action.payload };
    },
    toggleSelection: (state, action) => {
      const id = action.payload;
      const index = state.selectedIds.indexOf(id);
      if (index > -1) {
        state.selectedIds.splice(index, 1);
      } else {
        state.selectedIds.push(id);
      }
    },
    clearSelection: (state) => {
      state.selectedIds = [];
    },
    setSelection: (state, action) => {
      state.selectedIds = action.payload;
    },
  },
});

export const {
  setCurrentView,
  setSortOrder,
  setCurrentPage,
  setItemsPerPage,
  setPanelState,
  setShowQuickSettings,
  setDensity,
  setThreading,
  setInboxType,
  setIsLeftSidebarExpanded,
  setRightSidebarExpanded,
  setRightSidebarActiveTab,
  setKeyboardShortcuts,
  setShowShortCutsModal,
  setCreateLabelModal,
  setSnackbar,
  toggleSelection,
  clearSelection,
  setSelection,
} = uiSlice.actions;

export default uiSlice.reducer;
