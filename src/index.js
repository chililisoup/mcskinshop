import React from "react";
import { createRoot } from "react-dom/client";
import "./main.css";
import SkinManager from "./components/special/skinmanager";

const container = document.getElementById("root");
const root = createRoot(container);

root.render(
    <React.StrictMode>
        <SkinManager />
    </React.StrictMode>
);