# GitHub Copilot Instructions for Next.js Project

## Commit & Branch Naming Conventions

### Commits

- **Format**: `#XXX commit message in lowercase imperative mood`
- **Examples**:
  - `#123 add user authentication flow`
  - `#456 fix navigation menu overflow`
  - `#789 refactor payment processing logic`
- **Rules**:
  - Always prefix with issue number
  - Use lowercase only
  - Use imperative mood (add, fix, refactor, not added, fixed, refactored)
  - No colon after issue number

### Branches

- **Format**: `XXX-ticket-name-in-kebab-case`
- **Examples**:
  - `123-add-user-authentication`
  - `456-fix-navigation-overflow`
  - `789-refactor-payment-processing`

### Pull Requests

- **Format**: `#XXX Ticket Name In Title Case`
- **Examples**:
  - `#123 Add User Authentication`
  - `#456 Fix Navigation Overflow`
  - `#789 Refactor Payment Processing`

## Tech Stack

- **Framework**: Next.js with App Router
- **Database**: Prisma ORM
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Language**: TypeScript (strict mode)

## Architecture & Patterns

### API Layer

- **NEVER use API routes** (`app/api/` directory)
- **ALWAYS use Server Actions** for data mutations
- **Use server components** for data fetching with Prisma calls
- Import Prisma queries from separate service/repository files

### Component Structure

- Components live in centralized `components/` directory
- Organize into subdirectories as needed:

```
  components/
    ├── ui/           # shadcn components
    ├── forms/        # form-related components
    ├── layouts/      # layout components
    └── features/     # feature-specific shared components
```

- Keep components focused and composable and only add comments when necessary to explain complex logic

### TypeScript

- Use TypeScript strict mode
- Define proper types for all props and function parameters
- Avoid `any` type
- Prefer interfaces for complex component props
- Use Prisma-generated types where applicable

### Server Actions

- Define server actions in separate files (e.g., `prisma/services/user-actions.ts`)
- Always use `'use server'` directive
- Include proper error handling and validation
- Return typed responses

### Data Access

- All database operations go through Prisma
- Create service/repository files for complex queries
- Keep Prisma calls in server components or server actions only
- Never expose database calls to client components

### File Organization

```
app/
  ├── (routes)/           # route groups
components/               # shared components
lib/
  ├── actions/           # server actions
  ├── data/              # data queries and services
  ├── db.ts              # Prisma client
  └── utils.ts           # utility functions
prisma/
  ├── schema.prisma      # Prisma schema
  └── services/          # server actions and data access logic
```

## Code Style Preferences

- Use named exports over default exports in all cases
- Prefer functional components with hooks
- Use async/await over promises
- Implement proper loading and error states
- Use Tailwind classes, avoid custom CSS unless absolutely necessary
- Follow shadcn/ui patterns for component composition
- For single line loops or conditionals, do not use curly braces

## Best Practices

1. **Server vs Client Components**:
   - Default to server components
   - Only use `'use client'` when needed (interactivity, hooks, browser APIs)

2. **Data Fetching**:
   - Fetch data in server components
   - Use Prisma for all database queries
   - Implement proper error boundaries

3. **Forms**:
   - Use Server Actions for form submissions
   - Implement progressive enhancement
   - Add proper validation (client + server)

4. **Performance**:
   - Leverage Next.js caching strategies
   - Use `revalidatePath` or `revalidateTag` after mutations

5. **Security**:
   - Validate all inputs
   - Never expose sensitive data to client
   - Use environment variables for secrets
