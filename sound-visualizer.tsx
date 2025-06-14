"use client"

import { useRef, useEffect } from "react"
import { motion } from "framer-motion"

interface SoundVisualizerProps {
  isPlaying: boolean
  activeSounds: number
}

export default function SoundVisualizer({ isPlaying, activeSounds }: SoundVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas dimensions
    const setCanvasDimensions = () => {
      const dpr = window.devicePixelRatio || 1
      const rect = canvas.getBoundingClientRect()

      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr

      ctx.scale(dpr, dpr)
    }

    setCanvasDimensions()
    window.addEventListener("resize", setCanvasDimensions)

    // Animation variables
    const particles: Particle[] = []
    const particleCount = 80

    // Create particles
    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle(canvas.width, canvas.height))
    }

    // Animation function
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Draw background gradient with 3D effect
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
      gradient.addColorStop(0, "rgba(15, 23, 42, 0.3)")
      gradient.addColorStop(1, "rgba(15, 23, 42, 0.6)")
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      if (isPlaying) {
        // Draw 3D waveform
        const waveCount = 3 // Multiple waves for 3D effect

        for (let w = 0; w < waveCount; w++) {
          ctx.beginPath()
          ctx.moveTo(0, canvas.height / 2)

          const amplitude = Math.min(20 + activeSounds * 5, 50) * (1 - w * 0.2)
          const frequency = 0.01 + activeSounds * 0.002
          const timeOffset = Date.now() * 0.001 + w * 0.5

          for (let x = 0; x < canvas.width; x += 2) {
            const y =
              canvas.height / 2 +
              Math.sin(x * frequency + timeOffset) * amplitude * (0.8 + Math.sin(timeOffset * 2) * 0.2)
            ctx.lineTo(x, y)
          }

          // Different opacity for each wave to create depth
          const opacity = 0.6 - w * 0.15
          ctx.strokeStyle = `rgba(148, 163, 184, ${opacity})`
          ctx.lineWidth = 2 - w * 0.5
          ctx.stroke()
        }

        // Update and draw particles
        particles.forEach((particle) => {
          particle.update(activeSounds, canvas.width, canvas.height)
          particle.draw(ctx)
        })
      } else {
        // Draw static line when not playing
        ctx.beginPath()
        ctx.moveTo(0, canvas.height / 2)
        ctx.lineTo(canvas.width, canvas.height / 2)
        ctx.strokeStyle = "rgba(148, 163, 184, 0.3)"
        ctx.lineWidth = 2
        ctx.stroke()
      }

      animationRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener("resize", setCanvasDimensions)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isPlaying, activeSounds])

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="relative perspective-1000"
    >
      <motion.canvas
        ref={canvasRef}
        className="w-full h-48 rounded-lg bg-slate-900/50"
        animate={{
          rotateX: isPlaying ? [0, 2, 0, -2, 0] : 0,
          rotateY: isPlaying ? [0, 1, 0, -1, 0] : 0,
        }}
        transition={{
          repeat: Number.POSITIVE_INFINITY,
          duration: 8,
          ease: "easeInOut",
        }}
      />
      {!isPlaying && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.p
            className="text-slate-400 text-sm text-3d"
            animate={{
              opacity: [0.5, 1, 0.5],
              scale: [0.98, 1, 0.98],
              rotateX: [0, 10, 0, -10, 0],
              translateZ: [0, 20, 0],
            }}
            transition={{
              repeat: Number.POSITIVE_INFINITY,
              duration: 3,
            }}
          >
            Press play to start
          </motion.p>
        </motion.div>
      )}
    </motion.div>
  )
}

class Particle {
  x: number
  y: number
  size: number
  speedX: number
  speedY: number
  color: string
  opacity: number
  depth: number // For 3D effect

  constructor(width: number, height: number) {
    this.x = Math.random() * width
    this.y = Math.random() * height
    this.size = Math.random() * 3 + 1
    this.speedX = Math.random() * 2 - 1
    this.speedY = Math.random() * 2 - 1
    this.opacity = Math.random() * 0.5 + 0.2
    this.depth = Math.random() * 3 // 0-3 depth for 3D effect

    // Color palette
    const colors = [
      "rgba(59, 130, 246, 0.7)", // Blue
      "rgba(99, 102, 241, 0.7)", // Indigo
      "rgba(139, 92, 246, 0.7)", // Purple
      "rgba(236, 72, 153, 0.7)", // Pink
    ]

    this.color = colors[Math.floor(Math.random() * colors.length)]
  }

  update(intensity: number, width: number, height: number) {
    // Adjust speed based on number of active sounds
    const speedMultiplier = 0.5 + intensity * 0.15

    this.x += this.speedX * speedMultiplier * (1 + this.depth * 0.2)
    this.y += this.speedY * speedMultiplier * (1 + this.depth * 0.2)

    // Wrap around edges
    if (this.x < 0) this.x = width
    if (this.x > width) this.x = 0
    if (this.y < 0) this.y = height
    if (this.y > height) this.y = 0

    // Pulse opacity
    this.opacity = 0.2 + Math.sin(Date.now() * 0.001 + this.x * 0.01) * 0.3
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.beginPath()

    // Size varies with depth for 3D effect
    const sizeWithDepth = this.size * (1 + this.depth * 0.3)

    ctx.arc(this.x, this.y, sizeWithDepth, 0, Math.PI * 2)

    // Extract RGB values from the color string
    const colorMatch = this.color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
    if (colorMatch) {
      const r = Number.parseInt(colorMatch[1])
      const g = Number.parseInt(colorMatch[2])
      const b = Number.parseInt(colorMatch[3])

      // Apply dynamic opacity based on depth
      const depthOpacity = this.opacity * (1 - this.depth * 0.15)
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${depthOpacity})`
    } else {
      ctx.fillStyle = this.color
    }

    ctx.fill()

    // Add glow effect
    ctx.shadowBlur = 15 * (1 + this.depth * 0.5)
    ctx.shadowColor = this.color
  }
}

