import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AtlasApp } from "@/components/atlas/AtlasApp";
import "@/styles.css";

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(
    <StrictMode>
      <AtlasApp />
    </StrictMode>,
  );
}
