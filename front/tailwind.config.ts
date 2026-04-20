import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "SF Pro Display", "system-ui", "sans-serif"]
      },
      colors: {
        ink: "#050505",
        carbon: "#0d0d0c",
        graphite: "#171612",
        platinum: "#f7f2e7",
        muted: "#9d9a91",
        gold: "#ffcd18",
        amber: "#ff7a18",
        rust: "#b84a16",
        velvet: "#7b3cff",
        smoke: "#b1aca2",
        ember: "#e4503d",
        jade: "#39d98a",
        cyan: "#4dd7c8",
        bonus: "#5fa883"
      },
      boxShadow: {
        glow: "0 14px 34px rgba(255, 205, 24, 0.12)",
        jade: "0 12px 30px rgba(57, 217, 138, 0.12)",
        ember: "0 12px 30px rgba(228, 80, 61, 0.14)",
        panel: "0 24px 70px rgba(0, 0, 0, 0.42)"
      },
      backgroundImage: {
        "premium-grid": "linear-gradient(rgba(247,242,231,.035) 1px, transparent 1px), linear-gradient(90deg, rgba(247,242,231,.028) 1px, transparent 1px)",
        "metal-line": "linear-gradient(90deg, transparent, rgba(255,205,24,.55), transparent)",
        "gold-bloom": "radial-gradient(circle, rgba(255,205,24,.22), rgba(255,205,24,.08) 42%, rgba(255,205,24,0) 72%)",
        "hero-veil": "linear-gradient(135deg, rgba(5,5,5,.94), rgba(8,9,12,.78) 52%, rgba(255,205,24,.16) 100%)"
      }
    }
  },
  plugins: []
};

export default config;
