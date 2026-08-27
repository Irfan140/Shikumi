import type { ModelRequest, ModelResponse, ModelStreamEvent } from "./model-types.js";

export interface ModelProvider {
  readonly name: string;
  generate(request: ModelRequest): Promise<ModelResponse>;
  stream(request: ModelRequest): AsyncIterable<ModelStreamEvent>;
}
