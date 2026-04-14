import cors from "cors";
import cookieParser from "cookie-parser";
import express from "express";
import authRouter from "./modules/auth/routes";
import familyMembersRouter from "./modules/family-members/routes";

const app = express();

app.use(cors());
app.use(express.json());
app.use(cookieParser());

app.get("/health", (_req, res) => {
	res.json({ status: "ok" });
});

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/family-members", familyMembersRouter);

const port = process.env.PORT ?? 4000;

app.listen(port, () => {
	// eslint-disable-next-line no-console
	console.log(`API server listening on port ${port}`);
});
