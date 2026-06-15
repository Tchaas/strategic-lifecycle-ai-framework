import { createRoot } from "react-dom/client";
import PrototypeRoutesAuthFlow from "./app/PrototypeRoutesAuthFlow.tsx";
import "./styles/index.css";
import "./styles/prototype-overrides.css";
import { registerServiceWorker } from "./registerServiceWorker";

createRoot(document.getElementById("root")!).render(<PrototypeRoutesAuthFlow />);
registerServiceWorker();
