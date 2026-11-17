export default defineAppConfig({
  ui: {
    colors: {
      // Leaf-green actions, sun-yellow highlights, on moss-green glass (colours in main.css).
      primary: 'leaf',
      secondary: 'sun',
      neutral: 'moss',
    },
    button: {
      slots: {
        base: 'transition-transform active:scale-95',
      },
    },
  },
})
