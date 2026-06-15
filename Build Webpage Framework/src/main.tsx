import { createRoot } from "react-dom/client";
import PrototypeRoutesCorrected from "./app/PrototypeRoutesCorrected.tsx";
import "./styles/index.css";
import { registerServiceWorker } from "./registerServiceWorker";

createRoot(document.getElementById("root")!).render(<PrototypeRoutesCorrected />);
registerServiceWorker();
