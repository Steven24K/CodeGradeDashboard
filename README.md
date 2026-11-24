# CodeGrade Dashboard

The CSV dashboard is a client-side SPA: CSV files are parsed in the browser and
are not uploaded. The `/api` view uses local Next.js server routes to fetch
CodeGrade courses, assignments, and grades. The bearer token is validated by
the local server before being stored in an HttpOnly, SameSite=Lax cookie for
eight hours (Secure in production). The cookie is not readable by browser
JavaScript; API requests use it only to authenticate with the local server.

Static site hosted on GitHub Pages:
[Visit Dashboard](https://stevenkoerts.nl/CodeGradeDashboard/)

The CodeGrade API view requires the local Next.js server and is not available
from GitHub Pages. The workflow now builds and type-checks the server app; it
does not publish a static export.

The API flow is split into pages: `/api` connects with a bearer token,
`/api/courses` lists courses, `/api/courses/<course-id>/<course-name>` shows
the course gradebook, and its `/students/<internal-user-id>` route shows a
student's submission activity. The detail page fetches submissions
sequentially for each course assignment using the student's internal CodeGrade
user ID. Assessment eligibility requires every assignment and master
assignment to have a grade of at least 5.5, and any Challenge exercise must be
completed. Course assignments and gradebook data are cached in shared app state
and reused on the student detail page, so it does not fetch assignment pages
again. Student submissions are also cached until explicitly reloaded. The
app state is in memory and resets on a full page refresh, while the cookie
persists until it expires or the user disconnects. The page shows a status
board, submission counts grouped by hour/day/week/month, a year activity
heatmap, and a submission timeline.

## Manual 
1. Download Gradebook from CodeGrade.
2. Open the CSV dashboard and choose the downloaded CSV file.
3. Use the leaderboard to compare progress, check assessment eligibility, and
   expand a student for exercise details.
4. For live data, start the local server with `npm run dev`, open
   [http://localhost:3000/api](http://localhost:3000/api), enter a CodeGrade
   bearer token, load your courses, and select one. The server fetches each
   assignment's grades in sequence. Reload retries the selected course.

## Privacy Statement
CSV data stays in the browser and is evaluated locally. API mode sends the
bearer token once to the local Next.js server for validation. Subsequent
requests use the HttpOnly cookie, and the local server forwards authorized
requests to CodeGrade. Use the API view only on a trusted local machine.

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
