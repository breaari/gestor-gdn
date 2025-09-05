/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./index.html"
  ],
  theme: { extend: {
    colors: {
        azuloscuro:   "#0F172B",
        azulceleste:  "#155DFC",
        rojonaranja:  "#F83A32",
      },} },
  plugins: [],
};
