import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock onUnmounted since we're not in a component context
vi.mock('vue', async () => {
  const actual = await vi.importActual('vue')
  return {
    ...(actual as object),
    onUnmounted: vi.fn(),
  }
})

import { useTimer } from '../../src/composables/useTimer'

describe('useTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('initializes with 0 seconds and not running', () => {
    const { seconds, isRunning } = useTimer()
    expect(seconds.value).toBe(0)
    expect(isRunning.value).toBe(false)
  })

  it('starts countdown', () => {
    const { seconds, isRunning, start } = useTimer()
    start(60)
    expect(seconds.value).toBe(60)
    expect(isRunning.value).toBe(true)
  })

  it('counts down each second', () => {
    const { seconds, start } = useTimer()
    start(5)
    vi.advanceTimersByTime(1000)
    expect(seconds.value).toBe(4)
    vi.advanceTimersByTime(1000)
    expect(seconds.value).toBe(3)
  })

  it('calls onComplete when reaching 0', () => {
    const onComplete = vi.fn()
    const { seconds, isRunning, start } = useTimer(onComplete)
    start(2)
    vi.advanceTimersByTime(2000)
    expect(seconds.value).toBe(0)
    expect(isRunning.value).toBe(false)
    expect(onComplete).toHaveBeenCalledOnce()
  })

  it('pauses and resumes', () => {
    const { seconds, isRunning, start, pause, resume } = useTimer()
    start(10)
    vi.advanceTimersByTime(3000)
    expect(seconds.value).toBe(7)

    pause()
    expect(isRunning.value).toBe(false)
    vi.advanceTimersByTime(5000)
    expect(seconds.value).toBe(7) // unchanged

    resume()
    expect(isRunning.value).toBe(true)
    vi.advanceTimersByTime(2000)
    expect(seconds.value).toBe(5)
  })

  it('resets to 0', () => {
    const { seconds, isRunning, start, reset } = useTimer()
    start(30)
    vi.advanceTimersByTime(5000)
    reset()
    expect(seconds.value).toBe(0)
    expect(isRunning.value).toBe(false)
  })

  it('formats time as M:SS', () => {
    const { formattedTime, start } = useTimer()
    start(125)
    expect(formattedTime.value).toBe('2:05')
    vi.advanceTimersByTime(5000)
    expect(formattedTime.value).toBe('2:00')
    vi.advanceTimersByTime(60000)
    expect(formattedTime.value).toBe('1:00')
  })
})
