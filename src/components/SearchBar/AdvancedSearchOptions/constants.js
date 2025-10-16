export const AdvancedSearchTextFieldInputStyle = {
  "& .MuiInput-root": {
    fontSize: "14px",
  },
  "& .MuiInputBase-input": {
    height: "20px !important",
    padding: 0,
  },
  // override hover underline
  "& .MuiInput-underline:hover:not(.Mui-disabled):before": {
    borderBottom: "1px solid rgba(0,0,0,0.42)",
  },
  // override the focused/active line color
  "& .MuiInput-underline:after": {
    borderBottom: "1px solid #4285f4",
  },
};

export const AdvancedSearchSelectHoverStyle = {
  "&:hover:not(.Mui-disabled, .Mui-error):before": {
    borderBottom: "1px solid rgba(0, 0, 0, 0.42)",
  },
};

export const dateWithinOptions = [
  { value: "1 day", label: "1 day" },
  { value: "3 days", label: "3 days" },
  { value: "1 week", label: "1 week" },
  { value: "2 weeks", label: "2 weeks" },
  { value: "1 month", label: "1 month" },
  { value: "2 months", label: "2 months" },
  { value: "3 months", label: "3 months" },
  { value: "6 months", label: "6 months" },
  { value: "1 year", label: "1 year" },
];

export const subsetOptions = [
  { value: "All Mail", label: "All Mail" },
  { value: "Inbox", label: "Inbox" },
  { value: "Sent", label: "Sent" },
  { value: "Drafts", label: "Drafts" },
  { value: "Spam", label: "Spam" },
  { value: "Trash", label: "Trash" },
];
