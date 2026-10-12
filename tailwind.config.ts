import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cream: "#FFF6EE",
        ink: { DEFAULT: "#2B211C", soft: "#6B5E57", faint: "#A3968F" },
        line: "#F1E4D8",
        todo: { DEFAULT: "#E4572E", text: "#C8441F", soft: "#FDE6DD" },
        buy: { DEFAULT: "#0F7A6F", soft: "#DCF1EE" },
        research: { DEFAULT: "#6741B0", soft: "#ECE4F8" },
        notes: { DEFAULT: "#1F4E86", soft: "#DFE9F5" },
        inbox: { DEFAULT: "#475467", soft: "#E9ECF0" },
        danger: { DEFAULT: "#D92D20", soft: "#FDE3E1", text: "#B42318" },
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        card: "20px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(80, 45, 20, 0.04), 0 4px 16px rgba(80, 45, 20, 0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
