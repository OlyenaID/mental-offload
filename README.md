# Mental Offload site

The public site for Mental Offload, deployed on Vercel.

- `/waitlist` (`waitlist/index.html`): the waitlist page. `/` redirects here for now.
- `/api/subscribe` (`api/subscribe.js`): adds a sign-up to Kit with the tags `Waitlist` plus the chosen system (`Claude`, `ChatGPT`, `Muse` or `App`).

## Setup in Vercel

1. Import this repo as a new project named `mental-offload` (address: mental-offload.vercel.app).
2. In Project Settings > Environment Variables, add `KIT_API_KEY` (your Kit v4 API key).
3. In Kit, create the tags `Waitlist`, `Claude`, `ChatGPT`, `Muse` and `App`.

## Preview locally

Serve the folder with any static server and open `/waitlist/`. On localhost the form shows the thank-you message without calling Kit.
