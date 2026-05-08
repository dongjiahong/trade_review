export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        ink: {
          950: '#081018',
          900: '#0b141d',
          850: '#101b25',
          800: '#142230',
          700: '#203245',
        },
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(34, 211, 238, 0.12), 0 18px 60px rgba(0, 0, 0, 0.35)',
      },
    },
  },
  plugins: [],
};
