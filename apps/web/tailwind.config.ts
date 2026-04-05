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
        // ===== Revised Dark Red Theme (User Request) =====
        
        // Base Colors
        background: "#1a0505", // Very Deep Red/Black
        foreground: "#f2dccd", // Light Warm Beige for contrast
        
        // Primary (Rich Dark Red - The Brand Color)
        primary: {
          DEFAULT: "#922210", 
          foreground: "#ffffff",
          dark: "#7a1c0d",
        },

        // Secondary (Warm Bronze/Gold to complement red)
        secondary: {
          DEFAULT: "#c18c5d",
          foreground: "#ffffff",
          dark: "#a67850",
        },
        
        // Accent (Brighter Red/Orange for highlights)
        accent: {
          DEFAULT: "#d94e32",
          foreground: "#ffffff",
        },

        // Muted / Elevated surfaces (MUCH lighter for nested/elevated components)
        muted: {
          DEFAULT: "#6d4545",
          foreground: "#e5d5cd",
        },

        // Card / Level 1 elevation
        card: {
          DEFAULT: "#4a2828",
          foreground: "#f2dccd",
        },
        
        // Popover
        popover: {
          DEFAULT: "#4a2828",
          foreground: "#f2dccd",
        },

        // Destructive
        destructive: {
          DEFAULT: "#dc2626", 
          foreground: "#ffffff",
        },

        // Success (Green)
        success: {
          DEFAULT: "#16a34a",
          foreground: "#ffffff",
        },

        // Info (Blue)
        info: {
          DEFAULT: "#2563eb",
          foreground: "#ffffff",
        },

        // Warning (Amber)
        warning: {
          DEFAULT: "#d97706",
          foreground: "#ffffff",
        },

        // Borders and Inputs (Subtle Red-Gray)
        border: "#4a2020",
        input: "#4a2020",
        ring: "#922210", 
      },
      
      borderRadius: {
        lg: "0.5rem",
        md: "calc(0.5rem - 2px)",
        sm: "calc(0.5rem - 4px)",
      },
      
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
      },
      
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.2s ease-out",
        "fade-out": "fade-out 0.2s ease-in",
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"), 
  ],
};

export default config;
