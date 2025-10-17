import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { config } from "./config";

// Rewrite relative /api requests to absolute API URL at runtime and enforce Accept header
const originalFetch = window.fetch.bind(window);
window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
  const urlStr = typeof input === 'string' ? input : input instanceof URL ? input.toString() : String(input);
  const isApi = typeof urlStr === 'string' && urlStr.startsWith('/api/');

  // Build headers with Accept default
  const headersObj: Record<string, string> = {
    Accept: 'application/json',
    ...(init?.headers ? (init.headers as Record<string, string>) : {}),
  };

  if (isApi) {
    const absolute = `${config.apiUrl}${urlStr}`;
    return originalFetch(absolute, { ...init, headers: headersObj });
  }

  return originalFetch(input as any, { ...init, headers: headersObj });
};

createRoot(document.getElementById("root")!).render(<App />);
