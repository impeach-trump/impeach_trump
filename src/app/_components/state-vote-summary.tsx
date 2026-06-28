"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { interpretVote } from "@/data/interpretVote";
import { memberFullNamesById } from "@/data/memberNames";
import { getRegionName, usRegions } from "@/data/states";
import { memberVotesByVoteId, voteMetadata } from "@/data/votes";
import type { MemberVoteRecord } from "@/data/types";
import styles from "../page.module.css";

const DETECTED_STATE_COOKIE = "detected_state";
const SELECTED_STATE_STORAGE_KEY = "selected_state";
const voteRecordsById: Record<string, MemberVoteRecord[]> = memberVotesByVoteId;
const IMPEACHMENT_SUPPORT = "Voted to advance impeachment";

function CheckIcon() {
  return (
    <svg
      aria-hidden="true"
      className={styles.impeachIcon}
      focusable="false"
      viewBox="0 0 20 20"
    >
      <path d="m5 10 3 3 7-7" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg
      aria-hidden="true"
      className={styles.impeachIcon}
      focusable="false"
      viewBox="0 0 20 20"
    >
      <path d="m6 6 8 8M14 6l-8 8" />
    </svg>
  );
}

function getPosition(chamber: string) {
  return chamber.toLowerCase().includes("senate") ? "Senate" : "House";
}

function subscribeToBrowserState() {
  return () => {};
}

function getServerSnapshot() {
  return "";
}

function readCookie(name: string) {
  const cookie = document.cookie
    .split("; ")
    .find((part) => part.startsWith(`${name}=`));

  return cookie ? decodeURIComponent(cookie.split("=")[1]) : "";
}

function readStoredOrDetectedState() {
  return (
    window.localStorage.getItem(SELECTED_STATE_STORAGE_KEY) ||
    readCookie(DETECTED_STATE_COOKIE)
  );
}

export function StateVoteSummary() {
  const [chosenState, setChosenState] = useState<string | null>(null);
  const storedOrDetectedState = useSyncExternalStore(
    subscribeToBrowserState,
    readStoredOrDetectedState,
    getServerSnapshot,
  );
  const selectedState = chosenState ?? storedOrDetectedState;

  const selectedStateName = selectedState ? getRegionName(selectedState) : "";

  const votesForState = useMemo(() => {
    if (!selectedState) {
      return [];
    }

    return voteMetadata.map((vote) => ({
      vote,
      members: [...(voteRecordsById[vote.id] ?? [])]
        .filter((memberVote) => memberVote.state === selectedState)
        .sort((a, b) => a.sortName.localeCompare(b.sortName)),
    }));
  }, [selectedState]);

  function handleStateChange(value: string) {
    setChosenState(value);

    if (value) {
      window.localStorage.setItem(SELECTED_STATE_STORAGE_KEY, value);
    } else {
      window.localStorage.removeItem(SELECTED_STATE_STORAGE_KEY);
    }
  }

  return (
    <section className={styles.section} aria-labelledby="your-state">
      <div className={styles.sectionHeader}>
        <div>
          <h2 id="your-state">Your state</h2>
        </div>

        <label className={styles.stateSelect}>
          <span>State</span>
          <select
            value={selectedState}
            onChange={(event) => handleStateChange(event.target.value)}
          >
            <option value="">Choose a state</option>
            {usRegions.map((region) => (
              <option key={region.code} value={region.code}>
                {region.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {selectedState ? (
        <div className={styles.stateGrid}>
          <section className={styles.memberPanel} aria-labelledby="house-votes">
            <h3 id="house-votes">House members from {selectedStateName}</h3>

            <div className={styles.voteGroups}>
              {votesForState.map(({ vote, members }) => (
                <article className={styles.voteGroup} key={vote.id}>
                  <div className={styles.voteGroupHeader}>
                    <div>
                      <p className={styles.meta}>{vote.displayDate}</p>
                      <h4>
                        Roll Call {vote.rollCallNumber} · {vote.resolution}
                      </h4>
                      <p>
                        {vote.voteQuestion} · {vote.result}
                      </p>
                    </div>
                    <a
                      href={vote.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Official source
                    </a>
                  </div>

                  {members.length > 0 ? (
                    <div className={styles.tableWrap}>
                      <table className={styles.memberTable}>
                        <thead>
                          <tr>
                            <th scope="col">Member</th>
                            <th scope="col">Position</th>
                            <th scope="col">Party</th>
                            <th scope="col">Official vote</th>
                            <th scope="col">Helped impeachment move forward?</th>
                          </tr>
                        </thead>
                        <tbody>
                          {members.map((memberVote) => {
                            const votedToImpeach =
                              interpretVote(
                                memberVote.rawVote,
                                vote.voteQuestion,
                              ) === IMPEACHMENT_SUPPORT;
                            const memberName =
                              memberFullNamesById[memberVote.memberId] ??
                              memberVote.name;

                            return (
                              <tr
                                className={
                                  votedToImpeach
                                    ? styles.impeachYesRow
                                    : styles.impeachNoRow
                                }
                                key={`${vote.id}-${memberVote.memberId}`}
                              >
                                <td>{memberName}</td>
                                <td>{getPosition(vote.chamber)}</td>
                                <td>{memberVote.party}</td>
                                <td>{memberVote.rawVote}</td>
                                <td>
                                  <span className={styles.impeachStatus}>
                                    {votedToImpeach ? <CheckIcon /> : <XIcon />}
                                    {votedToImpeach ? "Yes" : "No"}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className={styles.emptyState}>
                      No House vote records for this state in this roll call.
                    </p>
                  )}
                </article>
              ))}
            </div>
          </section>
        </div>
      ) : (
        <p className={styles.emptyState}>
          Select a state to see member-level vote records from the tracked House
          roll calls.
        </p>
      )}
    </section>
  );
}
