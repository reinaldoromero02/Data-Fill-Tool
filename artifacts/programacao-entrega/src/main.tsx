import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { setBaseUrl } from "@workspace/api-client-react";

// When deployed to Vercel the frontend is served separately from the API.
// VITE_API_URL must be set to the Render backend URL so that all /api calls
// are routed to the correct host instead of falling back to relative paths.
if (import.meta.env.VITE_API_URL) {
  setBaseUrl(import.meta.env.VITE_API_URL);
}

createRoot(document.getElementById("root")!).render(<App />);
