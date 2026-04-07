import { ref, computed, onUnmounted } from 'vue'

export function useTimer(onComplete?: () => void) {
  const seconds = ref(0)
  const isRunning = ref(false)
  let intervalId: ReturnType<typeof setInterval> | null = null

  const formattedTime = computed(() => {
    const m = Math.floor(seconds.value / 60)
    const s = seconds.value % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  })

  function clearTimer() {
    if (intervalId !== null) {
      clearInterval(intervalId)
      intervalId = null
    }
  }

  function start(durationSeconds: number) {
    clearTimer()
    seconds.value = durationSeconds
    isRunning.value = true
    intervalId = setInterval(() => {
      if (seconds.value <= 1) {
        seconds.value = 0
        isRunning.value = false
        clearTimer()
        onComplete?.()
      } else {
        seconds.value--
      }
    }, 1000)
  }

  function pause() {
    if (isRunning.value) {
      isRunning.value = false
      clearTimer()
    }
  }

  function resume() {
    if (!isRunning.value && seconds.value > 0) {
      isRunning.value = true
      intervalId = setInterval(() => {
        if (seconds.value <= 1) {
          seconds.value = 0
          isRunning.value = false
          clearTimer()
          onComplete?.()
        } else {
          seconds.value--
        }
      }, 1000)
    }
  }

  function reset() {
    clearTimer()
    seconds.value = 0
    isRunning.value = false
  }

  onUnmounted(() => {
    clearTimer()
  })

  return {
    seconds,
    isRunning,
    start,
    pause,
    resume,
    reset,
    formattedTime,
  }
}
