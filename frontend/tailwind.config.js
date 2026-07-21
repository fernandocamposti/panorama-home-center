/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        panel: "#101828",
        panelalt: "#182236",
        panelborder: "#1f2a3d",
      },
    },
  },
  plugins: [],
};
