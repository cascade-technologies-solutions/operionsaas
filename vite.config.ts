import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  // Development server configuration (only used in dev mode)
  server: mode === 'development' ? {
    host: "localhost",
    port: 8080,
    hmr: {
      port: 8080,
      host: "localhost",
      clientPort: 8080
    },
    watch: {
      usePolling: true
    },
    // Proxy API requests to backend to avoid cross-origin cookie issues
    // With this proxy, requests to /api/* are forwarded to http://localhost:3000/api/*
    // This makes requests same-origin, so cookies work properly
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        // Cookies are automatically forwarded by Vite proxy
      }
    }
  } : undefined,
  // Production build configuration
  build: {
    outDir: 'dist',
    sourcemap: mode === 'production' ? false : true, // Disable source maps in production for security
    minify: 'esbuild',
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
          'vendor-utils': ['date-fns', 'zod', 'zustand']
        }
      }
    }
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
