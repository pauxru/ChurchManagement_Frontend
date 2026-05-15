import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    // Rank gradient strings live in src/lib/clergyColors.ts. Without
    // including it the JIT scanner skips those classes and the bishop /
    // pastor / deacon circles render with the fallback grey.
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  // Rank colour utilities are composed at runtime in clergyColors.ts. The
  // scanner picks them up via the content path above, but we list them
  // explicitly here too so future refactors that move the helper outside
  // ./src/lib won't silently break the colour-coded circles.
  safelist: [
    "from-blue-900",
    "to-blue-950",
    "from-pink-500",
    "to-pink-700",
    "from-yellow-500",
    "to-yellow-700",
    "from-red-600",
    "to-red-800",
    "from-gray-800",
    "to-black",
    "ring-blue-900",
    "ring-pink-500",
    "ring-yellow-500",
    "ring-red-600",
    "ring-gray-800",
    "bg-blue-900",
    "bg-pink-600",
    "bg-yellow-600",
    "bg-red-700",
    "bg-gray-900",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
    },
  },
  plugins: [],
} satisfies Config;
