@AGENTS.md

## Deploy Configuration (configured by /setup-deploy)
- Platform: Vercel
- Production URL: https://tripup-eta.vercel.app
- Deploy workflow: auto-deploy on push to master (GitHub connected)
- Deploy status command: HTTP health check
- Merge method: push to master
- Project type: Next.js web app

### Custom deploy hooks
- Pre-merge: npm run build
- Deploy trigger: automatic on push to master
- Deploy status: poll production URL
- Health check: https://tripup-eta.vercel.app
