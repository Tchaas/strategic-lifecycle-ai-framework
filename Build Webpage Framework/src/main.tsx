import { createRoot } from "react-dom/client";
import PrototypeRoutesBuildFixed from "./app/PrototypeRoutesBuildFixed.tsx";
import "./styles/index.css";
import { registerServiceWorker } from "./registerServiceWorker";

createRoot(document.getElementById("root")!).render(<PrototypeRoutesBuildFixed />);
registerServiceWorker();
