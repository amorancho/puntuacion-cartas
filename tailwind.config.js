/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.js"],
  theme: {
    extend: {
      colors: {
        ink: "#18221c",
        cream: "#f5f0e5",
        paper: "#fffdf8",
        felt: {
          50: "#edf7f0",
          100: "#d8ecdf",
          200: "#b2d9bf",
          500: "#347a4e",
          600: "#28643e",
          700: "#205033",
          800: "#1c402b",
          900: "#183524"
        },
        electric: "#b86a00",
        exact: "#a83e35"
      },
      boxShadow: {
        card: "0 14px 38px rgba(24, 34, 28, 0.09)",
        lift: "0 8px 22px rgba(24, 34, 28, 0.14)"
      }
    }
  },
  plugins: []
};

