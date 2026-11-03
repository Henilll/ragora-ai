import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0C0E11",
        panel: "#171B21",
        line: "#262C36",
        accent: "#E8490F",
      },
      boxShadow: {
        glow: "0 12px 32px rgba(0,0,0,0.28)",
      },
    },
  },
  plugins: [],
};

export default config;
