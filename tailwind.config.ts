import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Fall palette: parchment, brick red, mustard, chestnut, charcoal, olive.
        cream: "#F8F1E7",
        ink: { DEFAULT: "#231B16", soft: "#6B5D52", faint: "#A39587" },
        line: "#EADFD2",
        todo: { DEFAULT: "#8E2C22", text: "#7A231B", soft: "#F5E1DC" },
        buy: { DEFAULT: "#9C6B0E", soft: "#F8ECCF" },
        research: { DEFAULT: "#7A4A2A", soft: "#F0E3D6" },
        notes: { DEFAULT: "#2A2522", soft: "#E9E4DF" },
        inbox: { DEFAULT: "#5F5A36", soft: "#ECEADC" },
        partial: { DEFAULT: "#C08A1E", soft: "#FBF1D6" },
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
