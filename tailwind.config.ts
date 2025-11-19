import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // ===== shadcn/ui Core Colors (OKLCH) =====
        border: "oklch(20% 0.03 12)",
        input: "oklch(20% 0.03 12)",
        ring: "oklch(51% 0.18 16)",
        background: "oklch(8% 0.02 12)",
        foreground: "oklch(95% 0.005 0)",
        
        // Primary Red Colors
        primary: {
          DEFAULT: "oklch(51% 0.18 16)",
          foreground: "oklch(100% 0 0)",
          hover: "oklch(56% 0.18 16)",
          active: "oklch(48% 0.20 16)",
          disabled: "oklch(36% 0.11 16) / 0.5",
          dark: "oklch(41% 0.18 16)",
          darker: "oklch(31% 0.18 16)",
        },
        
        // Secondary Colors
        secondary: {
          DEFAULT: "oklch(18% 0.03 12)",
          foreground: "oklch(95% 0.005 0)",
          hover: "oklch(23% 0.03 12)",
          active: "oklch(15% 0.04 12)",
        },
        
        // Destructive Colors
        destructive: {
          DEFAULT: "oklch(60% 0.184 16)",
          foreground: "oklch(100% 0 0)",
          hover: "oklch(65% 0.184 16)",
          active: "oklch(57% 0.20 16)",
        },
        
        // Muted Colors
        muted: {
          DEFAULT: "oklch(15% 0.025 12)",
          foreground: "oklch(65% 0.01 12)",
        },
        
        // Accent Colors
        accent: {
          DEFAULT: "oklch(51% 0.18 16)",
          foreground: "oklch(100% 0 0)",
          hover: "oklch(56% 0.18 16)",
          active: "oklch(48% 0.20 16)",
        },
        
        // Popover Colors
        popover: {
          DEFAULT: "oklch(12% 0.025 12)",
          foreground: "oklch(95% 0.005 0)",
        },
        
        // Card Colors
        card: {
          DEFAULT: "oklch(12% 0.025 12)",
          foreground: "oklch(95% 0.005 0)",
        },
        
        // Success, Warning, Info
        success: {
          DEFAULT: "oklch(64% 0.2 132)",
          foreground: "oklch(100% 0 0)",
          hover: "oklch(69% 0.2 132)",
        },
        warning: {
          DEFAULT: "oklch(68% 0.162 76)",
          foreground: "oklch(15% 0.025 12)",
          hover: "oklch(73% 0.162 76)",
        },
        info: {
          DEFAULT: "oklch(70% 0.16 233)",
          foreground: "oklch(100% 0 0)",
          hover: "oklch(75% 0.16 233)",
        },
        
        // ===== Glass Morphism System =====
        glass: {
          bg: "oklch(100% 0 0 / 0.08)",
          "bg-elevated": "oklch(100% 0 0 / 0.12)",
          "bg-modal": "oklch(100% 0 0 / 0.15)",
          border: "oklch(100% 0 0 / 0.10)",
          "border-focus": "oklch(100% 0 0 / 0.20)",
          "inner-glow": "oklch(100% 0 0 / 0.05)",
          shadow: "oklch(0% 0 0 / 0.20)",
        },
      },
      
      // Enhanced backdrop blur
      backdropBlur: {
        xs: "2px",
        sm: "4px",
        md: "8px",
        lg: "12px",
        xl: "16px",
        "2xl": "24px",
        "3xl": "32px",
      },
      
      // Consistent border radius
      borderRadius: {
        lg: "0.75rem",
        md: "0.5rem",
        sm: "0.25rem",
      },
      
      // Box shadows with OKLCH
      boxShadow: {
        'glass': '0 8px 32px 0 oklch(0% 0 0 / 0.20)',
        'glass-lg': '0 12px 40px 0 oklch(0% 0 0 / 0.30)',
        'glass-xl': '0 16px 48px 0 oklch(0% 0 0 / 0.40)',
        'primary': '0 4px 15px 0 oklch(51% 0.18 16 / 0.40)',
        'primary-lg': '0 8px 25px 0 oklch(51% 0.18 16 / 0.60)',
      },
      
      // Animation keyframes
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "fade-out": {
          from: { opacity: "1" },
          to: { opacity: "0" },
        },
        "slide-in-from-top": {
          from: { transform: "translateY(-100%)" },
          to: { transform: "translateY(0)" },
        },
        "slide-in-from-bottom": {
          from: { transform: "translateY(100%)" },
          to: { transform: "translateY(0)" },
        },
        "slide-in-from-left": {
          from: { transform: "translateX(-100%)" },
          to: { transform: "translateX(0)" },
        },
        "slide-in-from-right": {
          from: { transform: "translateX(100%)" },
          to: { transform: "translateX(0)" },
        },
        "zoom-in": {
          from: { transform: "scale(0.95)", opacity: "0" },
          to: { transform: "scale(1)", opacity: "1" },
        },
        "zoom-out": {
          from: { transform: "scale(1)", opacity: "1" },
          to: { transform: "scale(0.95)", opacity: "0" },
        },
      },
      
      // Animation utilities
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.2s ease-out",
        "fade-out": "fade-out 0.2s ease-in",
        "slide-in-from-top": "slide-in-from-top 0.3s ease-out",
        "slide-in-from-bottom": "slide-in-from-bottom 0.3s ease-out",
        "slide-in-from-left": "slide-in-from-left 0.3s ease-out",
        "slide-in-from-right": "slide-in-from-right 0.3s ease-out",
        "zoom-in": "zoom-in 0.2s ease-out",
        "zoom-out": "zoom-out 0.2s ease-in",
      },
      
      // Transitions
      transitionDuration: {
        '0': '0ms',
        '200': '200ms',
        '300': '300ms',
        '400': '400ms',
      },
    },
  },
  plugins: [
    // DaisyUI handles color utilities and component classes
    // Keeping this empty but available for future custom utilities
  ],
};

export default config;

