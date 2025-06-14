"use client"

import SoundMixer from "@/components/sound-mixer"
import { Suspense, useEffect, useState } from "react"
import { motion } from "framer-motion"

export default function Home() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white perspective-1000">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-12 text-center">
          {mounted && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8 }}
              className="perspective-1000"
            >
              <motion.h1
                className="text-5xl font-serif tracking-tight mb-4 text-3d"
                animate={{
                  rotateX: [0, 5, 0, -5, 0],
                  rotateY: [0, 10, 0, -10, 0],
                }}
                transition={{
                  repeat: Number.POSITIVE_INFINITY,
                  duration: 8,
                  ease: "easeInOut",
                }}
              >
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500">
                  Virtual Soundscape
                </span>
              </motion.h1>

              <motion.p
                className="text-slate-300 italic text-lg"
                animate={{
                  rotateX: [0, 3, 0, -3, 0],
                  translateZ: [0, 10, 0, 10, 0],
                }}
                transition={{
                  repeat: Number.POSITIVE_INFINITY,
                  duration: 6,
                  ease: "easeInOut",
                  delay: 0.5,
                }}
              >
                Craft your perfect ambient atmosphere
              </motion.p>
            </motion.div>
          )}
        </header>
        <Suspense fallback={<LoadingFallback />}>
          <SoundMixer />
        </Suspense>
      </div>
    </main>
  )
}

function LoadingFallback() {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="h-12 w-12 rounded-full border-4 border-t-blue-500 border-b-purple-500 border-l-transparent border-r-transparent animate-spin"></div>
      <p className="mt-4 text-slate-300">Preparing your soundscape...</p>
    </div>
  )
}

