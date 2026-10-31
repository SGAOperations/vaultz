# VaultZ

VaultZ is a financial administration tool designed to help organizations manage budgets, track purchases, handle fund allocations, and report on spending across fiscal years. It supports multiple designations (funding sources), each with their own categories, budgets, and allocation groups, all organized around configurable fiscal years and periods.

## Tech Stack

| Layer         | Technology                                                                |
| ------------- | ------------------------------------------------------------------------- |
| Framework     | [Next.js 16](https://nextjs.org) (App Router)                             |
| Language      | TypeScript (strict mode)                                                  |
| Database      | PostgreSQL via [Prisma ORM](https://www.prisma.io)                        |
| Styling       | [Tailwind CSS v4](https://tailwindcss.com)                                |
| UI Components | [shadcn/ui](https://ui.shadcn.com) + [Radix UI](https://www.radix-ui.com) |
| Charts        | [Recharts](https://recharts.org)                                          |
| File Uploads  | [UploadThing](https://uploadthing.com)                                    |
| Forms         | [React Hook Form](https://react-hook-form.com) + [Zod](https://zod.dev)   |
| Server State  | [TanStack Query](https://tanstack.com/query)                              |

## Features

### Designations

Designations represent distinct funding sources or accounts (e.g., a department or grant). Each designation has a code, name, and a configurable budget reset behavior (reset or rollover) that controls how unspent budgets carry over between fiscal years. All purchases, categories, and allocations are scoped to a designation.

### Categories & Budgets

Categories group spending within a designation, each identified by a code and ledger code. Annual budgets can be set per category per fiscal year. Category budgets can be compared across years, and transfers can move budget between categories within the same designation.

### Purchases

Purchases record individual expenditures. Each purchase captures the amount, description, date, optional notes, receipts (uploaded via UploadThing), and links to a category, user, and optionally an allocation. Purchases can be flagged for reimbursement, excluded from totals, or marked as having an expense report created.

### Allocations & Allocation Groups

Allocations represent pre-approved spending amounts tied to a designation and period. They can be organized into named allocation groups for easier management. Purchases can be associated with an allocation to track spending against approved amounts. Allocations can be copied between periods.

### Transfers

Transfers move budget between two categories within the same fiscal year. Each transfer records the amount, source category, destination category, and optional notes. Transfer history is tracked and visible per category.

### Fiscal Years & Periods

The application is organized around fiscal years, each with a start and end date. Years are subdivided into periods (e.g., months or quarters) that scope allocations. The active year and period drive the default views and data displayed throughout the application.

### Processes

Process templates define multi-step approval or workflow sequences (e.g., reimbursement approval). Each template has ordered steps, and a process can be attached to a purchase to track completion of each step.

### Users

Users represent individuals who make purchases. Each user has a profile and a full history of their associated purchases.

### Reports

The year comparison report allows side-by-side analysis of spending and budgets across fiscal years, giving visibility into trends and budget utilization over time.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) (v20+)
- [Docker](https://www.docker.com) (for local PostgreSQL)

### Local Development

1. **Clone the repository and install dependencies:**

```bash
npm install
```

2. **Configure environment variables:**

Create a `.env` file in the root of the project and set the following:

```env
DATABASE_URL=postgresql://admin:admin@localhost:5432/vaultz
UPLOADTHING_TOKEN=<your_uploadthing_token>
SGAUTH_URL=http://auth.sga.localhost:3000
SGAUTH_COOKIE_NAME=sgauth-local.session_token
```

| Environment      | `SGAUTH_URL`                           | `SGAUTH_COOKIE_NAME`                |
| ---------------- | -------------------------------------- | ----------------------------------- |
| Production       | `https://auth.northeasternsga.com`     | `__Secure-sgauth.session_token`     |
| Dev and previews | `https://auth-dev.northeasternsga.com` | `__Secure-sgauth-dev.session_token` |
| Local            | `http://auth.sga.localhost:3000`       | `sgauth-local.session_token`        |

Every page except `/api/uploadthing` and `/health` redirects signed-out visitors to SGAuth sign-in, which sends them back afterwards.

### Permissions

VaultZ decides access from the user's SGA positions. SGAuth only supplies the positions. The map lives in `lib/permissions.ts`, the only place position keys appear in the code. Keys come from the curated list in SGAOperations/auth (`prisma/seed/positions.json`).

| Capability | Positions                                                                                                                                                  | Allows                       |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| `edit`     | `executive-vice-president`, `vice-president-of-operational-affairs`, `comptroller`                                                                         | every create, update, delete |
| `view`     | everyone with `edit`, plus `student-body-president`, `speaker-of-the-senate`, `senator`, `parliamentarian`, and every other `vice-president-of-*` position | every page and read          |
| none       | any other position, or no positions                                                                                                                        | nothing: a "No access" page  |

Every server action in `prisma/services/` calls `requireCapability('view' | 'edit')` first, and receipt uploads require `edit`. 3. **Start the local database:**

```bash
npm run db:start
```

4. **Run database migrations:**

```bash
npx prisma migrate dev
```

5. **Seed the database (optional):**

```bash
npm run prisma:seed
```

6. **Start the development server:**

```bash
npm run dev
```

Open [http://vaultz.sga.localhost:3001](http://vaultz.sga.localhost:3001) in your browser. With SGAuth enabled, never use bare `localhost`: the local session cookie is scoped to `sga.localhost`. Chrome and Edge resolve `*.localhost` on their own; Firefox needs `vaultz.sga.localhost` and `auth.sga.localhost` in `network.dns.localDomains`, and Safari may need a hosts-file entry.

### Dev and Preview Environments

| Host                             | Branch      | SGAuth                                                                |
| -------------------------------- | ----------- | --------------------------------------------------------------------- |
| `finance.northeasternsga.com`    | `main`      | production                                                            |
| `vaultz-dev.northeasternsga.com` | `dev`       | dev SGAuth (`auth-dev`), env vars set on Preview for the `dev` branch |
| `*.vercel.app` previews          | PR branches | none: shows an "SSO unavailable on this host" page when SGAuth is on  |
| `vaultz.sga.localhost:3001`      | local       | local SGAuth on `auth.sga.localhost:3000`, no registry entry needed   |

The SGAuth cookie only reaches `northeasternsga.com` hosts, so preview the `dev` branch on `vaultz-dev.northeasternsga.com`. Sign in to dev SGAuth requires unlocking the `auth-dev` preview gate once per browser.

### Available Scripts

| Script                   | Description                                 |
| ------------------------ | ------------------------------------------- |
| `npm run dev`            | Start the development server with Turbopack |
| `npm run build`          | Build for production                        |
| `npm run start`          | Start the production server                 |
| `npm run prettier:check` | Check code formatting                       |
| `npm run prettier:fix`   | Auto-fix code formatting                    |
| `npm run eslint:check`   | Run ESLint                                  |
| `npm run eslint:fix`     | Auto-fix ESLint issues                      |
| `npm run tsc:check`      | Type-check without emitting                 |
| `npm run db:start`       | Start the local PostgreSQL container        |
| `npm run db:stop`        | Stop the local PostgreSQL container         |
| `npm run db:reset`       | Reset the database                          |
| `npm run prisma:migrate` | Run Prisma migrations                       |
| `npm run prisma:seed`    | Seed the database                           |
