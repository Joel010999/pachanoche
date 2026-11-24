import type { NextConfig } from "next";

const config: NextConfig = {
  devIndicators: false,
  images: {
    remotePatterns: [new URL("https://copernicuslac-chile.eu/wp-content/uploads/2026/04/Salinas-Grandes.jpg")],
  },
};

export default config;
