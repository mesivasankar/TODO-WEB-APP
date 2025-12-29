import React from "react";
import logo from "../assets/logo-light.png";

export default function Logo({ size = 64 }) {
  return (
    <img
      src={logo}
      alt="Brand logo"
      width={size}
      height={size}
    />
  );
}
