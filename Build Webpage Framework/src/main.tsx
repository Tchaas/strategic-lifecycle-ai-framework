import { createRoot } from "react-dom/client";
import PrototypeRoutesStrategicObjectives from "./app/PrototypeRoutesStrategicObjectives.tsx";
import "./styles/index.css";
import "./styles/prototype-overrides.css";
import { registerServiceWorker } from "./registerServiceWorker";

createRoot(document.getElementById("root")!).render(<PrototypeRoutesStrategicObjectives />);
registerServiceWorker();
