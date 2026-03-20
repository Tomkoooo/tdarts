# Frontend Rendering Refactors

## A) Move tournament route to server-first rendering

- **Current issue**
  - `src/app/[locale]/tournaments/[code]/page.tsx` is fully client-driven.
- **Refactor direction**
  - Render initial overview in server component.
  - Keep interactive sections in a client wrapper.

```ts
// server page wrapper
export default async function Page({ params }) {
  const initialData = await getTournamentPageDataAction({
    code: params.code,
    detailLevel: "overview",
    includeViewer: true,
  });
  return <TournamentPageClient initialData={initialData} />;
}
```

## B) Dynamic import heavy tabs and modal stacks

- **Current issue**
  - Players, groups, bracket, boards are eagerly imported even if user never opens them.
- **Files to change**
  - `src/app/[locale]/tournaments/[code]/page.tsx`
- **Refactor direction**
  - Use `next/dynamic` with suspense fallback for non-overview tabs.

## C) Remove full page reload mutation patterns

- **Current issue**
  - `window.location.reload()` in groups view creates expensive full refreshes.
- **Files to change**
  - `src/components/tournament/TournamentGroupsView.tsx`
- **Refactor direction**
  - Apply optimistic UI patch or targeted data refresh callback from parent.
  - Keep local table state stable after mutation.

## D) Reduce rerender cost in large tables/lists

- **Files to optimize**
  - `src/components/tournament/TournamentGroupsView.tsx`
  - `src/components/tournament/TournamentPlayers.tsx`
  - chart/stat modals with heavy calculations
- **Refactor direction**
  - Memoize sorted/grouped derivations.
  - Split rows into memoized leaf components.
  - Introduce virtualization for very long lists.

## E) Reduce locale payload hydration overhead

- **Current issue**
  - Full locale message bundle loaded globally.
- **File to change**
  - `src/app/[locale]/layout.tsx`
- **Refactor direction**
  - Namespace/segment message loading so route only hydrates required dictionary subsets.

