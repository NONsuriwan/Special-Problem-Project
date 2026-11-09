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

- Figma: design system and UI design (add link)

## Tech stack

SvelteKit, TypeScript, Vite, pnpm. The back-end (Hono.js, PostgreSQL, Drizzle ORM) is a separate repository.

## Getting started

Requires Node.js and pnpm, and the back-end running locally.

```bash
pnpm install
cp .env.example .env   # fill in the values below
pnpm dev
```

Environment variables: `<list the variable names from your .env here>`

## Related

- Back-end repository: https://github.com/Bobby9326/Equipment-System-Backend

## Authors

- **Thananon Suriwan**: requirements, system design, front-end, UI design
- **Siwakorn Boonkaew**: requirements, system design, back-end, API, database

Advisor: Suntana Oudomying. Department of Computer Science, School of Science, KMITL.
