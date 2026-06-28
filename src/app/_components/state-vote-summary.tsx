"use client";

import {
  Check,
  Copy,
  ExternalLink,
  Landmark,
  Mail,
  MapPin,
  Search,
  Vote,
  X,
} from "lucide-react";
import {
  type FormEvent,
  type SyntheticEvent,
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
import { SharePageButton } from "./share-page-button";
import styles from "../page.module.css";

const DETECTED_STATE_COOKIE = "detected_state";
const SELECTED_STATE_STORAGE_KEY = "selected_state";
const voteRecordsById: Record<string, MemberVoteRecord[]> = memberVotesByVoteId;
const openSecretsIdsByMemberId: Record<string, string> =
  houseMemberOpenSecretsIds;
const IMPEACHMENT_SUPPORT = "Voted to advance impeachment";
const STATE_BY_GEOID_PREFIX: Record<string, string> = {
  "01": "AL",
  "02": "AK",
  "04": "AZ",
  "05": "AR",
  "06": "CA",
  "08": "CO",
  "09": "CT",
  "10": "DE",
  "11": "DC",
  "12": "FL",
  "13": "GA",
  "15": "HI",
  "16": "ID",
  "17": "IL",
  "18": "IN",
  "19": "IA",
  "20": "KS",
  "21": "KY",
  "22": "LA",
  "23": "ME",
  "24": "MD",
  "25": "MA",
  "26": "MI",
  "27": "MN",
  "28": "MS",
  "29": "MO",
  "30": "MT",
  "31": "NE",
  "32": "NV",
  "33": "NH",
  "34": "NJ",
  "35": "NM",
  "36": "NY",
  "37": "NC",
  "38": "ND",
  "39": "OH",
  "40": "OK",
  "41": "OR",
  "42": "PA",
  "44": "RI",
  "45": "SC",
  "46": "SD",
  "47": "TN",
  "48": "TX",
  "49": "UT",
  "50": "VT",
  "51": "VA",
  "53": "WA",
  "54": "WV",
  "55": "WI",
  "56": "WY",
};
const OFFICIAL_REPRESENTATIVE_LOOKUP_URL =
  "https://www.house.gov/representatives/find-your-representative";
const ACCOUNTABILITY_REPRESENTATIVE_EMAIL_TEMPLATE = [
  `I\u2019m a constituent in your district, and I am absolutely disappointed\u2014and frankly angry\u2014about your vote on Roll Call 175 / H. Res. 537. By voting to table the resolution, you actively helped block the impeachment process from moving forward. It is a joke that Donald Trump has not been held fully accountable by this body. Hiding behind a procedural vote to shut this down instead of facing it head-on is cowardly.`,
  `The legal and constitutional grounds for his impeachment are overwhelming. We are talking about severe, documented violations of his oath of office, including:`,
  `Abuse of Power: Repeatedly weaponizing the presidency for personal and political gain, including pressuring government officials to interfere in our democratic processes.`,
  `Obstruction of Congress and Justice: Systematically directing officials to defy lawful congressional subpoenas, withholding evidence, and interfering with federal investigations.`,
  `Subversion of Democracy: Actively attempting to overturn lawful election results and inciting efforts to disrupt the peaceful transfer of power.`,
  `Constitutional Violations: Flagrantly ignoring the Emoluments Clause and profiting off the office of the presidency.`,
  `None of these are trivial political disagreements\u2014they are the textbook definition of "high crimes and misdemeanors." I want Donald Trump impeached. I expect Congress to take constitutional accountability seriously instead of shutting it down procedurally to protect him. Your job is to defend the Constitution, not play political defense. I pay attention to how you vote, and I will be remembering Roll Call 175 at the ballot box. I expect a real explanation for this vote, not a canned newsletter response.`,
].join("\n\n");
const SUPPORTIVE_REPRESENTATIVE_EMAIL_TEMPLATE = [
  `I\u2019m a constituent in your district, and I\u2019m writing to thank you for doing the right thing on Roll Call 175 / H. Res. 537. I appreciate that you voted to let the impeachment process move forward rather than hiding behind a procedural vote to shut it down.`,
  `However, we can't stop just because that attempt was blocked. It\u2019s an absolute joke that Donald Trump still hasn't been impeached despite his clear abuses of power and constitutional violations.`,
  `I am urging you to take the lead and introduce a new resolution for Articles of Impeachment. Don\u2019t wait for someone else to do it. We need representatives who will force this issue back onto the floor and keep fighting until there is real accountability.`,
  `I pay close attention to what you do in Congress, and stepping up to lead on this will absolutely earn my continued support at the ballot box.`,
  `I\u2019d like to know if you plan to introduce or co-sponsor a new impeachment resolution.`,
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
type ActionStepKey = "findRepresentative" | "reviewVotes" | "keepPressure";

const INITIAL_ACTION_STEPS: Record<ActionStepKey, boolean> = {
  findRepresentative: true,
  keepPressure: false,
  reviewVotes: false,
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

function getRepresentativeState(representative: PossibleRepresentative) {
  const representativeKey = getRepresentativeContactKey(
    representative.name,
    representative.party,
  );

  for (const voteRecords of Object.values(voteRecordsById)) {
    const memberVote = voteRecords.find(
      (voteRecord) =>
        getRepresentativeContactKey(
          memberFullNamesById[voteRecord.memberId] ?? voteRecord.name,
          voteRecord.party,
        ) === representativeKey,
    );

    if (memberVote) {
      return memberVote.state;
    }
  }

  return (
    STATE_BY_GEOID_PREFIX[representative.geoid.padStart(4, "0").slice(0, 2)] ??
    ""
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
  const [openActionSteps, setOpenActionSteps] =
    useState<Record<ActionStepKey, boolean>>(INITIAL_ACTION_STEPS);
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
  const representativeEmailTemplate = representativeHelpedImpeachment
    ? SUPPORTIVE_REPRESENTATIVE_EMAIL_TEMPLATE
    : ACCOUNTABILITY_REPRESENTATIVE_EMAIL_TEMPLATE;

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
    selectState(value);
  }

  function selectState(value: string) {
    setChosenState(value);

    if (value) {
      window.localStorage.setItem(SELECTED_STATE_STORAGE_KEY, value);
    } else {
      window.localStorage.removeItem(SELECTED_STATE_STORAGE_KEY);
    }
  }

  function handleActionStepToggle(
    step: ActionStepKey,
    event: SyntheticEvent<HTMLDetailsElement>,
  ) {
    const isOpen = event.currentTarget.open;

    setOpenActionSteps((currentSteps) =>
      currentSteps[step] === isOpen
        ? currentSteps
        : { ...currentSteps, [step]: isOpen },
    );
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
      const representativeState = getRepresentativeState(result.representative);

      if (representativeState) {
        selectState(representativeState);
      }

      setOpenActionSteps((currentSteps) => ({
        ...currentSteps,
        findRepresentative: true,
        reviewVotes: true,
      }));
      setShowOfficialZipLookupLink(false);
      setZipLookupMessage("");
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
      await navigator.clipboard.writeText(representativeEmailTemplate);
      setCopyTemplateStatus("Template copied.");
    } catch {
      setCopyTemplateStatus("Copy failed.");
    }
  }

  return (
    <section
      className={styles.guidedSection}
      aria-labelledby="guided-process-title"
    >
      <div className={styles.guidedHeader}>
        <h1 className={styles.guidedTitle} id="guided-process-title">
          {"Take action, push for Trump's impeachment!"}
        </h1>
        <p>
          Follow the steps to find your House representative, send a message,
          and check the tracked House votes.
        </p>
      </div>

      <div className={styles.actionSteps}>
        <details
          className={styles.actionStep}
          onToggle={(event) =>
            handleActionStepToggle("findRepresentative", event)
          }
          open={openActionSteps.findRepresentative}
        >
          <summary className={styles.actionStepSummary}>
            <span className={styles.actionStepNumber}>Step 1</span>
            <span className={styles.actionStepSummaryText}>
              <span className={styles.actionStepTitle}>
                Find your representative, contact them
              </span>
              <span className={styles.actionStepDescription}>
                Enter your ZIP to find a possible House representative and get
                a copy-ready message.
              </span>
            </span>
          </summary>

          <div className={styles.actionStepBody}>
            <div className={styles.zipLookupCard}>
        <div className={styles.zipLookup}>
          <div className={styles.zipLookupText}>
            <h2 id="representative-lookup">
              <MapPin aria-hidden="true" className={styles.headingIcon} />
              Find your House representative
            </h2>
            <a
              className={styles.officialLookupLink}
              href={OFFICIAL_REPRESENTATIVE_LOOKUP_URL}
              rel="noopener noreferrer"
              target="_blank"
            >
              Official search tool
              <ExternalLink aria-hidden="true" className={styles.inlineIcon} />
            </a>
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
              <Search aria-hidden="true" className={styles.buttonIcon} />
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
                      <ExternalLink
                        aria-hidden="true"
                        className={styles.inlineIcon}
                      />
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
                <h3 id="possible-representative">
                  {displayedRepresentative.name} may be your House
                  representative
                </h3>

                <p className={styles.representativeVoteCallout}>
                  {representativeHelpedImpeachment ? (
                    <Check aria-hidden="true" className={styles.impeachIcon} />
                  ) : (
                    <X aria-hidden="true" className={styles.impeachIcon} />
                  )}
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
                  <Mail aria-hidden="true" className={styles.buttonIcon} />
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
                      value={representativeEmailTemplate}
                    />

                    <div className={styles.copyTemplateActions}>
                      <button
                        className={styles.copyTemplateButton}
                        onClick={handleCopyTemplate}
                        type="button"
                      >
                        <Copy
                          aria-hidden="true"
                          className={styles.buttonIcon}
                        />
                        Copy message
                      </button>

                      <p
                        aria-live="polite"
                        className={styles.copyTemplateStatus}
                      >
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
          </div>
        </details>

        <details
          className={styles.actionStep}
          onToggle={(event) => handleActionStepToggle("keepPressure", event)}
          open={openActionSteps.keepPressure}
        >
          <summary className={styles.actionStepSummary}>
            <span className={styles.actionStepNumber}>Step 2</span>
            <span className={styles.actionStepSummaryText}>
              <span className={styles.actionStepTitle}>
                Share, register, and keep the pressure on
              </span>
              <span className={styles.actionStepDescription}>
                Send this page around, check your voter registration, and
                contact senators too.
              </span>
            </span>
          </summary>

          <div className={styles.actionStepBody}>
            <div className={styles.stepCtaGroup} aria-label="More actions">
              <SharePageButton />
              <a
                className={styles.ctaLink}
                href="https://vote.gov/"
                rel="noopener noreferrer"
                target="_blank"
              >
                <Vote aria-hidden="true" className={styles.buttonIcon} />
                Register to vote
              </a>
              <a
                className={styles.ctaLink}
                href={OFFICIAL_REPRESENTATIVE_LOOKUP_URL}
                rel="noopener noreferrer"
                target="_blank"
              >
                <Mail aria-hidden="true" className={styles.buttonIcon} />
                Official House lookup
              </a>
              <a
                className={styles.ctaLink}
                href="https://www.senate.gov/senators/senators-contact.htm"
                rel="noopener noreferrer"
                target="_blank"
              >
                <Landmark aria-hidden="true" className={styles.buttonIcon} />
                Contact your senators
              </a>
            </div>
          </div>
        </details>

        <details
          className={styles.actionStep}
          onToggle={(event) => handleActionStepToggle("reviewVotes", event)}
          open={openActionSteps.reviewVotes}
        >
          <summary className={styles.actionStepSummary}>
            <span className={styles.actionStepNumber}>Step 3</span>
            <span className={styles.actionStepSummaryText}>
              <span className={styles.actionStepTitle}>
                Check the House vote record
              </span>
              <span className={styles.actionStepDescription}>
                Pick a state to review the two tracked roll-call records.
              </span>
            </span>
          </summary>

          <div className={styles.actionStepBody}>
            <div className={styles.stateGrid}>
        <section
          className={styles.memberPanel}
          aria-label="State House vote records"
        >
          <div className={styles.statePanelHeader}>
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
                  <details className={styles.voteAccordion} key={vote.id}>
                    <summary className={styles.voteAccordionSummary}>
                      <span className={styles.voteAccordionSummaryText}>
                        <span className={styles.meta}>
                          {vote.displayDate}
                        </span>
                        <span className={styles.voteAccordionTitle}>
                          Roll Call {vote.rollCallNumber} · {vote.resolution}
                        </span>
                        <span className={styles.voteAccordionResult}>
                          {vote.voteQuestion} - {vote.result}
                        </span>
                      </span>
                    </summary>

                    <div className={styles.voteAccordionBody}>
                      <p className={styles.voteExplanation}>
                        {vote.shortExplanation}
                      </p>

                      <a
                        className={styles.voteAccordionSource}
                        href={vote.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Official source
                        <ExternalLink
                          aria-hidden="true"
                          className={styles.inlineIcon}
                        />
                      </a>

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
                                  openSecretsIdsByMemberId[
                                    memberVote.memberId
                                  ];
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
                                        <Mail
                                          aria-hidden="true"
                                          className={styles.linkIcon}
                                        />
                                        {contactUrl
                                          ? "Contact"
                                          : "Find contact"}
                                      </a>
                                    </td>
                                    <td data-label="Position">
                                      {getPosition(vote.chamber)}
                                    </td>
                                    <td data-label="Party">
                                      {memberVote.party}
                                    </td>
                                    <td data-label="Official vote">
                                      {memberVote.rawVote}
                                    </td>
                                    <td data-label="Helped impeachment move forward?">
                                      <span className={styles.impeachStatus}>
                                        {votedToImpeach ? (
                                          <Check
                                            aria-hidden="true"
                                            className={styles.impeachIcon}
                                          />
                                        ) : (
                                          <X
                                            aria-hidden="true"
                                            className={styles.impeachIcon}
                                          />
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
                                          <ExternalLink
                                            aria-hidden="true"
                                            className={styles.linkIcon}
                                          />
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
                          No House vote records for this state in this roll
                          call.
                        </p>
                      )}
                    </div>
                  </details>
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
          </div>
        </details>
      </div>
    </section>
  );
}
