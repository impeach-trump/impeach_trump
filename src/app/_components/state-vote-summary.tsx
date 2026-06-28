"use client";

import {
  type FormEvent,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import geoidToRepContact from "@/data/geoid_to_rep_contact.json";
import houseMemberOpenSecretsIds from "@/data/houseMemberOpenSecretsIds.json";
import { interpretVote } from "@/data/interpretVote";
import { memberFullNamesById } from "@/data/memberNames";
import { getRegionName, usRegions } from "@/data/states";
import { memberVotesByVoteId, voteMetadata } from "@/data/votes";
import type { MemberVoteRecord } from "@/data/types";
import styles from "../page.module.css";

const DETECTED_STATE_COOKIE = "detected_state";
const SELECTED_STATE_STORAGE_KEY = "selected_state";
const voteRecordsById: Record<string, MemberVoteRecord[]> = memberVotesByVoteId;
const openSecretsIdsByMemberId: Record<string, string> =
  houseMemberOpenSecretsIds;
const IMPEACHMENT_SUPPORT = "Voted to advance impeachment";
const OFFICIAL_REPRESENTATIVE_LOOKUP_URL =
  "https://www.house.gov/representatives/find-your-representative";
const REPRESENTATIVE_EMAIL_TEMPLATE = [
  `I\u2019m a constituent in your district, and I am absolutely disappointed\u2014and frankly angry\u2014about your vote on Roll Call 175 / H. Res. 537. By voting to table the resolution, you actively helped block the impeachment process from moving forward. It is a joke that Donald Trump has not been held fully accountable by this body. Hiding behind a procedural vote to shut this down instead of facing it head-on is cowardly.`,
  `The legal and constitutional grounds for his impeachment are overwhelming. We are talking about severe, documented violations of his oath of office, including:`,
  `Abuse of Power: Repeatedly weaponizing the presidency for personal and political gain, including pressuring government officials to interfere in our democratic processes.`,
  `Obstruction of Congress and Justice: Systematically directing officials to defy lawful congressional subpoenas, withholding evidence, and interfering with federal investigations.`,
  `Subversion of Democracy: Actively attempting to overturn lawful election results and inciting efforts to disrupt the peaceful transfer of power.`,
  `Constitutional Violations: Flagrantly ignoring the Emoluments Clause and profiting off the office of the presidency.`,
  `None of these are trivial political disagreements\u2014they are the textbook definition of "high crimes and misdemeanors." I want Donald Trump impeached. I expect Congress to take constitutional accountability seriously instead of shutting it down procedurally to protect him. Your job is to defend the Constitution, not play political defense. I pay attention to how you vote, and I will be remembering Roll Call 175 at the ballot box. I expect a real explanation for this vote, not a canned newsletter response.`,
].join("\n\n");

type PossibleRepresentative = {
  contactUrl: string;
  geoid: string;
  name: string;
  party: string;
  zipCode: string;
};

type RepresentativeContactRecord = {
  contactUrl: string | null;
  name: string;
  party: string;
};

type ZipLookupResponse =
  | {
      representative: PossibleRepresentative;
      status: "found";
    }
  | {
      message: string;
      status: "invalid" | "not_found";
    };

type RepresentativeVoteStatus = {
  displayDate: string;
  helpedImpeachmentMoveForward: boolean;
  rawVote: MemberVoteRecord["rawVote"];
  resolution: string;
};

const repContactsByGeoid: Record<string, RepresentativeContactRecord> =
  geoidToRepContact;

function normalizeRepresentativeName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\b(jr|sr|ii|iii|iv)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function getRepresentativeContactKey(name: string, party: string) {
  return `${normalizeRepresentativeName(name)}|${party}`;
}

const contactUrlByRepresentative = Object.values(repContactsByGeoid).reduce<
  Record<string, string>
>((contacts, representative) => {
  if (representative.contactUrl) {
    contacts[
      getRepresentativeContactKey(representative.name, representative.party)
    ] = representative.contactUrl;
  }

  return contacts;
}, {});
const latestTrackedVotes = [...voteMetadata].sort((a, b) =>
  b.date.localeCompare(a.date),
);

function getLatestRepresentativeVoteStatus(
  representative: PossibleRepresentative,
): RepresentativeVoteStatus | null {
  const representativeKey = getRepresentativeContactKey(
    representative.name,
    representative.party,
  );

  for (const vote of latestTrackedVotes) {
    const memberVote = (voteRecordsById[vote.id] ?? []).find(
      (voteRecord) =>
        getRepresentativeContactKey(
          memberFullNamesById[voteRecord.memberId] ?? voteRecord.name,
          voteRecord.party,
        ) === representativeKey,
    );

    if (memberVote) {
      return {
        displayDate: vote.displayDate,
        helpedImpeachmentMoveForward:
          interpretVote(memberVote.rawVote, vote.voteQuestion) ===
          IMPEACHMENT_SUPPORT,
        rawVote: memberVote.rawVote,
        resolution: vote.resolution,
      };
    }
  }

  return null;
}

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

function EmailIcon() {
  return (
    <svg
      aria-hidden="true"
      className={styles.emailIcon}
      focusable="false"
      viewBox="0 0 20 20"
    >
      <path d="M3.5 5.5h13v9h-13z" />
      <path d="m4 6 6 5 6-5" />
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

  return cookie ? decodeURIComponent(cookie.slice(name.length + 1)) : "";
}

function readStoredOrDetectedState() {
  return (
    window.localStorage.getItem(SELECTED_STATE_STORAGE_KEY) ||
    readCookie(DETECTED_STATE_COOKIE)
  );
}

function normalizeZipInput(value: string) {
  return value.replace(/\D/g, "").slice(0, 5);
}

export function StateVoteSummary() {
  const [chosenState, setChosenState] = useState<string | null>(null);
  const [zipInput, setZipInput] = useState("");
  const [manualRepresentative, setManualRepresentative] =
    useState<PossibleRepresentative | null>(null);
  const [zipLookupMessage, setZipLookupMessage] = useState("");
  const [zipLookupHasError, setZipLookupHasError] = useState(false);
  const [showOfficialZipLookupLink, setShowOfficialZipLookupLink] =
    useState(false);
  const [isLookingUpZip, setIsLookingUpZip] = useState(false);
  const [copyTemplateStatus, setCopyTemplateStatus] = useState("");
  const storedOrDetectedState = useSyncExternalStore(
    subscribeToBrowserState,
    readStoredOrDetectedState,
    getServerSnapshot,
  );
  const selectedState = chosenState ?? storedOrDetectedState;
  const displayedRepresentative = manualRepresentative;
  const representativeVoteStatus = displayedRepresentative
    ? getLatestRepresentativeVoteStatus(displayedRepresentative)
    : null;
  const representativeHelpedImpeachment =
    representativeVoteStatus?.helpedImpeachmentMoveForward === true;
  const representativeCardClassName = displayedRepresentative
    ? `${styles.representativeCard} ${
        representativeHelpedImpeachment
          ? styles.representativeCardPositive
          : styles.representativeCardNegative
      }`
    : styles.representativeCard;

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

  async function handleZipLookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const zipCode = normalizeZipInput(zipInput);
    setCopyTemplateStatus("");

    if (!/^\d{5}$/.test(zipCode)) {
      setManualRepresentative(null);
      setZipLookupHasError(true);
      setShowOfficialZipLookupLink(false);
      setZipLookupMessage("Enter a valid 5-digit ZIP code.");
      return;
    }

    setIsLookingUpZip(true);
    setZipLookupHasError(false);
    setShowOfficialZipLookupLink(false);
    setZipLookupMessage("");

    try {
      const response = await fetch(
        `/api/representative-by-zip?zip=${encodeURIComponent(zipCode)}`,
      );
      const result = (await response.json()) as ZipLookupResponse;

      if (result.status !== "found") {
        setManualRepresentative(null);
        setZipLookupHasError(true);
        setShowOfficialZipLookupLink(result.status === "not_found");
        setZipLookupMessage(result.message);
        return;
      }

      setManualRepresentative({
        ...result.representative,
      });
      setShowOfficialZipLookupLink(false);
      setZipLookupMessage(`Showing possible representative for ZIP ${zipCode}.`);
    } catch {
      setManualRepresentative(null);
      setZipLookupHasError(true);
      setShowOfficialZipLookupLink(false);
      setZipLookupMessage("Could not look up that ZIP right now.");
    } finally {
      setIsLookingUpZip(false);
    }
  }

  async function handleCopyTemplate() {
    if (!navigator.clipboard?.writeText) {
      setCopyTemplateStatus("Copy is not available in this browser.");
      return;
    }

    try {
      await navigator.clipboard.writeText(REPRESENTATIVE_EMAIL_TEMPLATE);
      setCopyTemplateStatus("Template copied.");
    } catch {
      setCopyTemplateStatus("Copy failed.");
    }
  }

  return (
    <section className={styles.section} aria-labelledby="representative-lookup">
      <div className={styles.zipLookupCard}>
        <div className={styles.zipLookup}>
          <div className={styles.zipLookupText}>
            <h2 id="representative-lookup">Find your House representative</h2>
            <p>
              Enter your ZIP code to look up a possible House representative.
            </p>
          </div>

          <form className={styles.zipLookupForm} onSubmit={handleZipLookup}>
            <label className={styles.zipInputGroup} htmlFor="zip-lookup">
              <span>ZIP code</span>
              <input
                autoComplete="postal-code"
                id="zip-lookup"
                inputMode="numeric"
                maxLength={10}
                name="zip"
                onChange={(event) => setZipInput(event.target.value)}
                pattern="[0-9]{5}"
                placeholder="98101"
                type="text"
                value={zipInput}
              />
            </label>

            <button
              className={styles.zipLookupButton}
              disabled={isLookingUpZip}
              type="submit"
            >
              {isLookingUpZip ? "Looking up..." : "Look up"}
            </button>

            {zipLookupMessage ? (
              <p
                aria-live="polite"
                className={
                  zipLookupHasError
                    ? `${styles.zipLookupMessage} ${styles.zipLookupError}`
                    : styles.zipLookupMessage
                }
              >
                {zipLookupMessage}
                {showOfficialZipLookupLink ? (
                  <>
                    {" "}
                    Try the{" "}
                    <a
                      href={OFFICIAL_REPRESENTATIVE_LOOKUP_URL}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      official House lookup
                    </a>
                    .
                  </>
                ) : null}
              </p>
            ) : null}
          </form>
        </div>

        {displayedRepresentative ? (
          <aside
            className={representativeCardClassName}
            aria-labelledby="possible-representative"
          >
          <div className={styles.representativeCardTop}>
            <div>
              <p className={styles.meta}>Based on your ZIP lookup</p>
              <h3 id="possible-representative">
                {displayedRepresentative.name} may be your House representative
              </h3>
              <p>
                This match may be inaccurate because ZIP codes can cross House
                districts. Confirm your representative on the{" "}
                <a
                  href={OFFICIAL_REPRESENTATIVE_LOOKUP_URL}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  official House lookup
                </a>{" "}
                before relying on this result.
              </p>

              <p className={styles.representativeVoteCallout}>
                {representativeHelpedImpeachment ? <CheckIcon /> : <XIcon />}
                <span>
                  {representativeVoteStatus
                    ? representativeVoteStatus.helpedImpeachmentMoveForward
                      ? `${displayedRepresentative.name} did vote to help impeachment move forward in the latest tracked vote (${representativeVoteStatus.resolution}, ${representativeVoteStatus.displayDate}).`
                      : `${displayedRepresentative.name} did not vote to help impeachment move forward in the latest tracked vote (${representativeVoteStatus.resolution}, ${representativeVoteStatus.displayDate}).`
                    : `No tracked House vote record was found for ${displayedRepresentative.name} in this dataset.`}
                </span>
              </p>
            </div>

            <div className={styles.representativeActions}>
              <a
                className={styles.representativeLink}
                href={displayedRepresentative.contactUrl}
                rel="noopener noreferrer"
                target="_blank"
              >
                <EmailIcon />
                Contact {displayedRepresentative.name}
              </a>

              <details className={styles.copyTemplate}>
                <summary>
                  <span>Quick copy email template</span>
                </summary>

                <div className={styles.copyTemplateBody}>
                  <textarea
                    aria-label="Template email to representative"
                    readOnly
                    value={REPRESENTATIVE_EMAIL_TEMPLATE}
                  />

                  <div className={styles.copyTemplateActions}>
                    <button
                      className={styles.copyTemplateButton}
                      onClick={handleCopyTemplate}
                      type="button"
                    >
                      Copy message
                    </button>

                    <p aria-live="polite" className={styles.copyTemplateStatus}>
                      {copyTemplateStatus}
                    </p>
                  </div>
                </div>
              </details>
            </div>
          </div>
        </aside>
        ) : null}
      </div>

      <div className={styles.stateGrid}>
        <section className={styles.memberPanel} aria-labelledby="your-state">
          <div className={styles.statePanelHeader}>
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

          <div className={styles.panelDivider} />

          {selectedState ? (
            <>
              <h3 id="house-votes">House members from {selectedStateName}</h3>
              <div className={styles.voteGroups}>
                {votesForState.map(({ vote, members }) => (
                  <article className={styles.voteGroup} key={vote.id}>
                    <div className={styles.voteGroupHeader}>
                      <div>
                        <p className={styles.meta}>{vote.displayDate}</p>
                        <h4>
                          <a
                            href={vote.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Roll Call {vote.rollCallNumber} ·{" "}
                            {vote.resolution}
                          </a>
                        </h4>
                        <p>
                          {vote.voteQuestion} - {vote.result}
                        </p>
                        <p>
                          {vote.shortExplanation}
                        </p>
                      </div>
                    </div>

                    {members.length > 0 ? (
                      <div className={styles.tableWrap}>
                        <table className={styles.memberTable}>
                          <thead>
                            <tr>
                              <th scope="col">Member</th>
                              <th scope="col">Contact</th>
                              <th scope="col">Position</th>
                              <th scope="col">Party</th>
                              <th scope="col">Official vote</th>
                              <th scope="col">
                                Helped impeachment move forward?
                              </th>
                              <th scope="col">Donors</th>
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
                              const contactUrl =
                                contactUrlByRepresentative[
                                  getRepresentativeContactKey(
                                    memberName,
                                    memberVote.party,
                                  )
                                ];
                              const contactHref =
                                contactUrl ??
                                OFFICIAL_REPRESENTATIVE_LOOKUP_URL;
                              const mpid =
                                openSecretsIdsByMemberId[memberVote.memberId];
                              const openSecretsUrl = mpid
                                ? `https://www.opensecrets.org/profiles/_/us_congress/organizations?mpid=${mpid}`
                                : "";

                              return (
                                <tr
                                  className={
                                    votedToImpeach
                                      ? styles.impeachYesRow
                                      : styles.impeachNoRow
                                  }
                                  key={`${vote.id}-${memberVote.memberId}`}
                                >
                                  <td data-label="Member">{memberName}</td>
                                  <td data-label="Contact">
                                    <a
                                      aria-label={
                                        contactUrl
                                          ? `Contact ${memberName}`
                                          : `Find official contact information for ${memberName}`
                                      }
                                      className={styles.contactLink}
                                      href={contactHref}
                                      rel="noopener noreferrer"
                                      target="_blank"
                                    >
                                      {contactUrl ? "Contact" : "Find contact"}
                                    </a>
                                  </td>
                                  <td data-label="Position">
                                    {getPosition(vote.chamber)}
                                  </td>
                                  <td data-label="Party">{memberVote.party}</td>
                                  <td data-label="Official vote">
                                    {memberVote.rawVote}
                                  </td>
                                  <td data-label="Helped impeachment move forward?">
                                    <span className={styles.impeachStatus}>
                                      {votedToImpeach ? (
                                        <CheckIcon />
                                      ) : (
                                        <XIcon />
                                      )}
                                      {votedToImpeach ? "Yes" : "No"}
                                    </span>
                                  </td>
                                  <td data-label="Donors">
                                    {openSecretsUrl ? (
                                      <a
                                        aria-label={`View funding sources for ${memberName} on OpenSecrets`}
                                        className={styles.donorLink}
                                        href={openSecretsUrl}
                                        rel="noopener noreferrer"
                                        target="_blank"
                                      >
                                        Funding sources
                                      </a>
                                    ) : (
                                      <span className={styles.unavailable}>
                                        Not listed
                                      </span>
                                    )}
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
            </>
          ) : (
            <p className={styles.emptyState}>
              Select a state to see member-level vote records from the tracked
              House roll calls.
            </p>
          )}
        </section>
      </div>
    </section>
  );
}
