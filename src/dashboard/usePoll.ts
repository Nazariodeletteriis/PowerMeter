import { useEffect, useState } from "react";

export type Polled<T> = { data?: T; error?: string };

/** Calls `load` now and every `ms`. `load` must be stable (module-level). */
export function usePoll<T>(load: () => Promise<T>, ms: number): Polled<T> {
  const [state, setState] = useState<Polled<T>>({});
  useEffect(() => {
    let alive = true;
    const run = () =>
      load().then(
        (data) => alive && setState({ data }),
        (e) => alive && setState({ error: String(e) }),
      );
    run();
    const id = setInterval(run, ms);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [load, ms]);
  return state;
}
