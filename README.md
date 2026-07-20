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
VAULTZ_ACCESS_CODE=<shared passphrase>
VAULTZ_ACCESS_SECRET=<random signing secret>
```

3. **Start the local database:**

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

Open [http://localhost:3000](http://localhost:3000) in your browser.

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
