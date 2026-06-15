import { createRoot } from "react-dom/client";
import PrototypeRoutesIntegratedFlow from "./app/PrototypeRoutesIntegratedFlow.tsx";
import "./styles/index.css";
import "./styles/prototype-overrides.css";
import { registerServiceWorker } from "./registerServiceWorker";

createRoot(document.getElementById("root")!).render(<PrototypeRoutesIntegratedFlow />);
registerServiceWorker();
