// Single Plotly component built on the lightweight basic dist (scatter + core
// layout: log axes, subplots, shapes, annotations — all we need).
import createPlotlyComponent from "react-plotly.js/factory";
import Plotly from "plotly.js-basic-dist-min";

export const Plot = createPlotlyComponent(Plotly);
