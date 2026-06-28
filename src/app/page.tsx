import { ChevronDown, Landmark, Mail, Vote } from "lucide-react";
import { SharePageButton } from "./_components/share-page-button";
import { StateVoteSummary } from "./_components/state-vote-summary";
import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.siteTitle}>Track efforts to impeach Trump</p>
          <p>
            Find your House representative, see their impeachment votes, and
            send a them a message in less than 3 minutes.
          </p>
        </div>

        <details className={styles.processAccordion}>
          <summary>
            <span>How impeachment works</span>
            <ChevronDown aria-hidden="true" className={styles.summaryIcon} />
          </summary>
          <ol>
            <li>House members introduce and vote on impeachment articles.</li>
            <li>A House majority can impeach and send the case to the Senate.</li>
            <li>The Senate holds a trial and votes on whether to convict.</li>
          </ol>
        </details>

        <div className={styles.ctaGroup} aria-label="Take action">
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
            href="https://www.house.gov/representatives/find-your-representative"
            rel="noopener noreferrer"
            target="_blank"
          >
            <Mail aria-hidden="true" className={styles.buttonIcon} />
            Contact your representative
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

        <details className={styles.mobileActionMenu}>
          <summary>
            <span>Take action</span>
            <ChevronDown aria-hidden="true" className={styles.summaryIcon} />
          </summary>
          <div className={styles.mobileActionBody}>
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
              href="https://www.house.gov/representatives/find-your-representative"
              rel="noopener noreferrer"
              target="_blank"
            >
              <Mail aria-hidden="true" className={styles.buttonIcon} />
              Contact your representative
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
        </details>
      </section>

      <StateVoteSummary />
    </main>
  );
}
