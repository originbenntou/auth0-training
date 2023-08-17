module.exports = {
  content: [
    './components/*.{html,js,ts,vue}',
    './layouts/*.{html,js,ts,vue}',
    './pages/*.{html,js,ts,vue}',
    './app.vue',
  ],
  theme: {
    minWidth: {
      600: '600px',
    },
    extend: {},
    fontFamily: {},
  },
  plugins: [
    require('@tailwindcss/typography'),
    require('prettier-plugin-tailwindcss'),
    require('daisyui'),
  ],
  daisyui: {
    themes: ['light'],
  },
}
