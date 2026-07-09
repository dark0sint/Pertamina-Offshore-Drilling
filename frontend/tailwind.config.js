/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        pertamina: {
          red: "#DA251D",
          darkred: "#A31E17",
          green: "#00954C",
          navy: "#0B1F3A",
        },
      },
    },
  },
  plugins: [],
};
