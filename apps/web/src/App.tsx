import { Box, CssBaseline, Typography } from "@mui/material";
import React from "react";
import { CalendarPage } from "./features/calendar/CalendarPage";

function App() {
	return (
		<>
			<CssBaseline />
			<Box sx={{ mt: 4, mb: 4 }}>
				<Typography variant="h4" component="h1" align="center" gutterBottom>
					FamilyManager
				</Typography>
				<CalendarPage />
			</Box>
		</>
	);
}

export default App;
