import { ChevronDown } from "lucide-react";
import { StateVoteSummary } from "./_components/state-vote-summary";
import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.page}>
      <StateVoteSummary />

      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.siteTitle}>Track efforts to impeach Trump</p>
          <p>
            See House roll-call records, find your representative, and push for
            accountability.
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
      </section>
    </main>
  );
}
