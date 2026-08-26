import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { Provider as BalancerProvider } from "react-wrap-balancer";



createRoot(document.getElementById("root")!).render(
  <BalancerProvider>
    <App />
  </BalancerProvider>
);
