import React from "react";

import './index.css'

type Props = {};

export default function Loading({}: Props) {
  return (
    <div
      style={{
        position: "absolute",
        height: "100%",
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "white",
        opacity: 0.6,
        zIndex: 999,
      }}
    >
      <div className="lds-dual-ring"></div>
    </div>
  );
}
