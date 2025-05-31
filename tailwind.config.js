/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,ts}", "./node_modules/flowbite/**/*.js"],
  theme: {
    extend: {
      colors: {
        curaTeal: "#2EBAA5", // More vibrant teal
        curaGreenBlue: "#5CC8BF", // Brighter green-blue
        curaBlue: "#1A91DA", // Richer blue for hovers
        curaSoftGreen: "#7FDCA4", // Softer green accent
        curaOffWhite: "#F9FBFA", // Slightly warmer off-white
        curaLightGray: "#D4DAD9", // Softer gray
        curaDarkGray: "#3A4F50", // Deeper gray for text
      },
      fontFamily: {
        poppins: ["Poppins", "sans-serif"],
      },
    },
  },
  plugins: [require("flowbite/plugin")],
};
