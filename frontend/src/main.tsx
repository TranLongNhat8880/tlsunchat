
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./app/App.tsx";
import "./styles/index.css";
import { AuthProvider } from "./contexts/AuthContext.tsx";
import { AppErrorBoundary } from "./app/components/AppErrorBoundary.tsx";
import { registerPwaUpdate } from "./lib/pwaUpdate.ts";

registerPwaUpdate();

window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    window.location.reload();
  }
});

createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <AppErrorBoundary>
      <AuthProvider>
        <App />
      </AuthProvider>
    </AppErrorBoundary>
  </BrowserRouter>
);
  
