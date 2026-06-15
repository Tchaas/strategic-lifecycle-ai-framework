import { createRoot } from "react-dom/client";
import PrototypeRoutesValueStreams from "./app/PrototypeRoutesValueStreams.tsx";
import "./styles/index.css";
import "./styles/prototype-overrides.css";
import { registerServiceWorker } from "./registerServiceWorker";

createRoot(document.getElementById("root")!).render(<PrototypeRoutesValueStreams />);
registerServiceWorker();
