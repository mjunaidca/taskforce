"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Mic, ArrowRight, Command } from "lucide-react"

export function CommandCapsule() {
    const [input, setInput] = useState("")
    const [isFocused, setIsFocused] = useState(false)
    const router = useRouter()
    const inputRef = useRef<HTMLInputElement>(null)

    const handleSubmit = (e?: React.FormEvent) => {
        e?.preventDefault()
        if (!input.trim()) return

        // Navigate to workspace with prompt
        const encodedPrompt = encodeURIComponent(input.trim())
        router.push(`/workspace?prompt=${encodedPrompt}`)
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            handleSubmit()
        }
    }

    // Focus shortcut (Cmd+K) support could be added here if globally needed, 
    // but for now we focus on the UI component itself.

    return (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 w-full max-w-xl px-4">
            <div
                className={`
          relative flex items-center bg-black/80 backdrop-blur-xl border 
          rounded-full transition-all duration-300 shadow-2xl
          ${isFocused
                        ? 'border-ifk-cyan-500/50 shadow-[0_0_40px_rgba(6,182,212,0.15)] scale-105'
                        : 'border-ifk-gray-800 hover:border-ifk-gray-700'
                    }
        `}
            >
                {/* Leading Icon */}
                <div className="pl-4 pr-3 text-ifk-cyan-500 animate-pulse">
                    <Command className="h-5 w-5" />
                </div>

                {/* Input Field */}
                <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask TaskFlow to deploy, analyze, or build..."
                    className="flex-1 bg-transparent border-none outline-none py-4 text-white placeholder:text-gray-500 font-mono text-sm"
                    autoFocus={false} // Don't auto-focus on load to respect dashboard overview
                />

                {/* Action Buttons */}
                <div className="pr-2 flex items-center gap-1">
                    {/* Voice Trigger (Visual only for now, or could link to auto-start voice in workspace) */}
                    <button
                        className="p-2 rounded-full hover:bg-ifk-cyan-900/20 text-gray-400 hover:text-ifk-cyan-400 transition-colors"
                        title="Voice Command"
                        onClick={() => router.push('/workspace?autoVoice=true')}
                    >
                        <Mic className="h-4 w-4" />
                    </button>

                    {/* Submit Button */}
                    <button
                        onClick={() => handleSubmit()}
                        disabled={!input.trim()}
                        className={`
              p-2 rounded-full transition-all duration-300
              ${input.trim()
                                ? 'bg-ifk-cyan-500 text-black hover:bg-ifk-cyan-400 rotate-0 opacity-100'
                                : 'bg-transparent text-gray-600 -rotate-90 opacity-0 pointer-events-none w-0 p-0 overflow-hidden'
                            }
            `}
                    >
                        <ArrowRight className="h-4 w-4" />
                    </button>
                </div>

                {/* Glow Effects */}
                <div className="absolute inset-0 rounded-full pointer-events-none bg-gradient-to-r from-ifk-cyan-500/5 via-transparent to-ifk-cyan-500/5 opacity-50" />
            </div>

            {/* Keyboard Hint */}
            {!isFocused && !input && (
                <div className="text-center mt-3 animate-in fade-in slide-in-from-bottom-2 duration-700 delay-500">
                    <span className="text-[10px] text-gray-600 font-mono bg-black/50 px-2 py-1 rounded border border-gray-900">
                        Click to command
                    </span>
                </div>
            )}
        </div>
    )
}
