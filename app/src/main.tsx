import { createRoot } from "react-dom/client";
import { loadData } from "./data";
import { App } from "./App";
import "./styles.css";

const mount = document.getElementById("wisspar-app");
if (mount) {
  const url = mount.getAttribute("data-data-url") || "data/wisspar_export.json";
  mount.innerHTML = '<div class="wisspar-loading">Loading immunogenicity data…</div>';
  loadData(url)
    .then((rows) => {
      const root = createRoot(mount);
      root.render(<App rows={rows} />);
    })
    .catch((err) => {
      mount.innerHTML = `<div class="wisspar-error">Could not load immunogenicity data: ${
        err?.message ?? err
      }</div>`;
    });
}
