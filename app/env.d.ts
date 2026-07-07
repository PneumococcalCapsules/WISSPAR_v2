/// <reference types="vite/client" />

// plotly.js-basic-dist-min ships no types; treat as the plotly.js module shape.
declare module "plotly.js-basic-dist-min" {
  const Plotly: any;
  export default Plotly;
}
