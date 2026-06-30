import { createRoot } from "react-dom/client";
import WireframeApp from "./app/WireframeApp.tsx";
import "./styles/index.css";
import "./styles/prototype-overrides.css";
import { registerServiceWorker } from "./registerServiceWorker";

createRoot(document.getElementById("root")!).render(<WireframeApp />);
registerServiceWorker();
