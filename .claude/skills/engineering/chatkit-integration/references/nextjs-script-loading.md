# Next.js Script Loading for Web Components

## Problem

ChatKit uses a custom web component (`<openai-chatkit>`) that must be defined before React tries to render it. The script that defines this component loads from a CDN.

In Next.js, the default Script loading strategy (`afterInteractive`) loads scripts after the page becomes interactive - but this is too late for web components that React tries to render immediately.

**Symptoms:**
- Console shows: `Failed to load resource: 404 (Not Found)`
- Error: `ChatKit web component is unavailable. Verify that the script URL is reachable.`
- `window.customElements.get('openai-chatkit')` returns undefined

## Solution

Use `beforeInteractive` strategy in the root `layout.tsx` to load the script in `<head>` before React hydration.

## Implementation

### 1. Root Layout (`app/layout.tsx`)

```tsx
import Script from "next/script";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* CRITICAL: Must be in <head> with beforeInteractive */}
        <Script
          src="https://cdn.platform.openai.com/deployments/chatkit/chatkit.js"
          strategy="beforeInteractive"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

### 2. Widget Wait for Definition (`ChatKitWidget.tsx`)

Even with `beforeInteractive`, the component should wait for the custom element to be fully defined:

```typescript
const isBrowser = typeof window !== "undefined";

const [scriptStatus, setScriptStatus] = useState<"pending" | "ready" | "error">(
  isBrowser && window.customElements?.get("openai-chatkit") ? "ready" : "pending"
);

useEffect(() => {
  if (!isBrowser) return;

  // Check if already registered
  if (window.customElements?.get("openai-chatkit")) {
    setScriptStatus("ready");
    return;
  }

  // Wait for custom element to be defined
  customElements.whenDefined("openai-chatkit").then(() => {
    setScriptStatus("ready");
  });
}, []);

// Only render ChatKit when script is ready
{isOpen && scriptStatus === "ready" && (
  <ChatKit control={control} />
)}
```

## Script Strategies Comparison

| Strategy | When It Loads | Use Case | ChatKit Result |
|----------|---------------|----------|----------------|
| `beforeInteractive` | Before hydration, in `<head>` | Web components, critical JS | Works |
| `afterInteractive` | After page interactive | Analytics, non-critical | Fails - too late |
| `lazyOnload` | During idle time | Low priority | Fails - way too late |
| `worker` | Web Worker | Background processing | N/A |

## Key Points

1. **beforeInteractive placement**: Script MUST be in `<head>` element when using `beforeInteractive`
2. **Root layout only**: `beforeInteractive` only works in `app/layout.tsx` or `pages/_document.tsx`
3. **Still wait for definition**: Use `customElements.whenDefined()` as extra safety
4. **SSR considerations**: Check `typeof window !== "undefined"` before accessing browser APIs

## Framework Comparison

| Framework | Script Loading Method |
|-----------|----------------------|
| Next.js App Router | `<Script strategy="beforeInteractive">` in layout.tsx |
| Docusaurus | `scripts: [{ src, defer: true }]` in docusaurus.config.ts |
| Vite/React | `<script>` tag in index.html (synchronous) |
| Create React App | `<script>` tag in public/index.html |

## Common Mistakes

| Mistake | Why It Fails | Fix |
|---------|--------------|-----|
| Using `afterInteractive` | Loads after React renders | Use `beforeInteractive` |
| Script in page component | Not in `<head>`, timing issues | Move to root layout.tsx |
| Not waiting for definition | Race condition with React | Use `customElements.whenDefined()` |
| Checking `window` on server | SSR error | Guard with `typeof window` check |

## Evidence

- Implementation: `web-dashboard/src/app/layout.tsx`
- Widget waiting logic: `web-dashboard/src/components/chat/ChatKitWidget.tsx:42-93`
- Docusaurus reference: `robolearn-interface/docusaurus.config.ts`
