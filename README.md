# GCTU Campus Navigator

A campus navigation Progressive Web App for Ghana Communication Technology University (GCTU), Tesano Campus, Accra, Ghana.

## About

The app helps students and visitors find their way around the GCTU Tesano campus. It computes the shortest walking route between campus locations with Dijkstra's algorithm, gives turn-by-turn directions, tracks the user live with GPS, and keeps working offline. A help desk lets students browse FAQs, call support hotlines and file support requests, which admins manage after signing in.

## Features

- **Interactive campus map**: buildings and walkways on OpenStreetMap (Leaflet), with light and dark themes
- **Shortest-path routing**: Dijkstra over the campus walkway graph, with turn-by-turn directions
- **Live GPS**: position snapped onto the route, distance remaining, and an off-campus warning
- **Walk demo**: simulated walk along the route for demonstrations away from campus
- **Offline support**: installable PWA; routing works with no connection
- **Help desk**: FAQs, hotlines, support tickets with an automatic keyword-based reply
- **Admin access**: bcrypt-hashed passwords and JWT-protected ticket management

## Tech stack

| Layer | Technologies |
|---|---|
| Frontend | React 19, Vite, Leaflet / React-Leaflet, Lucide icons, plain CSS |
| Backend | Node.js, Express, CORS, dotenv |
| Database | MongoDB Atlas, Mongoose |
| Auth | bcryptjs, JSON Web Tokens |
| Testing | Vitest, React Testing Library, jsdom |

## Getting started

```bash
npm install
cp .env.example .env      # then fill in MONGODB_URI, JWT_SECRET and admin credentials
npm run seed              # load buildings, walkways, FAQs and contacts into MongoDB
```

**Development** (two terminals; Vite proxies `/api` to Express):

```bash
npm run server            # API on http://localhost:5000
npm run dev               # app on http://localhost:3000
```

**Production-style** (one server serves both the app and the API):

```bash
npm run build
npm start                 # app and API on http://localhost:5000
```

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server on port 3000 |
| `npm run build` | Production build into `dist/` |
| `npm start` / `npm run server` | Express API (and the built app, if `dist/` exists) |
| `npm run seed` | Reset and reload campus data, FAQs and contacts (tickets and admins are kept) |
| `npm test` | All tests: UI (jsdom) and API integration (real Express + MongoDB) |
| `npm run test:db` | MongoDB connection diagnostics |
| `npm run lint` | Type-check with TypeScript |

## Project structure

```
src/
  App.jsx                   App shell: tabs, theme, PWA banners
  components/
    CampusHome.jsx          Campus tab: slideshow, stats, building cards
    NavigationPanel.jsx     Navigate tab: route planner + map
    HelpDesk.jsx            Help Desk tab
    navigation/             Map, camera controller, icons, walk log, telemetry
    helpdesk/               FAQ accordion, hotlines, ticket form/list, admin card
    layout/                 Header, mobile nav, logo, PWA banners
    ui/                     Shared building blocks (SectionHeader, Banner)
  hooks/                    useLiveGps, useWalkSimulation, useAdminSession,
                            useHelpDeskContent, useTheme, usePwa
  lib/
    geo.js                  Haversine distance, route projection
    routing.js              Dijkstra, turn-by-turn directions
    api.js                  API client
    storage.js              Safe localStorage
  data/                     Campus graph and help-desk content (shared with the seed)
server/
  index.js                  Express app, error handling, serves dist/
  routes/                   campus, helpdesk, tickets, admin
  services/botReply.js      Help-desk auto-reply rules
  middleware/auth.js        JWT verification
  models/                   Mongoose schemas
  seed/seed.js              Database seed
public/
  sw.js                     Service worker (offline caching)
  manifest.webmanifest      PWA manifest and icons
```

See [server/README.md](server/README.md) for the API endpoints.

## Developer

Kwesi Brew
