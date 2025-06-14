"use client"

import { useState, useEffect, useRef } from "react"
import { motion } from "framer-motion"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Save, Volume2, Play, Pause, Share2, Music, Headphones } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import SoundVisualizer from "@/components/sound-visualizer"
import { useAudioContext } from "@/hooks/use-audio-context"
import { Progress } from "@/components/ui/progress"

interface Sound {
  id: string
  name: string
  icon: string
  volume: number
  active: boolean
  source?: AudioBufferSourceNode
  gainNode?: GainNode
  buffer?: AudioBuffer
}

interface Preset {
  id: string
  name: string
  description: string
  sounds: {
    id: string
    volume: number
  }[]
}

export default function SoundMixer() {
  const { toast } = useToast()
  const [isPlaying, setIsPlaying] = useState(false)
  const [masterVolume, setMasterVolume] = useState(0.8)
  const [saveName, setSaveName] = useState("")
  const [savedSoundscapes, setSavedSoundscapes] = useState<{ name: string; sounds: Sound[] }[]>([])
  const { audioContext, masterGain } = useAudioContext()
  const [isLoading, setIsLoading] = useState(true)
  const [recordingState, setRecordingState] = useState<"inactive" | "recording" | "processing">("inactive")
  const [recordingProgress, setRecordingProgress] = useState(0)
  const [recordingDuration, setRecordingDuration] = useState(30) // Default 30 seconds
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordedChunksRef = useRef<Blob[]>([])
  const recordingStartTimeRef = useRef<number>(0)
  const downloadLinkRef = useRef<HTMLAnchorElement>(null)

  const [sounds, setSounds] = useState<Sound[]>([
    { id: "rain", name: "Rain", icon: "🌧️", volume: 0.5, active: false },
    { id: "thunder", name: "Thunder", icon: "⚡", volume: 0.3, active: false },
    { id: "forest", name: "Forest", icon: "🌳", volume: 0.6, active: false },
    { id: "waves", name: "Ocean Waves", icon: "🌊", volume: 0.7, active: false },
    { id: "fire", name: "Crackling Fire", icon: "🔥", volume: 0.5, active: false },
    { id: "birds", name: "Birds", icon: "🐦", volume: 0.4, active: false },
    { id: "wind", name: "Wind", icon: "💨", volume: 0.3, active: false },
    { id: "cafe", name: "Café Ambience", icon: "☕", volume: 0.4, active: false },
  ])

  const presets: Preset[] = [
    {
      id: "rainy-night",
      name: "Rainy Night",
      description: "The soothing sound of rain with occasional thunder",
      sounds: [
        { id: "rain", volume: 0.7 },
        { id: "thunder", volume: 0.3 },
      ],
    },
    {
      id: "forest-retreat",
      name: "Forest Retreat",
      description: "Immerse yourself in a peaceful forest with birdsong",
      sounds: [
        { id: "forest", volume: 0.6 },
        { id: "birds", volume: 0.5 },
        { id: "wind", volume: 0.2 },
      ],
    },
    {
      id: "beach-day",
      name: "Ocean Escape",
      description: "Relaxing ocean waves for meditation or focus",
      sounds: [
        { id: "waves", volume: 0.8 },
        { id: "wind", volume: 0.3 },
      ],
    },
    {
      id: "cozy-campfire",
      name: "Cozy Campfire",
      description: "The warm crackling of a fire in the wilderness",
      sounds: [
        { id: "fire", volume: 0.6 },
        { id: "forest", volume: 0.3 },
        { id: "wind", volume: 0.2 },
      ],
    },
  ]

  // Add this at the beginning of the component, right after the state declarations
  useEffect(() => {
    // If we don't have an audio context yet, don't show loading state
    if (!audioContext) {
      setIsLoading(false)
    }
  }, [])

  // Generate audio buffers for each sound type
  useEffect(() => {
    if (!audioContext) {
      // Don't show loading if audio context isn't initialized yet
      setIsLoading(false)
      return
    }

    const generateSoundBuffer = async (soundId: string): Promise<AudioBuffer> => {
      // Create a 3-second buffer (3 * sampleRate)
      const bufferSize = 3 * audioContext.sampleRate
      const buffer = audioContext.createBuffer(2, bufferSize, audioContext.sampleRate)

      // Get the channel data
      const leftChannel = buffer.getChannelData(0)
      const rightChannel = buffer.getChannelData(1)

      // Generate different patterns based on sound type
      switch (soundId) {
        case "rain":
          // White noise with varying intensity
          for (let i = 0; i < bufferSize; i++) {
            const noise = Math.random() * 0.1
            const intensity = 0.7 + 0.3 * Math.sin(i / 20000)
            leftChannel[i] = noise * intensity
            rightChannel[i] = noise * intensity * 0.9 // Slightly different for stereo effect
          }
          break

        case "thunder":
          // Occasional loud bursts
          for (let i = 0; i < bufferSize; i++) {
            const base = Math.random() * 0.01
            // Add thunder burst
            if (i % 30000 < 5000) {
              const burst = Math.random() * 0.3 * Math.exp((-i % 30000) / 2000)
              leftChannel[i] = base + burst
              rightChannel[i] = base + burst * 0.8
            } else {
              leftChannel[i] = base
              rightChannel[i] = base
            }
          }
          break

        case "forest":
          // Gentle ambient noise with occasional chirps
          for (let i = 0; i < bufferSize; i++) {
            const base = Math.random() * 0.03
            // Add random chirps
            if (Math.random() < 0.001) {
              const chirpLength = Math.floor(Math.random() * 1000) + 500
              for (let j = 0; j < chirpLength && i + j < bufferSize; j++) {
                const chirp = 0.2 * Math.sin(j * 0.1) * Math.exp(-j / 200)
                leftChannel[i + j] = base + chirp
                rightChannel[i + j] = base + chirp * 0.9
              }
              i += chirpLength
            } else {
              leftChannel[i] = base
              rightChannel[i] = base * 0.95
            }
          }
          break

        case "waves":
          // Slow oscillating waves
          for (let i = 0; i < bufferSize; i++) {
            const wave = 0.1 * Math.sin(i / 10000) + 0.05 * Math.sin(i / 5000)
            const noise = Math.random() * 0.05
            leftChannel[i] = wave + noise
            rightChannel[i] = wave * 0.9 + noise * 0.9
          }
          break

        case "fire":
          // Crackling fire sounds
          for (let i = 0; i < bufferSize; i++) {
            const base = Math.random() * 0.03
            // Add crackles
            if (Math.random() < 0.01) {
              const crackle = Math.random() * 0.2
              leftChannel[i] = base + crackle
              rightChannel[i] = base + crackle * 0.8
            } else {
              leftChannel[i] = base
              rightChannel[i] = base * 0.9
            }
          }
          break

        case "birds":
          // Bird chirps on a quiet background
          for (let i = 0; i < bufferSize; i++) {
            const base = Math.random() * 0.01
            // Add bird chirps
            if (Math.random() < 0.002) {
              const chirpLength = Math.floor(Math.random() * 2000) + 1000
              const chirpFreq = Math.random() * 20 + 10
              for (let j = 0; j < chirpLength && i + j < bufferSize; j++) {
                const chirp = 0.15 * Math.sin((j * chirpFreq) / 1000) * Math.exp(-j / 500)
                leftChannel[i + j] = base + chirp
                rightChannel[i + j] = base + chirp * (Math.random() * 0.4 + 0.6) // Pan randomly
              }
              i += chirpLength
            } else {
              leftChannel[i] = base
              rightChannel[i] = base
            }
          }
          break

        case "wind":
          // Howling wind
          for (let i = 0; i < bufferSize; i++) {
            const windSpeed = 0.05 + 0.04 * Math.sin(i / 40000)
            const noise = Math.random() * windSpeed
            leftChannel[i] = noise
            rightChannel[i] = Math.random() * windSpeed // Different for stereo effect
          }
          break

        case "cafe":
          // Ambient chatter and clinking
          for (let i = 0; i < bufferSize; i++) {
            const base = Math.random() * 0.02
            // Add occasional clinks
            if (Math.random() < 0.001) {
              const clinkLength = Math.floor(Math.random() * 500) + 100
              for (let j = 0; j < clinkLength && i + j < bufferSize; j++) {
                const clink = 0.1 * Math.sin(j * 0.3) * Math.exp(-j / 100)
                leftChannel[i + j] = base + clink
                rightChannel[i + j] = base + clink * 0.7
              }
              i += clinkLength
            } else {
              leftChannel[i] = base
              rightChannel[i] = base * 0.95
            }
          }
          break

        default:
          // Default white noise
          for (let i = 0; i < bufferSize; i++) {
            leftChannel[i] = Math.random() * 0.1 - 0.05
            rightChannel[i] = Math.random() * 0.1 - 0.05
          }
      }

      return buffer
    }

    const loadAllSounds = async () => {
      setIsLoading(true)
      try {
        // Process sounds in batches to avoid overwhelming the audio context
        const soundsCopy = [...sounds]
        const loadedSounds = []

        // Process in batches of 2 to avoid overwhelming the audio context
        while (soundsCopy.length > 0) {
          const batch = soundsCopy.splice(0, 2)
          const batchPromises = batch.map(async (sound) => {
            try {
              const buffer = await generateSoundBuffer(sound.id)
              return { ...sound, buffer }
            } catch (err) {
              console.error(`Error generating sound ${sound.id}:`, err)
              return sound // Return sound without buffer if generation fails
            }
          })

          const batchResults = await Promise.all(batchPromises)
          loadedSounds.push(...batchResults)
        }

        setSounds(loadedSounds)
      } catch (error) {
        console.error("Error generating sounds:", error)
      } finally {
        // Ensure loading state is turned off even if there's an error
        setIsLoading(false)
      }
    }

    // Add a timeout to prevent getting stuck in loading state
    const loadingTimeout = setTimeout(() => {
      setIsLoading(false)
    }, 10000) // Force loading to end after 10 seconds max

    loadAllSounds()

    return () => {
      clearTimeout(loadingTimeout)
    }
  }, [audioContext])

  // Update master volume
  useEffect(() => {
    if (masterGain) {
      masterGain.gain.value = masterVolume
    }
  }, [masterVolume, masterGain])

  const toggleSound = (id: string) => {
    setSounds((prevSounds) =>
      prevSounds.map((sound) => (sound.id === id ? { ...sound, active: !sound.active } : sound)),
    )
  }

  const updateVolume = (id: string, volume: number) => {
    setSounds((prevSounds) => prevSounds.map((sound) => (sound.id === id ? { ...sound, volume } : sound)))
  }

  const playSound = (sound: Sound) => {
    if (!audioContext || !sound.buffer || !masterGain) return

    const source = audioContext.createBufferSource()
    source.buffer = sound.buffer
    source.loop = true

    const gainNode = audioContext.createGain()
    gainNode.gain.value = sound.volume

    source.connect(gainNode)
    gainNode.connect(masterGain)

    source.start(0)

    return { source, gainNode }
  }

  const stopSound = (source?: AudioBufferSourceNode) => {
    if (source) {
      source.stop()
      source.disconnect()
    }
  }

  useEffect(() => {
    if (!audioContext) return

    // Play or stop sounds based on active state
    const activeSounds = sounds.map((sound) => {
      if (sound.active && isPlaying) {
        if (!sound.source) {
          const { source, gainNode } = playSound(sound) || {}
          return { ...sound, source, gainNode }
        } else {
          // Update volume if sound is already playing
          if (sound.gainNode) {
            sound.gainNode.gain.value = sound.volume
          }
          return sound
        }
      } else if (!sound.active && sound.source) {
        stopSound(sound.source)
        return { ...sound, source: undefined, gainNode: undefined }
      }
      return sound
    })

    setSounds(activeSounds)

    return () => {
      // Cleanup function to stop all sounds
      activeSounds.forEach((sound) => {
        if (sound.source) {
          stopSound(sound.source)
        }
      })
    }
  }, [sounds.map((s) => s.active).join(","), isPlaying, audioContext])

  // Update volume for playing sounds
  useEffect(() => {
    sounds.forEach((sound) => {
      if (sound.gainNode) {
        sound.gainNode.gain.value = sound.volume
      }
    })
  }, [sounds.map((s) => s.volume).join(",")])

  const togglePlayback = () => {
    if (audioContext?.state === "suspended") {
      audioContext.resume()
    }
    setIsPlaying(!isPlaying)
  }

  const applyPreset = (preset: Preset) => {
    setSounds((prevSounds) =>
      prevSounds.map((sound) => {
        const presetSound = preset.sounds.find((s) => s.id === sound.id)
        return {
          ...sound,
          active: !!presetSound,
          volume: presetSound?.volume || sound.volume,
        }
      }),
    )
    setIsPlaying(true)

    toast({
      title: "Preset Applied",
      description: `Now playing "${preset.name}"`,
    })
  }

  const saveCurrentSoundscape = () => {
    if (!saveName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter a name for your soundscape",
        variant: "destructive",
      })
      return
    }

    const activeSounds = sounds.filter((sound) => sound.active)
    if (activeSounds.length === 0) {
      toast({
        title: "No Sounds Selected",
        description: "Please activate at least one sound",
        variant: "destructive",
      })
      return
    }

    const newSoundscape = {
      name: saveName,
      sounds: JSON.parse(JSON.stringify(sounds)),
    }

    setSavedSoundscapes([...savedSoundscapes, newSoundscape])
    setSaveName("")

    toast({
      title: "Soundscape Saved",
      description: `"${saveName}" has been saved to your collection`,
    })
  }

  const loadSoundscape = (index: number) => {
    const soundscape = savedSoundscapes[index]
    setSounds(soundscape.sounds)
    setIsPlaying(true)

    toast({
      title: "Soundscape Loaded",
      description: `Now playing "${soundscape.name}"`,
    })
  }

  // Recording functionality
  const startRecording = () => {
    if (!audioContext || !masterGain || recordingState !== "inactive") return

    // Create a MediaStream from the audio context
    const destination = audioContext.createMediaStreamDestination()
    masterGain.connect(destination)

    // Create MediaRecorder
    const mediaRecorder = new MediaRecorder(destination.stream)
    mediaRecorderRef.current = mediaRecorder
    recordedChunksRef.current = []

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        recordedChunksRef.current.push(e.data)
      }
    }

    mediaRecorder.onstop = () => {
      // Process the recorded audio
      setRecordingState("processing")

      setTimeout(() => {
        const blob = new Blob(recordedChunksRef.current, { type: "audio/wav" })
        const url = URL.createObjectURL(blob)

        if (downloadLinkRef.current) {
          downloadLinkRef.current.href = url
          downloadLinkRef.current.download = `soundscape-${new Date().toISOString().slice(0, 10)}.wav`

          // Trigger download automatically
          downloadLinkRef.current.click()
        }

        setRecordingState("inactive")
        setRecordingProgress(0)

        toast({
          title: "Recording Complete",
          description: "Your soundscape has been recorded and downloaded.",
        })
      }, 1000)
    }

    // Start recording
    mediaRecorder.start(100) // Collect data in 100ms chunks
    recordingStartTimeRef.current = Date.now()
    setRecordingState("recording")

    // Start progress timer
    recordingTimerRef.current = setInterval(() => {
      const elapsed = (Date.now() - recordingStartTimeRef.current) / 1000
      const progress = Math.min((elapsed / recordingDuration) * 100, 100)
      setRecordingProgress(progress)

      if (elapsed >= recordingDuration) {
        stopRecording()
      }
    }, 100)
  }

  const stopRecording = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current)
      recordingTimerRef.current = null
    }

    if (mediaRecorderRef.current && recordingState === "recording") {
      mediaRecorderRef.current.stop()
    }
  }

  const shareSoundscape = () => {
    toast({
      title: "Coming Soon",
      description: "Sharing functionality will be available in a future update",
    })
  }

  // Animation variants for text elements
  const textVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut",
      },
    },
    exit: {
      opacity: 0,
      y: -20,
      transition: {
        duration: 0.4,
        ease: "easeIn",
      },
    },
  }

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { type: "spring", stiffness: 300, damping: 24 },
    },
  }

  // 3D text animation variants
  const text3dVariants = {
    hover: {
      rotateX: [0, 10, 0],
      rotateY: [0, 15, 0],
      transition: {
        duration: 1.5,
        ease: "easeInOut",
      },
    },
  }

  return (
    <div className="space-y-8 perspective-1000">
      <Card className="bg-slate-800/50 border-slate-700 overflow-hidden">
        <CardContent className="p-6 relative">
          {isLoading && (
            <div className="absolute inset-0 bg-slate-900/70 flex items-center justify-center z-10 rounded-lg">
              <div className="text-center">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="mt-2"
                >
                  Generating sounds...
                </motion.p>
              </div>
            </div>
          )}
          <div className="flex flex-col md:flex-row gap-6 items-center">
            <div className="w-full md:w-1/3">
              <SoundVisualizer isPlaying={isPlaying} activeSounds={sounds.filter((s) => s.active).length} />
            </div>

            <div className="w-full md:w-2/3 space-y-6">
              <motion.div
                className="flex items-center justify-between"
                initial="hidden"
                animate="visible"
                variants={textVariants}
              >
                <div className="flex items-center gap-3">
                  <Button
                    onClick={togglePlayback}
                    variant="outline"
                    size="icon"
                    className="h-12 w-12 rounded-full border-slate-600 bg-slate-800 hover:bg-slate-700"
                  >
                    {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
                  </Button>
                  <div className="perspective-1000">
                    <motion.h2
                      className="text-xl font-medium"
                      variants={textVariants}
                      animate={{
                        rotateX: [0, 5, 0, -5, 0],
                        rotateY: [0, 3, 0, -3, 0],
                        translateZ: [0, 10, 20, 10, 0],
                      }}
                      transition={{
                        repeat: Number.POSITIVE_INFINITY,
                        duration: 6,
                        ease: "easeInOut",
                      }}
                    >
                      Master Controls
                    </motion.h2>
                    <motion.p
                      className="text-sm text-slate-400"
                      variants={textVariants}
                      animate={{
                        rotateX: [0, 3, 0, -3, 0],
                        translateZ: [0, 5, 0],
                      }}
                      transition={{
                        repeat: Number.POSITIVE_INFINITY,
                        duration: 5,
                        ease: "easeInOut",
                        delay: 0.5,
                      }}
                    >
                      {isPlaying ? "Playing" : "Paused"} • {sounds.filter((s) => s.active).length} sounds active
                    </motion.p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Volume2 className="h-5 w-5 text-slate-400" />
                  <Slider
                    value={[masterVolume * 100]}
                    min={0}
                    max={100}
                    step={1}
                    className="w-28"
                    onValueChange={(value) => setMasterVolume(value[0] / 100)}
                  />
                </div>
              </motion.div>

              <motion.div
                className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3"
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
              >
                {sounds.map((sound) => (
                  <motion.div
                    key={sound.id}
                    variants={itemVariants}
                    whileHover={text3dVariants.hover}
                    className={`p-3 rounded-lg border transition-all card-3d ${
                      sound.active
                        ? "bg-slate-700/50 border-slate-500"
                        : "bg-slate-800/30 border-slate-700 hover:border-slate-600"
                    }`}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{sound.icon}</span>
                        <motion.span
                          className="font-medium text-sm"
                          animate={{
                            rotateX: [0, 5, 0, -5, 0],
                            translateZ: [0, 10, 0],
                          }}
                          transition={{
                            repeat: Number.POSITIVE_INFINITY,
                            duration: 8,
                            ease: "easeInOut",
                            delay: Math.random() * 2,
                          }}
                        >
                          {sound.name}
                        </motion.span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Switch checked={sound.active} onCheckedChange={() => toggleSound(sound.id)} />
                      </div>
                    </div>
                    <Slider
                      value={[sound.volume * 100]}
                      min={0}
                      max={100}
                      step={1}
                      disabled={!sound.active}
                      onValueChange={(value) => updateVolume(sound.id, value[0] / 100)}
                      className={sound.active ? "" : "opacity-50"}
                    />
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="presets" className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-slate-800/50">
          <TabsTrigger value="presets">Presets</TabsTrigger>
          <TabsTrigger value="saved">My Soundscapes</TabsTrigger>
          <TabsTrigger value="save">Save</TabsTrigger>
          <TabsTrigger value="download">Download</TabsTrigger>
        </TabsList>

        <TabsContent value="presets" className="mt-4">
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            {presets.map((preset) => (
              <motion.div key={preset.id} variants={itemVariants}>
                <Card
                  className="bg-slate-800/30 border-slate-700 hover:border-slate-600 transition-all cursor-pointer card-3d"
                  onClick={() => applyPreset(preset)}
                >
                  <CardContent className="p-4">
                    <motion.h3
                      className="text-lg font-medium mb-1 text-3d"
                      initial={{ opacity: 0 }}
                      animate={{
                        opacity: 1,
                        rotateX: [0, 3, 0, -3, 0],
                        translateZ: [0, 15, 0],
                      }}
                      transition={{
                        delay: 0.2,
                        repeat: Number.POSITIVE_INFINITY,
                        duration: 6,
                        ease: "easeInOut",
                      }}
                    >
                      {preset.name}
                    </motion.h3>
                    <motion.p
                      className="text-sm text-slate-400 mb-3"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 }}
                    >
                      {preset.description}
                    </motion.p>
                    <div className="flex flex-wrap gap-1">
                      {preset.sounds.map((sound) => {
                        const soundDetails = sounds.find((s) => s.id === sound.id)
                        return (
                          <Badge key={sound.id} variant="secondary" className="bg-slate-700">
                            {soundDetails?.icon} {soundDetails?.name}
                          </Badge>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </TabsContent>

        <TabsContent value="saved" className="mt-4">
          {savedSoundscapes.length > 0 ? (
            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
            >
              {savedSoundscapes.map((soundscape, index) => (
                <motion.div key={index} variants={itemVariants}>
                  <Card
                    className="bg-slate-800/30 border-slate-700 hover:border-slate-600 transition-all cursor-pointer card-3d"
                    onClick={() => loadSoundscape(index)}
                  >
                    <CardContent className="p-4">
                      <motion.h3
                        className="text-lg font-medium mb-2 text-3d"
                        initial={{ opacity: 0 }}
                        animate={{
                          opacity: 1,
                          rotateX: [0, 4, 0, -4, 0],
                          translateZ: [0, 10, 0],
                        }}
                        transition={{
                          delay: 0.2,
                          repeat: Number.POSITIVE_INFINITY,
                          duration: 7,
                          ease: "easeInOut",
                        }}
                      >
                        {soundscape.name}
                      </motion.h3>
                      <div className="flex flex-wrap gap-1">
                        {soundscape.sounds
                          .filter((s) => s.active)
                          .map((sound) => (
                            <Badge key={sound.id} variant="secondary" className="bg-slate-700">
                              {sound.icon} {sound.name}
                            </Badge>
                          ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              className="text-center py-12 text-slate-400"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <p className="floating-text">You haven't saved any soundscapes yet.</p>
              <p className="text-sm mt-2 floating-text" style={{ animationDelay: "0.3s" }}>
                Mix some sounds and save them to see them here.
              </p>
            </motion.div>
          )}
        </TabsContent>

        <TabsContent value="save" className="mt-4">
          <Card className="bg-slate-800/30 border-slate-700">
            <CardContent className="p-6">
              <div className="grid md:grid-cols-2 gap-8">
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
                  <motion.h3
                    className="text-lg font-medium mb-4 text-3d"
                    animate={{
                      rotateX: [0, 5, 0, -5, 0],
                      translateZ: [0, 15, 0],
                    }}
                    transition={{
                      repeat: Number.POSITIVE_INFINITY,
                      duration: 6,
                      ease: "easeInOut",
                    }}
                  >
                    Save Your Soundscape
                  </motion.h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="soundscape-name">Soundscape Name</Label>
                      <Input
                        id="soundscape-name"
                        placeholder="My Perfect Ambience"
                        value={saveName}
                        onChange={(e) => setSaveName(e.target.value)}
                        className="bg-slate-900 border-slate-700"
                      />
                    </div>
                    <Button onClick={saveCurrentSoundscape} className="w-full">
                      <Save className="mr-2 h-4 w-4" /> Save Soundscape
                    </Button>
                  </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
                  <motion.h3
                    className="text-lg font-medium mb-4 text-3d"
                    animate={{
                      rotateX: [0, 5, 0, -5, 0],
                      translateZ: [0, 15, 0],
                    }}
                    transition={{
                      repeat: Number.POSITIVE_INFINITY,
                      duration: 6,
                      ease: "easeInOut",
                      delay: 0.5,
                    }}
                  >
                    Share Your Soundscape
                  </motion.h3>
                  <div className="space-y-4">
                    <Button onClick={shareSoundscape} variant="outline" className="w-full">
                      <Share2 className="mr-2 h-4 w-4" /> Share Link
                    </Button>
                    <p className="text-xs text-slate-400 mt-2">Note: Sharing feature is coming soon.</p>
                  </div>
                </motion.div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="download" className="mt-4">
          <Card className="bg-slate-800/30 border-slate-700">
            <CardContent className="p-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="space-y-6"
              >
                <div className="flex items-center gap-4">
                  <Headphones className="h-10 w-10 text-slate-300" />
                  <div className="perspective-1000">
                    <motion.h3
                      className="text-lg font-medium text-3d"
                      animate={{
                        rotateX: [0, 5, 0, -5, 0],
                        translateZ: [0, 20, 0],
                      }}
                      transition={{
                        repeat: Number.POSITIVE_INFINITY,
                        duration: 7,
                        ease: "easeInOut",
                      }}
                    >
                      Download Your Soundscape
                    </motion.h3>
                    <motion.p
                      className="text-sm text-slate-400"
                      animate={{
                        rotateX: [0, 3, 0, -3, 0],
                        translateZ: [0, 10, 0],
                      }}
                      transition={{
                        repeat: Number.POSITIVE_INFINITY,
                        duration: 5,
                        ease: "easeInOut",
                        delay: 0.5,
                      }}
                    >
                      Record and download your current mix as an audio file
                    </motion.p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="recording-duration">Recording Duration</Label>
                    <span className="text-sm text-slate-400">{recordingDuration} seconds</span>
                  </div>
                  <Slider
                    id="recording-duration"
                    value={[recordingDuration]}
                    min={5}
                    max={60}
                    step={5}
                    onValueChange={(value) => setRecordingDuration(value[0])}
                    disabled={recordingState !== "inactive"}
                    className="mb-6"
                  />

                  {recordingState === "recording" && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Recording...</span>
                        <span>
                          {Math.round((recordingProgress / 100) * recordingDuration)} / {recordingDuration}s
                        </span>
                      </div>
                      <Progress value={recordingProgress} className="h-2" />
                    </div>
                  )}

                  {recordingState === "processing" && (
                    <div className="text-center py-2">
                      <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
                      <p className="mt-2 text-sm">Processing your recording...</p>
                    </div>
                  )}

                  <div className="flex gap-4">
                    {recordingState === "inactive" ? (
                      <Button
                        onClick={startRecording}
                        className="w-full bg-rose-600 hover:bg-rose-700"
                        disabled={!isPlaying || sounds.filter((s) => s.active).length === 0}
                      >
                        <Music className="mr-2 h-4 w-4" /> Start Recording
                      </Button>
                    ) : (
                      <Button onClick={stopRecording} variant="outline" className="w-full">
                        Stop Recording
                      </Button>
                    )}
                  </div>

                  {!isPlaying && (
                    <p className="text-sm text-amber-400 text-shimmer">You need to start playback before recording.</p>
                  )}

                  {isPlaying && sounds.filter((s) => s.active).length === 0 && (
                    <p className="text-sm text-amber-400 text-shimmer">
                      You need to activate at least one sound before recording.
                    </p>
                  )}

                  {/* Hidden download link */}
                  <a ref={downloadLinkRef} className="hidden" />
                </div>
              </motion.div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

