
  import { createRoot } from "react-dom/client";
  import App from "./app/App.tsx";
  import "./styles/index.css";
  import { registerServiceWorker } from "./registerServiceWorker";

  createRoot(document.getElementById("root")!).render(<App />);
  registerServiceWorker();
  
