# Equipment Management System: Front-end

Web front-end of the **Equipment Management System for the School of Science, KMITL**: a special problem project (academic year 2025) that replaces paper and spreadsheet records of university equipment with a digital system.

Built with **SvelteKit** and TypeScript. The user interface is in Thai and designed for desktop and tablet.

> **Status:** a working demo built to show the direction for the next development team. All baseline requirements passed the system tests (see the thesis, Table 4.1). There is no public live demo, because the system needs the back-end, a database and Google sign-in.

## Screenshots

<!-- Add 3-5 screenshots to /docs and link them here, for example: -->
<!-- ![Dashboard](docs/dashboard.png) -->
<!-- ![Equipment list](docs/equipment-list.png) -->
<!-- ![Equipment detail and history](docs/equipment-detail.png) -->

## Features

- **Sign in with Google** (institution accounts only). Only users added by an Admin can enter. Routes are protected on the server and the access token refreshes automatically.
- **Equipment:** register many items at once, edit, attach images and documents, and change status. There are 6 statuses, and "disposed" is final and cannot be undone.
- **Search and filter** equipment, MHESI document numbers and procurement projects by name, code, type, status, department, building, fiscal year and value range.
- **History timeline** on every detail page: before/after values, who made the change and when.
- **Linked records:** project, MHESI document number and equipment items are connected, so each item's origin can be traced.
- **Reports:** straight-line daily depreciation report and physical inventory report, both filterable.
- **Roles:** User and Admin. Admins manage user accounts.

## Design

The UI was designed in Figma first (design system and screens) and then built in SvelteKit.

- [Design System (Figma)](https://www.figma.com/design/SGZ03b2RSrhFEFcu6bzazq/%E0%B8%A3%E0%B8%B0%E0%B8%9A%E0%B8%9A%E0%B8%88%E0%B8%B1%E0%B8%94%E0%B8%81%E0%B8%B2%E0%B8%A3%E0%B8%84%E0%B8%A3%E0%B8%B8%E0%B8%A0%E0%B8%B1%E0%B8%93%E0%B8%91%E0%B9%8C%E0%B8%84%E0%B8%93%E0%B8%B0%E0%B8%A7%E0%B8%B4%E0%B8%97%E0%B8%A2%E0%B8%B2%E0%B8%A8%E0%B8%B2%E0%B8%AA%E0%B8%95%E0%B8%A3%E0%B9%8C?node-id=44-2): colors, typography, spacing, icons and components
- [UI Design (Figma)](https://www.figma.com/design/SGZ03b2RSrhFEFcu6bzazq/%E0%B8%A3%E0%B8%B0%E0%B8%9A%E0%B8%9A%E0%B8%88%E0%B8%B1%E0%B8%94%E0%B8%81%E0%B8%B2%E0%B8%A3%E0%B8%84%E0%B8%A3%E0%B8%B8%E0%B8%A0%E0%B8%B1%E0%B8%93%E0%B8%91%E0%B9%8C%E0%B8%84%E0%B8%93%E0%B8%B0%E0%B8%A7%E0%B8%B4%E0%B8%97%E0%B8%A2%E0%B8%B2%E0%B8%A8%E0%B8%B2%E0%B8%AA%E0%B8%95%E0%B8%A3%E0%B9%8C?node-id=74-4): all screens (dashboard, lists, forms, detail pages, reports)

## Tech stack

SvelteKit, TypeScript, Vite, Auth.js (Google OAuth), pnpm. The back-end (Hono.js, PostgreSQL, Drizzle ORM) is a separate repository.

## Getting started

Requires Node.js and pnpm, and the back-end running locally.

```bash
pnpm install
cp .env.example .env   # then fill in the values below
pnpm dev
```

### Configuration

The real `.env` holds credentials, so it is not committed. Copy `.env.example` and fill in:

| Variable | Description |
| --- | --- |
| `AUTH_GOOGLE_ID` | Google OAuth client ID (from the Google Cloud Console) |
| `AUTH_GOOGLE_SECRET` | Google OAuth client secret |
| `AUTH_SECRET` | Random key used to encrypt sessions (generate with `openssl rand -base64 32`) |
| `VITE_API_URL` | Address of the back-end API (default `http://localhost:3000`) |

## Related

- Back-end repository: https://github.com/Bobby9326/Equipment-System-Backend

## Authors

- **Thananon Suriwan**: requirements, system design, UI design, front-end
- **Siwakorn Boonkaew**: back-end, API, database

Advisor: Suntana Oudomying. Department of Computer Science, School of Science, KMITL.
