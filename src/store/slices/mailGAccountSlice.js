import { createSlice } from "@reduxjs/toolkit";

const mailGAccountSlice = createSlice({
  name: "mailGAccount",
  initialState: {
    mailGAccountPersonalInfo: {
      name: "John Doe",
      nickname: "",
      birthday: { month: "January", day: "1", year: "2001" },
      gender: "Rather not say",
      emails: ["john.doe@example.com"],
      phone: { number: "+1 555 123 4567", verified: false },
      addresses: {
        home: "123 Main Street, New York, NY 10001",
        work: "456 Business Ave, New York, NY 10002",
      },
      about: { places: [], links: ["JohnDoe.com"], profileLinks: [], contributorLinks: [], introduction: "" },
      workAndEducation: {
        occupation: "Software Engineer",
        workHistory: ["Tech Corp - Senior Developer", "StartupXYZ - Lead Engineer"],
        educationHistory: ["Harvard University - Computer Science"],
      },
    },
    mailGAccountDataPrivacy: {
      webActivityEnabled: true,
      webActivitySubsettings: { includeWebHistory: true, includeVoiceAudio: false, includeVisualSearch: false },
      webActivityAutoDelete: "18m",
      locationHistoryEnabled: false,
      locationHistorySubsettings: { shareEdits: true },
      youtubeHistoryEnabled: true,
      adPersonalizationEnabled: true,
      searchPersonalizationEnabled: true,
      autoDeleteActivity: "18m",
      profileVisibility: {
        nameVisibility: "anyone",
        genderVisibility: "onlyYou",
        birthdayVisibility: "onlyYou",
        emailVisibility: "anyone",
        phoneVisibility: "onlyYou",
        addressVisibility: "onlyYou",
        profilePictureVisibility: "anyone",
        linksVisibility: "anyone",
        workVisibility: "anyone",
        educationVisibility: "anyone",
      },
    },
    signInSettings: {
      signInPromptsEnabled: true,
    },
    thirdPartyApps: [
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
    ],
    manualSyncCount: 0,
  },
  reducers: {
    setMailGAccountPersonalInfo: (state, action) => {
      state.mailGAccountPersonalInfo = action.payload;
    },
    setMailGAccountDataPrivacy: (state, action) => {
      state.mailGAccountDataPrivacy = action.payload;
    },
    setSignInSettings: (state, action) => {
      state.signInSettings = action.payload;
    },
    setThirdPartyApps: (state, action) => {
      state.thirdPartyApps = action.payload;
    },
    setManualSyncCount: (state, action) => {
      state.manualSyncCount = action.payload;
    },
  },
});

export const {
  setMailGAccountPersonalInfo,
  setMailGAccountDataPrivacy,
  setSignInSettings,
  setThirdPartyApps,
  setManualSyncCount,
} = mailGAccountSlice.actions;

export default mailGAccountSlice.reducer;
