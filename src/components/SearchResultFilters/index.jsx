import { Button, Chip, Stack } from "@mui/material";

const filterOptions = ["From", "Has attachment", "Any time", "To", "Is unread"];

const SearchResultFilters = () => {
  return (
    <Stack direction="row" spacing={1} p={2}>
      {filterOptions.map((filter) => (
        <Chip
          key={filter}
          sx={{
            bgcolor: "white",
            border: "1px solid #444746",
            color: "#5f6368",
            fontWeight: "500",
            fontSize: "14px",
            height: "30px",
            borderRadius: "8px",
            "&:hover": {
              bgcolor: "#9f9e9e2b",
            },
          }}
          onClick={() => console.log("filter clicked")}
          label={
            <Stack direction="row" alignItems="center">
              {filter}
              <span
                className="material-symbols-outlined"
                style={{
                  fontSize: 24,
                  color: "rgb(68, 68, 68)",
                  marginLeft: "4px",
                }}
              >
                arrow_drop_down
              </span>
            </Stack>
          }
        />
      ))}

      <Button variant="text" size="small" sx={{ textTransform: "none", px: 1.5, borderRadius: "16px" }}>
        Advanced search
      </Button>
    </Stack>
  );
};

export default SearchResultFilters;
