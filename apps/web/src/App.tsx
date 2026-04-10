import { Container, CssBaseline, Typography } from "@mui/material";
import React from "react";

function App() {
	return (
		<>
			<CssBaseline />
			<Container maxWidth="sm" sx={{ mt: 4 }}>
				<Typography variant="h4" component="h1" gutterBottom>
					FamilyManager
				</Typography>
				<Typography>
					Frontend is running. Hook this up to the API next.
				</Typography>
			</Container>
		</>
	);
}

export default App;
