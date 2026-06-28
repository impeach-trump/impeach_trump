export type RawVoteValue = "Yea" | "Nay" | "Present" | "Not Voting";

export type PartyCode = "D" | "R" | "I";

export type VoteMetadata = {
  id: string;
  congress: number;
  session: string;
  chamber: string;
  rollCallNumber: number;
  officialRollCallId: string;
  date: string;
  displayDate: string;
  resolution: string;
  voteQuestion: string;
  result: string;
  description: string;
  shortExplanation: string;
  sourceUrl: string;
};

export type MemberVoteRecord = {
  memberId: string;
  name: string;
  sortName: string;
  unaccentedName: string;
  party: PartyCode;
  state: string;
  rawVote: RawVoteValue;
};
