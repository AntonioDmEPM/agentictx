/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Backgrounds — TBYB light palette
        "bg-primary": "#f5f4f0",   // warm cream
        "bg-surface": "#ffffff",   // white
        "bg-elevated": "#f9f8f5",  // warm white
        "bg-border": "#e4e2dc",    // warm border

        // Accents — earth tones
        "accent-primary": "#4a6fa5",  // steel blue
        "accent-warm": "#b07340",     // terracotta
        "accent-success": "#5a8a6a",  // deep green
        "accent-amber": "#b07340",    // terracotta (same as warm)

        // Text
        "text-primary": "#1a1a2e",    // dark navy
        "text-secondary": "#666666",  // warm gray
        "text-muted": "#999999",      // light warm gray

        // JTD states — warm semantic palette
        "jtd-lived": "#b07340",    // terracotta — Tasks
        "jtd-cognitive": "#4a6fa5", // steel blue — Cognitive Load
        "jtd-cluster": "#5a8a6a",  // deep green — Clusters
        "jtd-agent": "#6b5b95",    // deep purple — Agents
      },
      fontFamily: {
        display: ['"Instrument Serif"', "Georgia", "serif"],
        ui: ['"DM Mono"', '"Fira Code"', "monospace"],
        body: ['"DM Sans"', "system-ui", "sans-serif"],
      },
      fontSize: {
        xs: ["11px", { lineHeight: "16px" }],
        sm: ["13px", { lineHeight: "20px" }],
        base: ["15px", { lineHeight: "24px" }],
        lg: ["18px", { lineHeight: "28px" }],
        xl: ["24px", { lineHeight: "32px" }],
        "2xl": ["32px", { lineHeight: "40px" }],
        "3xl": ["48px", { lineHeight: "56px" }],
      },
      borderRadius: {
        DEFAULT: "10px",
        sm: "6px",
        md: "10px",
        lg: "12px",
        full: "9999px",
      },
      borderColor: {
        DEFAULT: "#e4e2dc",
      },
    },
  },
  plugins: [],
};
