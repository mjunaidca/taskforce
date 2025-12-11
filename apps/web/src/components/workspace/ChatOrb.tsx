"use client"

import { useState } from "react"
import Link from "next/link"
import { Mic } from "lucide-react"

export function ChatOrb() {
    const [isHovered, setIsHovered] = useState(false)

    return (
        <Link href="/workspace">
            <div
                className="fixed bottom-8 right-8 z-50 flex items-center justify-center cursor-pointer group"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                {/* Outer Glow Halo */}
                <div className={`absolute inset-0 bg-ifk-cyan-500/20 rounded-full blur-xl transition-all duration-500 ${isHovered ? 'scale-150 opacity-100' : 'scale-100 opacity-50'}`} />

                {/* Rotating Rings */}
                <div className={`absolute inset-0 border border-ifk-cyan-500/30 rounded-full transition-all duration-700 w-16 h-16 ${isHovered ? 'scale-125 rotate-90' : 'scale-100 rotate-0'}`} />
                <div className={`absolute inset-0 border border-dashed border-ifk-cyan-500/20 rounded-full transition-all duration-700 w-16 h-16 ${isHovered ? 'scale-110 -rotate-90' : 'scale-90 rotate-0'}`} />

                {/* Core Orb */}
                <div className={`relative h-14 w-14 rounded-full bg-black/80 backdrop-blur-md border border-ifk-cyan-500/50 flex items-center justify-center shadow-[0_0_30px_rgba(6,182,212,0.2)] transition-all duration-300 ${isHovered ? 'bg-ifk-cyan-900/30 border-ifk-cyan-400' : ''}`}>
                    <Mic className={`h-6 w-6 text-ifk-cyan-400 transition-transform duration-300 ${isHovered ? 'scale-110' : 'scale-100'}`} />
                </div>

                {/* Label (Slide out on hover) */}
                <div className={`absolute right-16 top-1/2 -translate-y-1/2 bg-black/80 border border-ifk-cyan-500/30 px-3 py-1.5 rounded-lg backdrop-blur-md transition-all duration-300 ${isHovered ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4 pointer-events-none'}`}>
                    <span className="text-xs font-mono text-ifk-cyan-400 whitespace-nowrap">INITIATE VOICE LINK</span>
                </div>
            </div>
        </Link>
    )
}
