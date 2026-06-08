
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./app/App.tsx";
import "./styles/index.css";
import { AuthProvider } from "./contexts/AuthContext.tsx";
import { AppErrorBoundary } from "./app/components/AppErrorBoundary.tsx";
import { registerPwaUpdate } from "./lib/pwaUpdate.ts";

registerPwaUpdate();

window.addEventListener('pageshow', (event) => {
  const root = document.getElementById("root");
  if (event.persisted && root && root.childElementCount === 0) {
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
  
