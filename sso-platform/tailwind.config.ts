import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: 'class', // Disable system-preference dark mode, only apply if 'dark' class present
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // IFK Color System
        ifk: {
          cyan: "hsl(191, 100%, 50%)",
          "cyan-light": "hsl(191, 100%, 60%)",
          "cyan-dark": "hsl(191, 100%, 40%)",
          amber: "hsl(35, 100%, 50%)",
          "amber-light": "hsl(35, 100%, 60%)",
          "amber-dark": "hsl(35, 100%, 40%)",
        },
        // Taskflow Brand - Mapped to IFK Cyan for minimal changes
        taskflow: {
          50: '#ecfdf5', // kept light for contrast if needed
          100: '#d1fae5',
          200: 'hsl(191, 100%, 90%)',
          300: 'hsl(191, 100%, 80%)',
          400: 'hsl(191, 100%, 60%)',
          500: 'hsl(191, 100%, 50%)', // Primary Cyan
          600: 'hsl(191, 100%, 40%)',
          700: 'hsl(191, 100%, 30%)',
          800: 'hsl(191, 100%, 20%)',
          900: 'hsl(191, 100%, 10%)',
          950: '#053226',
        },
        // IFK Color System mappings
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
          // Keep existing accent shades for backward compatibility if needed, using spread or separate object
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#0d9668',
          600: '#065f46',
          700: '#064e3b',
          800: '#053a2d',
          900: '#042f24',
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      fontFamily: {
        mono: ["JetBrains Mono", "IBM Plex Mono", "monospace"],
        sans: ["Space Grotesk", "Syne", "system-ui", "sans-serif"],
      },
      boxShadow: {
        'glow': '0 0 20px 2px rgba(0, 212, 255, 0.4)', // Cyan glow
        'glow-lg': '0 0 40px 4px rgba(0, 212, 255, 0.2)',
        'card': '0 4px 24px rgba(0, 0, 0, 0.2)',
        'card-hover': '0 8px 32px rgba(0, 212, 255, 0.1)',
        "cyan-glow": "0 0 20px rgba(0, 212, 255, 0.4)",
        "amber-glow": "0 0 20px rgba(255, 149, 0, 0.3)",
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
        "fade-in-up": "fadeInUp 0.6s ease forwards",
        "pulse-glow": "pulseGlow 2s ease-in-out infinite",
        "scan-line": "scanLine 4s linear infinite",
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        fadeInUp: {
          from: { opacity: "0", transform: "translateY(20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        pulseGlow: {
          "0%, 100%": { opacity: "0.6" },
          "50%": { opacity: "1" },
        },
        scanLine: {
          "0%": { transform: "translateY(-100%)", opacity: "0" },
          "10%": { opacity: "1" },
          "90%": { opacity: "1" },
          "100%": { transform: "translateY(100vh)", opacity: "0" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
