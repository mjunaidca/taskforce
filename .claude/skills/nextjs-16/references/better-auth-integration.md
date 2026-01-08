# Better Auth Integration with Next.js 16

Patterns for integrating Better Auth SSO with Next.js 16's new conventions.

## Session Management

### Server Components

```typescript
// lib/auth.ts
import { betterAuth } from 'better-auth'
import { headers, cookies } from 'next/headers'

export const auth = betterAuth({
  // Your Better Auth configuration
})

export async function getSession() {
  const cookieStore = await cookies()
  const headersList = await headers()

  // Get session from Better Auth
  return auth.api.getSession({
    headers: new Headers({
      cookie: cookieStore.toString(),
    }),
  })
}
```

### Using in Pages (Async Params)

```typescript
// app/dashboard/[workspaceId]/page.tsx
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'

interface Props {
  params: Promise<{ workspaceId: string }>
}

export default async function DashboardPage({ params }: Props) {
  const session = await getSession()

  if (!session) {
    redirect('/login')
  }

  const { workspaceId } = await params

  return (
    <div>
      <h1>Welcome, {session.user.name}</h1>
      <p>Workspace: {workspaceId}</p>
    </div>
  )
}
```

## Proxy Authentication

### Protected Routes via proxy.ts

```typescript
// proxy.ts
import { NextRequest, NextResponse } from 'next/server'

const publicPaths = [
  '/',
  '/login',
  '/register',
  '/api/auth',  // Better Auth API routes
]

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public paths
  for (const path of publicPaths) {
    if (pathname === path || pathname.startsWith(`${path}/`)) {
      return NextResponse.next()
    }
  }

  // Allow static assets
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // Check for Better Auth session cookie
  const sessionToken = request.cookies.get('better-auth.session_token')

  if (!sessionToken) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

## API Route Handlers

### Protected API with Async Params

```typescript
// app/api/workspaces/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'

interface Props {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: Props) {
  const session = await getSession()

  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  const { id } = await params

  // Fetch workspace with user context
  const workspace = await db.workspace.findFirst({
    where: {
      id,
      members: { some: { userId: session.user.id } },
    },
  })

  if (!workspace) {
    return NextResponse.json(
      { error: 'Not found' },
      { status: 404 }
    )
  }

  return NextResponse.json(workspace)
}
```

## Client-Side Auth

### Auth Provider

```typescript
// components/providers/auth-provider.tsx
'use client'

import { createAuthClient } from 'better-auth/client'
import { createContext, useContext } from 'react'

const authClient = createAuthClient()

const AuthContext = createContext(authClient)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <AuthContext.Provider value={authClient}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
```

### Protected Client Component

```typescript
// components/user-menu.tsx
'use client'

import { useAuth } from './providers/auth-provider'

export function UserMenu() {
  const auth = useAuth()
  const { data: session, isPending } = auth.useSession()

  if (isPending) {
    return <div>Loading...</div>
  }

  if (!session) {
    return (
      <button onClick={() => auth.signIn.social({ provider: 'google' })}>
        Sign In
      </button>
    )
  }

  return (
    <div>
      <span>{session.user.name}</span>
      <button onClick={() => auth.signOut()}>
        Sign Out
      </button>
    </div>
  )
}
```

## Layout with Auth

```typescript
// app/layout.tsx
import { AuthProvider } from '@/components/providers/auth-provider'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
```

## Forwarding Token to FastAPI Backend

### Server Action

```typescript
// app/actions/tasks.ts
'use server'

import { cookies } from 'next/headers'

export async function createTask(title: string) {
  const cookieStore = await cookies()
  const token = cookieStore.get('better-auth.session_token')?.value

  const response = await fetch(`${process.env.BACKEND_URL}/api/tasks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ title }),
  })

  if (!response.ok) {
    throw new Error('Failed to create task')
  }

  return response.json()
}
```

### API Route Proxy

```typescript
// app/api/backend/[...path]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

interface Props {
  params: Promise<{ path: string[] }>
}

export async function GET(request: NextRequest, { params }: Props) {
  const { path } = await params
  const cookieStore = await cookies()
  const token = cookieStore.get('better-auth.session_token')?.value

  const response = await fetch(
    `${process.env.BACKEND_URL}/api/${path.join('/')}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  )

  return NextResponse.json(await response.json(), {
    status: response.status,
  })
}
```

## Common Patterns

### Redirect After Login

```typescript
// app/login/page.tsx
interface Props {
  searchParams: Promise<{ callbackUrl?: string }>
}

export default async function LoginPage({ searchParams }: Props) {
  const { callbackUrl = '/dashboard' } = await searchParams

  return (
    <LoginForm redirectTo={callbackUrl} />
  )
}
```

### Role-Based Access

```typescript
// app/admin/page.tsx
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function AdminPage() {
  const session = await getSession()

  if (!session) {
    redirect('/login')
  }

  if (session.user.role !== 'admin') {
    redirect('/unauthorized')
  }

  return <AdminDashboard />
}
```
