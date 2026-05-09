# Workout Timer

A voice-guided counting workout timer built with Next.js, React, and Tailwind. Counts from 1 to 100 (configurable) with rest gaps every 10 reps (configurable) and a male voice.

## Quick start (local)

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Deploy to Vercel

### Option A, via Vercel CLI

```bash
npm install -g vercel
vercel
```

Follow the prompts. Vercel auto-detects Next.js and deploys with zero config.

### Option B, via GitHub + Vercel dashboard

1. Push this folder to a GitHub repo
2. Go to https://vercel.com/new
3. Import the repo
4. Click Deploy. No environment variables or settings needed.

### Option C, drag-and-drop

1. Run `npm run build` locally
2. Go to https://vercel.com/new and use the upload option
3. Upload the project folder

## File structure

```
workout-timer/
├── app/
│   ├── globals.css       Tailwind directives + base reset
│   ├── layout.jsx        Root HTML shell + metadata
│   └── page.jsx          The full timer component
├── package.json          Dependencies
├── next.config.mjs       Next.js config
├── tailwind.config.js    Tailwind scan paths
├── postcss.config.js     Tailwind + Autoprefixer
├── jsconfig.json         Path aliases
└── .gitignore
```

## Notes on the male voice

The Web Speech API exposes whatever voices the browser/OS provides. On iOS you'll see Daniel and Alex; on macOS more options including Fred; on Windows David and Mark; on Android it varies. The app auto-filters to likely male voices using a keyword list, with English voices as a fallback when the device exposes no matches.

## Customization

All visual constants live as inline style values inside `app/page.jsx`:

- Background cream: `#EFE8DB`
- Ink: `#1C1917`
- Accent terracotta: `#D4321C`
- Muted text: `#8B7355`

Fonts are loaded from Google Fonts at runtime, so no font files are needed in the repo.
