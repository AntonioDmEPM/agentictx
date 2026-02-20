/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Backgrounds
        "bg-primary": "#0A0B0F",
        "bg-surface": "#12141A",
        "bg-elevated": "#1A1D26",
        "bg-border": "#252836",

        // Accents
        "accent-primary": "#4F7FFF",
        "accent-warm": "#FF6B35",
        "accent-success": "#2DD4A0",
        "accent-amber": "#F5A623",

        // Text
        "text-primary": "#F0F2F8",
        "text-secondary": "#8B90A8",
        "text-muted": "#4A5068",

        // JTD states
        "jtd-lived": "#F5A623",
        "jtd-cognitive": "#4F7FFF",
        "jtd-cluster": "#2DD4A0",
        "jtd-agent": "#9B6FFF",
      },
      fontFamily: {
        display: ['"DM Serif Display"', "Georgia", "serif"],
        ui: ['"DM Mono"', '"Fira Code"', "monospace"],
        body: ["Inter", "system-ui", "sans-serif"],
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
        DEFAULT: "2px",
        sm: "2px",
        md: "4px",
        lg: "4px",
        full: "9999px",
      },
      borderColor: {
        DEFAULT: "#252836",
      },
    },
  },
  plugins: [],
};
