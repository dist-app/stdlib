* Partial vendor of https://github.com/ije/html
* Not published on JSR because https://github.com/ije/html/issues/13
* Using JSX implementation from jsr:@hono/hono instead, they figured out JSR already

## TSX Pragmas

On every `.tsx` file, set up hono JSX:

```ts
/** @jsx jsx *//** @jsxImportSource jsr:@hono/hono@4.7.7/jsx *//** @jsxFrag Fragment */
```

or not all together:

```ts
/** @jsx jsx */
/** @jsxImportSource jsr:@hono/hono@4.7.7/jsx */
/** @jsxFrag Fragment */
```

## Imports

```ts
// when generating an html doc:
import { html } from "../../html/html.tsx";

// when using JSX types in your code explicitly e.g. JSX.Element:
import type { JSX } from "jsr:@hono/hono@4.7.7/jsx/jsx-runtime";
```
