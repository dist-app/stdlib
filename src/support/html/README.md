* Partial vendor of https://github.com/ije/html
* Not published on JSR because https://github.com/ije/html/issues/13
* Using JSX implementation from jsr:@hono/hono instead, they figured out JSR already

## TSX Pragmas

On every `.tsx` file, set up hono JSX:

```ts
/** @jsxRuntime automatic *//** @jsxImportSource @hono/hono/jsx */
```

or not all together:

```ts
/** @jsxRuntime automatic */
/** @jsxImportSource @hono/hono/jsx */
```

## Imports

```ts
// when generating an html doc:
import { html } from "../../html/html.tsx";

// when using JSX types in your code explicitly e.g. JSX.Element:
import type { JSX } from "@hono/hono/jsx/jsx-runtime";
```
