/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: [
    './index.html',
    './src/**/*.{ts,tsx,js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        skipli: {
          red: '#EA3829',
          blue: '#0052CC',
          'blue-hover': '#0065FF',
        },
        trello: {
          topbar: '#1D2125',
          sidebar: '#161A1D',
          workspace: '#22272B',
          boardbar: '#89609E',
          column: '#101214',
          card: '#22272B',
          modal: '#282E33',
          border: '#3C474F',
          text: '#B6C2CF',
          heading: '#DEE4EA',
        },
      },
      fontFamily: {
        sans: ['"Inter"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      borderRadius: {
        lg: '8px',
        xl: '12px',
      },
    },
  },
  plugins: [],
};
