import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./styles/globals.css";
import "plyr/dist/plyr.css";
import "./styles/reel-player.css";

createRoot(document.getElementById("root")!).render(<App />);