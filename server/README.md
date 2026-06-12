# GCTU Campus Navigator — Backend (MongoDB + Express)

## Setup

1. Copy `.env.example` to `.env` and set `MONGODB_URI` (local Mongo or MongoDB Atlas).
2. Install dependencies:
   ```
   npm install
   ```
3. Seed the database with existing campus data (buildings, graph, FAQs, contacts):
   ```
   npm run seed
   ```
4. Start the API server:
   ```
   npm run server
   ```
   Runs on `http://localhost:5000` by default.

5. In another terminal, start the frontend:
   ```
   npm run dev
   ```
   Vite proxies `/api/*` requests to the Express server (see `vite.config.ts`).

## API Endpoints

| Method | Endpoint                  | Description                          |
|--------|---------------------------|---------------------------------------|
| GET    | `/api/buildings`           | All buildings                        |
| GET    | `/api/buildings/search?q=` | Text search by name, alias, or room (e.g. `?q=COLT`, `?q=Room G6`) |
| GET    | `/api/buildings/:id`       | Single building by id                |
| GET    | `/api/graph`               | Graph nodes + edges for routing      |
| GET    | `/api/faqs`                | FAQ list for Help Desk               |
| GET    | `/api/faqs/search?q=`      | Text search FAQs (e.g. `?q=wifi`)    |
| GET    | `/api/contacts`            | Support hotline contacts             |
| GET    | `/api/tickets`             | All help desk tickets (newest first) |
| POST   | `/api/tickets`             | Create a ticket `{name, faculty, subject, message}` |
| PATCH  | `/api/tickets/:ticketId`   | Update ticket status/reply           |

## Models (server/models)

- **Building** — id, name, shortName, category, emoji, lat, lng, desc, facts[], image, aliases[], rooms[] (name, floor, capacity, desc). Text-indexed on name/shortName/aliases/rooms.name for search like "COLT" or "Room G6".
- **GraphNode** — id, name, lat, lng, type (building/junction)
- **GraphEdge** — from, to
- **Ticket** — ticketId, name, faculty, subject, message, status, reply, date
- **Faq** — faqId, category, question, answer. Text-indexed for search.
- **Contact** — dept, phone

## Notes

- HelpDesk.jsx now fetches FAQs, contacts, and tickets from the API instead of localStorage. The bot auto-reply logic moved server-side (`server/routes/tickets.js`), triggered ~2.5s after ticket creation.
- `npm run seed` clears and repopulates all collections — re-run anytime to reset data from `src/data/buildings.js`.
