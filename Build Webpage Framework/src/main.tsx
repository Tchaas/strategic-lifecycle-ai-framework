import { createRoot } from "react-dom/client";
import PrototypeRoutesInvites from "./app/PrototypeRoutesInvites.tsx";
import "./styles/index.css";
import "./styles/prototype-overrides.css";
import { registerServiceWorker } from "./registerServiceWorker";

createRoot(document.getElementById("root")!).render(<PrototypeRoutesInvites />);
registerServiceWorker();
