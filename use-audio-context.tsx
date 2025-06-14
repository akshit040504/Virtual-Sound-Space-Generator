"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

interface AudioContextType {
  audioContext: AudioContext | null
  masterGain: GainNode | null
}

const AudioContextContext = createContext<AudioContextType>({
  audioContext: null,
  masterGain: null,
})

export function AudioContextProvider({ children }: { children: ReactNode }) {
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null)
  const [masterGain, setMasterGain] = useState<GainNode | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    // Try to initialize immediately if possible (some browsers allow this)
    try {
      const context = new (window.AudioContext || (window as any).webkitAudioContext)()
      const gainNode = context.createGain()
      gainNode.gain.value = 0.8 // Default volume
      gainNode.connect(context.destination)

      setAudioContext(context)
      setMasterGain(gainNode)
      setIsInitialized(true)

      // If context is in suspended state, we'll still need user interaction
      if (context.state === "suspended") {
        const resumeOnInteraction = () => {
          context
            .resume()
            .then(() => {
              window.removeEventListener("click", resumeOnInteraction)
              window.removeEventListener("touchstart", resumeOnInteraction)
            })
            .catch((err) => {
              console.error("Failed to resume audio context:", err)
            })
        }

        window.addEventListener("click", resumeOnInteraction)
        window.addEventListener("touchstart", resumeOnInteraction)
      }
    } catch (error) {
      console.error("Initial AudioContext creation failed:", error)

      // Fall back to interaction-based initialization
      const initAudioContext = () => {
        if (isInitialized) return

        try {
          const context = new (window.AudioContext || (window as any).webkitAudioContext)()
          const gainNode = context.createGain()
          gainNode.gain.value = 0.8 // Default volume
          gainNode.connect(context.destination)

          setAudioContext(context)
          setMasterGain(gainNode)
          setIsInitialized(true)

          // Remove event listeners once initialized
          window.removeEventListener("click", initAudioContext)
          window.removeEventListener("touchstart", initAudioContext)
        } catch (error) {
          console.error("AudioContext initialization failed:", error)
        }
      }

      window.addEventListener("click", initAudioContext)
      window.addEventListener("touchstart", initAudioContext)

      return () => {
        window.removeEventListener("click", initAudioContext)
        window.removeEventListener("touchstart", initAudioContext)
      }
    }

    return () => {
      // Clean up AudioContext when component unmounts
      if (audioContext) {
        audioContext.close().catch((err) => {
          console.error("Error closing audio context:", err)
        })
      }
    }
  }, [isInitialized])

  return <AudioContextContext.Provider value={{ audioContext, masterGain }}>{children}</AudioContextContext.Provider>
}

export function useAudioContext() {
  return useContext(AudioContextContext)
}

