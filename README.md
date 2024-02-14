# Example navigation with Next.js + Next router with @coveo/headless

Built from starter template for [Learn Next.js](https://nextjs.org/learn).

This is a vanilla project using next.js and @coveo/headless. It is not using any prebuilt UI component library, and it is _ NOT _ a complete implementation.

The goal of is repository is mainly for educational purposes: It only try to and showcase how navigation can work in the simplest possible manner, and only keep the strict necessary to show how it can be achieved.

This repository tries to showcase an implementation of the concepts that are explained in this page: https://docs.coveo.com/en/headless/latest/usage/synchronize-search-parameters-with-the-url/

## Running this demo

```
npm i
npm run dev
```

## Set the initial search parameters to the values in the URL when a page first load

First, all headless controllers and engine are initialized and created, and then exported as a single module in `./headless/index.ts`. This also means the `urlManager` is instantiated there.

Then, following this, and by looking at next.js online documentation, we can see that `_app.tsx` is the way they recommend to bootstrap any logic an app might need to perform on initialization.

As such, we have this piece of code:

```typescript
if (windowExists() && isSearchPage(router.pathname)) {
  urlManager.synchronize(window.location.hash.slice(1));
}
```

We first verify that we are client side, and not server side, and that the window object exist.

After this, we only want to sync parameters when we are on the search page.
Obviously, if the initial synchronization is needed on more than one page, then the logic could be adapted.

When executing `urlManager.synchronize(window.location.hash.slice(1))`, the `urlManager` will simply try to parse the current `hash`, and apply any initial state it can detect there.

## Update the hash when search parameters changes

Since in this example app and we are only interested in synchronizing search parameters on the search page, all the logic reside in `./pages/search.tsx`.

This could also be adapted if more synchronization was needed on multiple page.

```typescript
export const SearchPage: React.FC = () => {
  // code omitted for brevity
  // [ ... ]

  const router = useRouter();

  const subscribeToStateChangesAndReturnCleanup = () => {
    const allunsubscribers: { (): void }[] = [];
    // code omitted for brevity
    // [ ... ]

    allunsubscribers.push(
      urlManager.subscribe(() => {
        router.push({
          hash: urlManager.state.fragment,
        });
      })
    );
    return function cleanup() {
      allunsubscribers.forEach((unsub) => unsub());
    };
  };

  useEffect(subscribeToStateChangesAndReturnCleanup, []);

  // code omitted for brevity
    // [ ... ]
}
```

This piece of code utilize `useEffect` with an empty dependency list `[]` so that it only execute once.
Then, we return a cleanup function to unsubscribe all listeners on `unmount`, so as to not leak. This is simply React specific logic/boilerplate.

The piece of code that is Headless related as to do with synchronizing the next.js router whenever the search parameters changes. This means that any facet selections will be automatically reflected in the URL.

Any headless controller present in the page, that end users can interact with and that modify the query (for example, pagination, number of results per page, sorting, etc.) would also be reflected in such a manner.

For brevity reason, only the facets are showcased in this sample.

## Using the search box to navigate

In this demo, we have a standard app header (in `./components/header.tsx`) which include both a `SearchBoxHeader` and a `Navigation` component.

In the `SearchBoxHeader` (under `./components/searchboxheader.tsx`) code, we can see this:

```typescript
const submit = () => {
  searchBox.submit();
  if (router.pathname !== "/search") {
    urlManager.synchronize(`q=${searchBox.state.value}`);
    router.push({ hash: urlManager.state.fragment, pathname: "/search" });
  }
};
```

This `submit()` function has some minimal logic that needs to be handled when the end user is not currently on the search page.
When that happens, we need to `synchronize` the url manager with the `q` value, wiping out any other previous parameters.

This is done so that any state that were present on the search page is not kept.

For example, we would want any facet selection to be removed.

After this is done, we can simply navigate using the standard `push` function available on the next.js router.

In the case that we are already on the search page, no additional logic is needed.

## Using navigation link

In the `Navigation` component (under `./components/navigation.tsx`), we can see this:

```tsx
const makeLink = (href: string, title: string) => {
  return (
    <a
      href={href}
      onClick={(e) => {
        e.preventDefault();
        searchBox.updateText("");
        router.push({
          pathname: href,
        });
      }}
    >
      {title}
    </a>
  );
};
```

This link is a simple navigation link, using standard next.router mechanism. The only difference is that we want to clear the search box content, since it appears on all pages of the website.

That is, if the end user is on the search page, uses the search box and enter "macbook", and then use a link to go to the home page, the search box content should not contain "macbook" anymore.

## Product listing page

Product listing page only contains the necessary logic to use the next router to get the current product category. This demo repository is linked to a random internal demo on the development Coveo platform. It does not need to contain any logic related to search parameter.

## urlManager is entirely optional

With all of this being said, it is important to remember that the URL manager is entirely optional. It's only purpose is to help simplify what could otherwise be a lot of boilerplate code.

Nothing stops an implementer to come up with their own URL management, mechanism or system that they think would best represent the state of the search page.

For example, it would be possible to use query string parameters or path parameters, and never use or import `urlManager` at all.

The above logic would remain the same, with the caveat that the URL parsing as well as applying the initial state correctly would have to be done entirely by the implementer. This is essentially what `urlManager.synchronize()` perform internally.

To give a concrete example, let's say the agreed upon URL scheme is `/search?the_query_is=foo&the_facet_for_brand_selected_values=a,b,c&the_current_page=3`

Where:

- `the_query_is` represent the search box, or query text, that should be applied on load.
- `the_facet_for_brand_selected_values` represent the array of selected values to the facet with field `ec_brand`
- `the_current_page` represent the current pagination.

The above logic would have to be changed so that instead of using the `urlManager` in `_app.tsx` to perform the initial synchronization, you would have to create a module to parse the URL.

After parsing, for each parameter that needs to be applied, use the corresponding `@coveo/headless` action to dispatch and apply that initial state before the query is executed.

Again, using the above example, these function would need to be executed:

- `engine.dispatch(updateQueryText('foo'))`
- `engine.dispatch(toggleSelectFacetValue(a))`, `engine.dispatch(toggleSelectFacetValue(b))`, `engine.dispatch(toggleSelectFacetValue(c))`
- `engine.dispatch(updatePage(3))`

This logic would need to be manually coded and repeated for each search page parameter that the implementer wants to support.

We would also need to subscribe to any state change of each invididual controller present in the search page for which we want to persist their state in the URL, and use `router.push({query})` to ensure they are persisted.

This is essentially what the `urlManager.subscribe()` function in `SearchPage.tsx` perform internally.

## Important

One important thing to make sure the navigation stays consistent is to ensure that URL entry should be treated as an operation that happens only once in the lifecycle of a page or a query.

If for a given query, multiple subsequent entry are pushed to the next.js router, then we end up in a scenario where the end user has to perform multiple back button press.
