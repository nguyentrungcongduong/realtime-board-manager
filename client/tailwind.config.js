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
      boxShadow: {
        soft: '0 4px 20px -2px rgba(0, 0, 0, 0.08)',
        hover: '0 10px 25px -5px rgba(0, 0, 0, 0.15)',
        button: '0 4px 14px 0 rgba(0, 82, 204, 0.3)',
        glow: '0 0 20px rgba(0, 82, 204, 0.5)',
      },
      borderRadius: {
        lg: '8px',
        xl: '12px',
      },
    },
  },
  plugins: [],
};
