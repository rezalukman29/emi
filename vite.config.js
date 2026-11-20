import { execSync } from 'node:child_process'
import process from 'node:process'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Build info shown at the bottom of the sidebars (branch + last commit).
// Prefers Vercel's git env vars (deploy builds), falls back to local git, then "unknown".
function git(command) {
  try {
    return execSync(`git ${command}`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
  } catch {
    return ''
  }
}

function getBuildInfo() {
  const env = process.env
  const branch = env.VERCEL_GIT_COMMIT_REF || git('rev-parse --abbrev-ref HEAD') || 'unknown'
  const sha = (env.VERCEL_GIT_COMMIT_SHA || git('rev-parse HEAD') || '').slice(0, 7)
  return {
    branch,
    commit: sha || 'unknown',
    commitDate: git('log -1 --format=%cI') || null,
    commitMessage: env.VERCEL_GIT_COMMIT_MESSAGE || git('log -1 --format=%s') || '',
    commitAuthor: env.VERCEL_GIT_COMMIT_AUTHOR_LOGIN || git('log -1 --format=%an') || '',
    builtAt: new Date().toISOString(),
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    __BUILD_INFO__: JSON.stringify(getBuildInfo()),
  },
})
