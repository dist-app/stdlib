/**
 * Copyright 2019 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Symbol indicating the end of a stream. Used with `external`.
 */
export const EOF: unique symbol = Symbol();
export type NextFunc<T> = (v: T | typeof EOF) => void;

/**
 * Utility function to create new observables from external sources.
 * Returns an object with two values: the new observable, and a `next` function
 * which will emit a value to `observable` when called.
 * Calling `next` with `EOF` will indicate there are no more values to emit.
 *
 * @typeparam T Type of items to be emitted by the observable.
 */
export function external<T>(cancel?: UnderlyingSourceCancelCallback) {
  let next: NextFunc<T>;
  const observable = new ReadableStream<T>(
    {
      cancel: cancel,
      async start(controller) {
        next = (v: T | typeof EOF) => {
          if (v === EOF) {
            return controller.close();
          }
          controller.enqueue(v);
        };
      }
    },
    { highWaterMark: 0 }
  );
  return { observable, next: next! };
}
export function concat<T>(...os: Array<ReadableStream<T>>): ReadableStream<T> {
  const { writable, readable } = new TransformStream<T, T>(
    undefined,
    { highWaterMark: 1 },
    { highWaterMark: 0 }
  );
  (async function() {
    for (const o of os) {
      await o.pipeTo(writable, { preventClose: true });
    }
    writable.getWriter().close();
  })();
  return readable;
}

export function fromNext<T>(f: (next: NextFunc<T>) => unknown): ReadableStream<T> {
  const { observable, next } = external<T>();
  f(next);
  return observable;
}

export function map<S, T>(f: (x: S) => T | Promise<T>): TransformStream<S, T> {
  return new TransformStream<S, T>(
    {
      async transform(chunk, controller) {
        controller.enqueue(await f(chunk));
      }
    },
    { highWaterMark: 1 },
    { highWaterMark: 0 }
  );
}
