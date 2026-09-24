# Alexander

Custom onboarding application for configuring the Alexander AI receptionist.

## Stack

- Next.js 15
- React
- TypeScript
- Tailwind CSS
- Redis-backed onboarding drafts with localStorage fallback

## Local setup

```bash
npm install
npm run dev
```

Open [http://localhost:3000/onboarding](http://localhost:3000/onboarding).

## Environment

Copy `.env.example` to `.env.local` and set values as needed:

```bash
REDIS_URL=
```

- **Optional locally** — without it, drafts still save in the browser via localStorage.
- **Required in production** for durable server-side draft persistence across devices/sessions.
- **Never commit** real Redis credentials. Only `.env.example` (placeholder) belongs in git.

## Quality commands

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

## Deploy (Vercel)

1. Import `ZAIDDUARTE/alexander` into Vercel (Next.js auto-detected).
2. Add environment variable `REDIS_URL` for durable drafts.
3. Deploy.
