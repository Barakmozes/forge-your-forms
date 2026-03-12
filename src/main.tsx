import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initGlobalErrorHandlers } from "@/lib/errorLogger";
import { initWebVitals } from "@/lib/analytics";

// Initialize global error handlers (window.onerror, unhandledrejection)
initGlobalErrorHandlers();

// Initialize Web Vitals tracking
initWebVitals();

createRoot(document.getElementById("root")!).render(<App />);
