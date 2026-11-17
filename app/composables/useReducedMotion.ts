/** Whether the player asked their device for less motion (animations then stay simple). */
export function useReducedMotion() {
  const reduced = useState('reduced-motion', () => false)
  onMounted(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    reduced.value = query.matches
    const onChange = () => (reduced.value = query.matches)
    query.addEventListener('change', onChange)
    onBeforeUnmount(() => query.removeEventListener('change', onChange))
  })
  return reduced
}
