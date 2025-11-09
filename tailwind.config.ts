import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // shadcn/ui color system mapped to your existing oklch colors
        border: "oklch(20% 0.03 12)",
        input: "oklch(20% 0.03 12)",
        ring: "oklch(51% 0.18 16)",
        background: "oklch(8% 0.02 12)",
        foreground: "oklch(95% 0.005 0)",
        primary: {
          DEFAULT: "oklch(51% 0.18 16)",
          foreground: "oklch(100% 0 0)",
        },
        secondary: {
          DEFAULT: "oklch(18% 0.03 12)",
          foreground: "oklch(95% 0.005 0)",
        },
        destructive: {
          DEFAULT: "oklch(60% 0.184 16)",
          foreground: "oklch(100% 0 0)",
        },
        muted: {
          DEFAULT: "oklch(15% 0.025 12)",
          foreground: "oklch(65% 0.01 12)",
        },
        accent: {
          DEFAULT: "oklch(51% 0.18 16)",
          foreground: "oklch(100% 0 0)",
        },
        popover: {
          DEFAULT: "oklch(12% 0.025 12)",
          foreground: "oklch(95% 0.005 0)",
        },
        card: {
          DEFAULT: "oklch(12% 0.025 12)",
          foreground: "oklch(95% 0.005 0)",
        },
      },
      borderRadius: {
        lg: "0.75rem",
        md: "0.5rem",
        sm: "0.25rem",
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
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: [
      {
        tDarts: {
          "color-scheme": "dark",
          "base-100": "oklch(15% 0.02 12)",
          "base-200": "oklch(18% 0.055 18)",
          "base-300": "oklch(18% 0.03 12)",
          "base-content": "oklch(95% 0.005 0)",
          primary: "oklch(51% 0.18 16)",
          "primary-content": "oklch(100% 0 0)",
          secondary: "oklch(18% 0.03 12)",
          "secondary-content": "oklch(95% 0.005 0)",
          accent: "oklch(51% 0.18 16)",
          "accent-content": "oklch(100% 0 0)",
          neutral: "oklch(15% 0.025 12)",
          "neutral-content": "oklch(95% 0.005 0)",
          info: "oklch(70% 0.16 233)",
          "info-content": "oklch(100% 0 0)",
          success: "oklch(64% 0.2 132)",
          "success-content": "oklch(100% 0 0)",
          warning: "oklch(68% 0.162 76)",
          "warning-content": "oklch(100% 0 0)",
          error: "oklch(60% 0.184 16)",
          "error-content": "oklch(100% 0 0)",
        },
      },
    ],
  },
};

export default config;

