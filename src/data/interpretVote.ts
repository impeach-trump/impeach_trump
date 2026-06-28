import type { RawVoteValue, VoteMetadata } from "./types";

export type InterpretedVoteCategory =
  | "Voted to block/table impeachment"
  | "Voted to advance impeachment"
  | "Voted present / abstained"
  | "Did not vote";

export function interpretVote(
  rawVote: RawVoteValue,
  voteQuestion: VoteMetadata["voteQuestion"],
): InterpretedVoteCategory {
  if (rawVote === "Present") {
    return "Voted present / abstained";
  }

  if (rawVote === "Not Voting") {
    return "Did not vote";
  }

  if (voteQuestion.toLowerCase().includes("motion to table")) {
    return rawVote === "Yea"
      ? "Voted to block/table impeachment"
      : "Voted to advance impeachment";
  }

  return rawVote === "Yea"
    ? "Voted to advance impeachment"
    : "Voted to block/table impeachment";
}
