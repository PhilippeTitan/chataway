// Sanctuary Haptic Feedback Engine [Q47]
// Gracefully handles devices without vibration capability (desktop/iOS Safari)

export const haptics = {
  /** Light micro-tick for chip clicks, search tags, buttons (10ms) */
  lightTap(): void {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try { navigator.vibrate(10) } catch {}
    }
  },

  /** Solid confirmation for quest acceptance, dice roll, or video select (25ms) */
  confirm(): void {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try { navigator.vibrate(25) } catch {}
    }
  },

  /** Rhythmic heartbeat for hold-to-edge stopwatch, queue pulse, pre-climax ember (30-80-50ms) */
  heartbeat(): void {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try { navigator.vibrate([30, 80, 50]) } catch {}
    }
  },

  /** Resonant celestial vibration for mutual climax celebration [Q087] */
  celestialPulse(): void {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try { navigator.vibrate([60, 100, 80, 100, 120]) } catch {}
    }
  },

  /** Soft double tap for back actions or cancellation */
  cancel(): void {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try { navigator.vibrate([15, 40, 15]) } catch {}
    }
  }
}
