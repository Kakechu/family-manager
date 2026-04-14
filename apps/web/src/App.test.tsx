import React from "react";
import ReactDOM from "react-dom/client";
import { act } from "react-dom/test-utils";
import { describe, expect, it } from "vitest";
import App from "./App";

// Basic smoke test to ensure App renders without crashing into a detached DOM node.
describe("App", () => {
	it("renders into a root element without crashing", () => {
		const container = document.createElement("div");

		// React 18 root API
		const root = ReactDOM.createRoot(container);

		act(() => {
			root.render(
				<React.StrictMode>
					<App />
				</React.StrictMode>,
			);
		});

		expect(container.innerHTML).toContain("FamilyManager");
	});
});
