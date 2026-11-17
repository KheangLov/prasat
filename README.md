# Prasat (ប្រាសាទ)

A 3D temple-stacking game from Cambodia. Sophal, an apprentice stone carver, raises towers with
master carver Prom in the style of Cambodia's great temples: Angkor Wat, the Bayon, Banteay Srei,
Koh Ker, Preah Vihear and the Royal Palace. A carved stone slides back and forth over the tower; tap
to drop it. Whatever hangs over the stone below is cut off and tumbles away, so the next stone is
smaller; drop it dead on for a perfect fit, and three perfect drops in a row grow the stone back a
little. Miss the tower altogether and it's over. When a tower is finished, a lotus-bud spire (or the
palace's golden one) crowns it and the camera draws back to show it whole. **150 levels in six
temples**, with a short story between them, plus an **endless tower**. All the art is 3D, built in
code: no image or model files.

- **Khmer and English**: Khmer by default, with Khmer digits.
- **Made for phones**: one tap anywhere drops the stone. Keyboard: Space, Enter or the down arrow;
  P or Escape to pause.
- **Stars for stone kept**: finish with half of the first stone's area for three stars, a fifth for two.
- **Harder as you go**: taller towers, faster stones, and wind (stones that speed up and slow down)
  from Banteay Srei on.
- **Saved on the device**: progress and settings stay in the browser (localStorage).
- **Installable and offline**: once opened, it plays with no connection.
- **Plays inside the [gaming gateway](https://github.com/KheangLov/gaming-gateway)**, loaded with
  Module Federation (`modules/gateway-remote/`, the same folder as in the other games).

Built with Nuxt 4, Nuxt UI, [three.js](https://threejs.org) and [Motion for Vue](https://motion.dev/docs/vue),
on the same base as [touk-nesat](https://github.com/KheangLov/touk-nesat) and
[khleng-ek](https://github.com/KheangLov/khleng-ek).

## How it's built

- **The rules are separate from the drawing** (`shared/game/engine.ts`): a plain TypeScript engine,
  stepped at a fixed 60 steps a second, slides the stone, cuts and places it, and emits events
  (placed, cut, perfect, grown back, missed) that drive the effects, sounds and top bar.
  Deterministic, so tests build whole towers.
- **The temple is real 3D, in plain three.js** (`app/game/three/`): a stepped terrace with stairs and
  stone lions in the jungle, far temple towers, stones carved in each temple's own style (lotus
  flowers, smiling faces, fine flowers, steps, nagas, gold), falling cut pieces, and a camera that
  follows the top of the tower (`tower.ts`). Settings → high-quality graphics turns shadows and sharp
  pixels off for older phones.
- **The menus have a tower building itself behind them**, and **sound and music are synthesised**
  with Web Audio: each perfect drop chimes a step higher.

## Development

```bash
pnpm install
pnpm dev          # http://localhost:3000
```

| Command | What it does |
|---|---|
| `pnpm dev` | Dev server |
| `pnpm lint` / `pnpm lint:fix` | ESLint (includes code style) |
| `pnpm typecheck` | Type-check the app and the unit tests |
| `pnpm test` | Unit tests (`test/unit`: the engine, and a simple builder that must finish all 150 levels while a careless one doesn't) and Nuxt tests (`test/nuxt`) |
| `pnpm build` | Production build (Cloudflare Workers; Vercel's preset on Vercel) |
| `pnpm build:federation` | The gaming gateway's remote (`/mf/remoteEntry.js`), copied into the site's build |
| `pnpm run deploy` | Build both and deploy to Cloudflare |
| `pnpm layout [base URL] [folder]` | Screenshots at four screen sizes in both languages, failing on sideways scrolling or a tower that doesn't fit |
| `pnpm icons [chromium]` | Regenerate the PNG icons from `public/icon.svg` |

## Balance

Levels are made from their number (`shared/game/levels.ts`): floors, the first stone's size, slide
speed and wind. Tuning numbers are in `shared/game/data.ts`. The simple builder in
`test/unit/helpers/autoplay.ts` drops with a timing error of up to ±30 ms and must finish every
level; one with ±90 ms must fail more than ten, so the late levels stay a challenge. A player who
taps within about ±45 ms finishes everything.

## Deploying

- **Vercel**: import the repository; `vercel.json` builds the site and the gateway remote.
- **Cloudflare Workers**: `pnpm run deploy`, or push to `main` with the `CLOUDFLARE_API_TOKEN` and
  `CLOUDFLARE_ACCOUNT_ID` secrets set.

Then set the game's `siteUrl` in the gateway's registry entry (`prasat` in `app/games/registry.ts`) to
the deployed address.

## Credits

- Fonts: [Kantumruy Pro](https://fonts.google.com/specimen/Kantumruy+Pro) and [Koulen](https://fonts.google.com/specimen/Koulen) (SIL Open Font License 1.1), bundled via Fontsource
- Icons: [Lucide](https://lucide.dev) (ISC License)
- An original game in the stacking genre; all characters, art, names and story are its own.
