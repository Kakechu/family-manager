import express from "express";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
	res.json({ status: "ok" });
});

const port = process.env.PORT ?? 4000;

app.listen(port, () => {
	// eslint-disable-next-line no-console
	console.log(`API server listening on port ${port}`);
});
