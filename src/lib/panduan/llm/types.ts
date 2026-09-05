import type { RetrievedChunk } from "../retrieve";

export type GroundedCompleteInput = {
  system: string;
  chunks: RetrievedChunk[];
  query: string;
};

export type GroundedCompleteResult = {
  body: string;
};

export type GroundedInvoker = (input: GroundedCompleteInput) => Promise<GroundedCompleteResult | null>;
