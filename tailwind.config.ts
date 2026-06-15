import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        kp: {
          ink: "#17201b",
          green: "#285a3b",
          lime: "#b7d254",
          amber: "#d8902d",
          clay: "#9f5134",
          paper: "#f6f4ee",
          line: "#d9d6ca"
        }
      },
      boxShadow: {
        panel: "0 1px 2px rgba(23, 32, 27, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
