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

### Purchase Requests

Requester positions submit purchase requests against their divisions' allocations. Every request must name an E-Board purchaser (a user marked as one under Requests → Settings) and a purchasing method: one of the process templates offered as a method, also chosen under Requests → Settings. A request moves through these stages:

1. **Awaiting purchaser.** The E-Board purchaser approves it, or sends it back for revision. A requester who names themselves as purchaser skips this stage.
2. **Pending.** The Comptroller approves it, sends it back, or escalates it. Escalating sends the VPOA a Slack DM and hides the Comptroller's decisions until they return the request.
3. **Needs revision.** A sent-back request shows the reviewer's note. When the requester edits it, it goes back through the purchaser, then the Comptroller.

Sending back is every reviewer's default way to decline; rejecting outright ends the request and is a separate, less prominent action. The VPOA can approve, send back or reject at any open stage. The requester can edit or cancel only until the purchaser approves. Approving creates a purchase for the purchaser, dated that day, for the requested amount, and starts the request's purchasing method as its process; the approver can switch the method first. The request keeps the original amount if the purchase is edited later. Open requests count as committed against their allocation, so requesters and reviewers see a warning when a request exceeds the available balance. Every change is recorded in the request's history.

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
SLACK_BOT_TOKEN=<sgassist_bot_token>
```

`SLACK_BOT_TOKEN` is the SGAssist bot token. It needs the `chat:write` and `users:read.email` scopes: the bot finds every recipient in Slack by their SGAuth email. For the Comptroller and VPOA, VaultZ uses whoever most recently signed in holding that position, since SGAuth can't yet say who holds a position; a new officer takes over once they sign in to VaultZ. If Slack isn't configured or a recipient can't be found, requests still work and the failure is recorded in the request's history; an escalation message can be resent from the request page.

The bot sends these DMs, never about the recipient's own action:

| Event                                                | Recipient   |
| ---------------------------------------------------- | ----------- |
| A request awaits the purchaser (submitted or edited) | Purchaser   |
| A request awaiting the purchaser is cancelled        | Purchaser   |
| A request reaches Pending                            | Comptroller |
| A request is escalated                               | VPOA        |
| The VPOA approves or rejects a request               | Comptroller |
| A request is sent back, approved or rejected         | Requester   |

| Environment      | `SGAUTH_URL`                           | `SGAUTH_COOKIE_NAME`                |
| ---------------- | -------------------------------------- | ----------------------------------- |
| Production       | `https://auth.northeasternsga.com`     | `__Secure-sgauth.session_token`     |
| Dev and previews | `https://auth-dev.northeasternsga.com` | `__Secure-sgauth-dev.session_token` |
| Local            | `http://auth.sga.localhost:3000`       | `sgauth-local.session_token`        |

Every page except `/api/uploadthing` and `/health` redirects signed-out visitors to SGAuth sign-in, which sends them back afterwards.

### Permissions

VaultZ decides access from the user's SGA positions. SGAuth only supplies the positions. The map lives in `lib/permissions.ts`, the only place position keys appear in the code. Keys come from the curated list in SGAOperations/auth (`prisma/seed/positions.json`).

| Capability | Positions                                                                                                                                       | Allows                       |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| `edit`     | `executive-vice-president`, `vice-president-of-operational-affairs`, `comptroller`                                                              | every create, update, delete |
| `view`     | everyone with `edit`, plus `student-body-president`, `speaker-of-the-senate`, `parliamentarian`, and every other `vice-president-of-*` position | every page and read          |
| requester  | positions listed under Requests → Settings (`RequesterPosition`), seeded with every `edit` and `view` position                                  | submitting purchase requests |
| none       | any other position, or no positions                                                                                                             | nothing: a "No access" page  |

Requesters submit against the divisions mapped to their position (`PositionDivisionAccess`); editors can submit against any division. A listed position without `view` sees only the request page. Viewers can read every request.

Request decisions are separate from `edit`: the Comptroller approves, rejects or escalates pending requests, and the VPOA can approve or reject any open request. The EVP has no request powers.

Every server action in `prisma/services/` calls `requireCapability('view' | 'edit')` or, for purchase requests, `requireRequestAccess()` first. Receipt uploads require `edit`; request attachments require request access. 3. **Start the local database:**

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
