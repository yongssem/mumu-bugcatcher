/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        mumu: {
          sky: '#7EC8F0',
          grass: '#6AB150',
          dirt: '#9B6B43',
          stone: '#8A8F98',
          gold: '#F2C14E',
          zombie: '#5A8F3C',
          night: '#1A2B4A',
          dino: '#5F7A3A', // 공룡 올리브
          eye: '#C9A227', // 공룡 눈 호박색
        },
      },
      fontFamily: {
        pixel: ['Galmuri11', 'Pretendard', 'sans-serif'],
        sans: ['Pretendard', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
