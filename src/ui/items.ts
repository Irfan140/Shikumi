export type Item =
  | { id: string; kind: "system"; text: string }
  | { id: string; kind: "user"; text: string }
  | { id: string; kind: "agent"; text: string; streaming: boolean }
  | {
      id: string;
      kind: "tool";
      name: string;
      status: "running" | "done" | "error";
      detail: string;
    };
