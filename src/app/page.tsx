import Link from "next/link";
import { SharePageButton } from "./_components/share-page-button";
import { StateVoteSummary } from "./_components/state-vote-summary";
import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <h1>Track efforts to impeach Trump</h1>
          <p>
            Ever wonder why Trump has not been impeached yet? Here is why:
            follow the House votes that show who helped impeachment move
            forward, who blocked it, and where your representatives stood.
          </p>
        </div>

        <div className={styles.ctaGroup} aria-label="Take action">
          <SharePageButton />
          <a
            className={styles.ctaLink}
            href="https://vote.gov/"
            rel="noopener noreferrer"
            target="_blank"
          >
            Register to vote
          </a>
          <a
            className={styles.ctaLink}
            href="https://www.house.gov/representatives/find-your-representative"
            rel="noopener noreferrer"
            target="_blank"
          >
            Contact your representative
          </a>
          <a
            className={styles.ctaLink}
            href="https://www.senate.gov/senators/senators-contact.htm"
            rel="noopener noreferrer"
            target="_blank"
          >
            Contact your senators
          </a>
          <Link className={styles.secondaryLink} href="/past-votes">
            Past votes
          </Link>
        </div>
      </section>

      <StateVoteSummary />
    </main>
  );
}
