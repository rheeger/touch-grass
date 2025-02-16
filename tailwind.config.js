/** @type {import('tailwindcss').Config} */
import tailwindScrollbar from "tailwind-scrollbar";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/styles/**/*.css",
  ],
  theme: {
    extend: {
      keyframes: {
        rainbow: {
          "0%": { color: "#ff0000" },
          "14%": { color: "#ff7f00" },
          "28%": { color: "#ffff00" },
          "42%": { color: "#00ff00" },
          "57%": { color: "#0000ff" },
          "71%": { color: "#4b0082" },
          "85%": { color: "#8f00ff" },
          "100%": { color: "#ff0000" },
        },
      },
      animation: {
        "rainbow-text": "rainbow 2s linear infinite",
      },
    },
  },
  plugins: [tailwindScrollbar({ nocompatible: true })],
};
