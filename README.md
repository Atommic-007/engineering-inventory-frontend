# Engineering Inventory Frontend
Vue 3 Single File Component + TypeScript + Vite + Axios (T16).

Copy `.env.example` to `.env`, run `npm install`, then `npm run dev`.
Open http://localhost:5173. Requires the matching Express API at
http://localhost:3000 and local PostgreSQL database running in Docker.

`npm run build` performs Vue/TypeScript checks and creates dist/.
`src/App.vue` handles form state, create/edit/delete actions, errors, local
filters, summary cards, and the confirmation dialog. `src/api.ts` configures
Axios; `src/style.css` contains responsive pastel styling.

Set VITE_API_URL for the API URL. Never put database credentials in frontend
variables. UI filtering is client-side; the API additionally supports query filters.
