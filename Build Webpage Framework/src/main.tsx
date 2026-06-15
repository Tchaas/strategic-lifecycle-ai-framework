import { createRoot } from "react-dom/client";
import PrototypeRoutesAuthGuard from "./app/PrototypeRoutesAuthGuard.tsx";
import "./styles/index.css";
import "./styles/prototype-overrides.css";
import { registerServiceWorker } from "./registerServiceWorker";

createRoot(document.getElementById("root")!).render(<PrototypeRoutesAuthGuard />);
registerServiceWorker();
