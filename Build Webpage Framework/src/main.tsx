import { createRoot } from "react-dom/client";
import PrototypeRoutes from "./app/PrototypeRoutes.tsx";
import "./styles/index.css";
import { registerServiceWorker } from "./registerServiceWorker";

createRoot(document.getElementById("root")!).render(<PrototypeRoutes />);
registerServiceWorker();
