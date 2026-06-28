import { Landmark, Mail, Vote } from "lucide-react";
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
      </section>

      <StateVoteSummary />
    </main>
  );
}
