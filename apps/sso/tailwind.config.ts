import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      /* ═══════════════════════════════════════════════════════════════════════
         INDUSTRIAL-KINETIC FUTURISM (IFK) Design System
         ═══════════════════════════════════════════════════════════════════════ */
      colors: {
        /* IFK Primary Palette */
        ifk: {
          /* Kinetic Cyan - Primary actions, focus, digital/sensor feel */
          cyan: {
            DEFAULT: "hsl(191, 100%, 50%)",
            50: "hsl(191, 100%, 95%)",
            100: "hsl(191, 100%, 90%)",
            200: "hsl(191, 100%, 80%)",
            300: "hsl(191, 100%, 70%)",
            400: "hsl(191, 100%, 60%)",
            500: "hsl(191, 100%, 50%)",
            600: "hsl(191, 100%, 40%)",
            700: "hsl(191, 100%, 30%)",
            800: "hsl(191, 100%, 20%)",
            900: "hsl(191, 100%, 10%)",
          },
          /* Humanoid Amber - Secondary, warmth, human identity */
          amber: {
            DEFAULT: "hsl(32, 100%, 50%)",
            50: "hsl(32, 100%, 95%)",
            100: "hsl(32, 100%, 90%)",
            200: "hsl(32, 100%, 80%)",
            300: "hsl(32, 100%, 70%)",
            400: "hsl(32, 100%, 60%)",
            500: "hsl(32, 100%, 50%)",
            600: "hsl(32, 100%, 40%)",
            700: "hsl(32, 100%, 30%)",
            800: "hsl(32, 100%, 20%)",
            900: "hsl(32, 100%, 10%)",
          },
          /* Industrial Grays - Background hierarchy */
          gray: {
            950: "hsl(228, 12%, 7%)",   /* Deepest base */
            900: "hsl(225, 11%, 10%)",  /* Elevated surfaces */
            850: "hsl(223, 9%, 13%)",   /* Cards, inputs */
            800: "hsl(220, 13%, 18%)",  /* Borders */
            700: "hsl(217, 10%, 28%)",
            600: "hsl(217, 10%, 38%)",
            500: "hsl(217, 10%, 48%)",  /* Muted text */
            400: "hsl(215, 14%, 62%)",
            300: "hsl(215, 14%, 72%)",  /* Secondary text */
            200: "hsl(210, 18%, 82%)",
            100: "hsl(210, 18%, 92%)",
            50: "hsl(210, 20%, 98%)",   /* Primary text (dark mode) */
          },
        },

        /* CSS Variable Mappings (shadcn/ui compatible) */
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
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        success: "hsl(var(--success))",
        warning: "hsl(var(--warning))",

        /* Sidebar */
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },

        /* Chart colors */
        chart: {
          1: "hsl(var(--chart-1))",
          2: "hsl(var(--chart-2))",
          3: "hsl(var(--chart-3))",
          4: "hsl(var(--chart-4))",
          5: "hsl(var(--chart-5))",
        },
      },

      /* Typography - IFK System */
      fontFamily: {
        /* Display/Technical: JetBrains Mono for headings, labels, code */
        mono: [
          "JetBrains Mono",
          "Fira Code",
          "IBM Plex Mono",
          "Consolas",
          "monospace",
        ],
        /* Body: Space Grotesk for readable text */
        sans: [
          "Space Grotesk",
          "Inter",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "sans-serif",
        ],
      },

      /* Font sizes with proper line-heights */
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "0.875rem" }],
        xs: ["0.75rem", { lineHeight: "1rem" }],
        sm: ["0.875rem", { lineHeight: "1.25rem" }],
        base: ["1rem", { lineHeight: "1.5rem" }],
        lg: ["1.125rem", { lineHeight: "1.75rem" }],
        xl: ["1.25rem", { lineHeight: "1.75rem" }],
        "2xl": ["1.5rem", { lineHeight: "2rem" }],
        "3xl": ["1.875rem", { lineHeight: "2.25rem" }],
        "4xl": ["2.25rem", { lineHeight: "2.5rem" }],
        "5xl": ["3rem", { lineHeight: "1.1" }],
        "6xl": ["3.75rem", { lineHeight: "1.1" }],
      },

      /* Letter spacing */
      letterSpacing: {
        tightest: "-0.04em",
        tighter: "-0.02em",
        tight: "-0.01em",
        normal: "0",
        wide: "0.02em",
        wider: "0.05em",
        widest: "0.1em",
        mono: "0.15em", /* For monospace uppercase labels */
      },

      /* Spacing scale extensions */
      spacing: {
        "4.5": "1.125rem",
        "5.5": "1.375rem",
        "18": "4.5rem",
        "88": "22rem",
        "128": "32rem",
      },

      /* Border radius - IFK prefers subtle rounding */
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xs: "2px",
      },

      /* Box shadows - IFK glow system */
      boxShadow: {
        /* Cyan glows */
        "cyan-sm": "0 0 10px hsl(191 100% 50% / 0.25)",
        cyan: "0 0 20px hsl(191 100% 50% / 0.35)",
        "cyan-lg": "0 0 40px hsl(191 100% 50% / 0.3)",
        "cyan-xl": "0 0 60px hsl(191 100% 50% / 0.25)",

        /* Amber glows */
        "amber-sm": "0 0 10px hsl(32 100% 50% / 0.2)",
        amber: "0 0 20px hsl(32 100% 50% / 0.3)",
        "amber-lg": "0 0 40px hsl(32 100% 50% / 0.25)",

        /* Success glow */
        "success-sm": "0 0 10px hsl(152 76% 46% / 0.25)",
        success: "0 0 20px hsl(152 76% 46% / 0.35)",

        /* Card shadows */
        card: "0 2px 8px hsl(0 0% 0% / 0.15), 0 1px 2px hsl(0 0% 0% / 0.1)",
        "card-hover":
          "0 4px 16px hsl(0 0% 0% / 0.2), 0 0 0 1px hsl(191 100% 50% / 0.1)",
        "card-elevated":
          "0 8px 24px hsl(0 0% 0% / 0.25), 0 2px 8px hsl(0 0% 0% / 0.1)",

        /* Focus ring shadow */
        "ring-cyan": "0 0 0 2px hsl(191 100% 50% / 0.25)",
        "ring-amber": "0 0 0 2px hsl(32 100% 50% / 0.2)",
      },

      /* Animations */
      animation: {
        /* Fade animations */
        "fade-in": "fadeIn 0.3s ease-out forwards",
        "fade-in-up": "fadeInUp 0.5s ease-out forwards",
        "fade-in-down": "fadeInDown 0.5s ease-out forwards",

        /* Scale animations */
        "scale-in": "scaleIn 0.2s ease-out forwards",
        "scale-in-up": "scaleInUp 0.3s ease-out forwards",

        /* Slide animations */
        "slide-in-right": "slideInRight 0.3s ease-out forwards",
        "slide-in-left": "slideInLeft 0.3s ease-out forwards",
        "slide-in-up": "slideInUp 0.3s ease-out forwards",
        "slide-in-down": "slideInDown 0.3s ease-out forwards",

        /* Glow/pulse animations */
        "pulse-glow": "pulseGlow 2s ease-in-out infinite",
        "pulse-soft": "pulseSoft 3s ease-in-out infinite",
        "pulse-cyan": "pulseCyan 2s ease-in-out infinite",

        /* IFK special effects */
        "scan-line": "scanLine 4s linear infinite",
        shimmer: "shimmer 2s linear infinite",
        float: "float 6s ease-in-out infinite",

        /* UI feedback */
        "spin-slow": "spin 3s linear infinite",
        wiggle: "wiggle 0.3s ease-in-out",
      },

      keyframes: {
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        fadeInUp: {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        fadeInDown: {
          from: { opacity: "0", transform: "translateY(-16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          from: { opacity: "0", transform: "scale(0.95)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        scaleInUp: {
          from: { opacity: "0", transform: "scale(0.95) translateY(10px)" },
          to: { opacity: "1", transform: "scale(1) translateY(0)" },
        },
        slideInRight: {
          from: { opacity: "0", transform: "translateX(-16px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        slideInLeft: {
          from: { opacity: "0", transform: "translateX(16px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        slideInUp: {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        slideInDown: {
          from: { opacity: "0", transform: "translateY(-16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        pulseGlow: {
          "0%, 100%": {
            opacity: "0.5",
            boxShadow: "0 0 10px hsl(191 100% 50% / 0.2)",
          },
          "50%": {
            opacity: "1",
            boxShadow: "0 0 20px hsl(191 100% 50% / 0.4)",
          },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
        pulseCyan: {
          "0%, 100%": { boxShadow: "0 0 5px hsl(191 100% 50% / 0.3)" },
          "50%": { boxShadow: "0 0 20px hsl(191 100% 50% / 0.5)" },
        },
        scanLine: {
          "0%": { top: "-2px", opacity: "0" },
          "10%": { opacity: "1" },
          "90%": { opacity: "1" },
          "100%": { top: "100%", opacity: "0" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        wiggle: {
          "0%, 100%": { transform: "rotate(-1deg)" },
          "50%": { transform: "rotate(1deg)" },
        },
      },

      /* Transition timing functions */
      transitionTimingFunction: {
        "in-expo": "cubic-bezier(0.95, 0.05, 0.795, 0.035)",
        "out-expo": "cubic-bezier(0.19, 1, 0.22, 1)",
        "in-out-expo": "cubic-bezier(0.87, 0, 0.13, 1)",
        bounce: "cubic-bezier(0.68, -0.55, 0.265, 1.55)",
      },

      /* Z-index scale */
      zIndex: {
        "60": "60",
        "70": "70",
        "80": "80",
        "90": "90",
        "100": "100",
      },

      /* Backdrop blur */
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;
