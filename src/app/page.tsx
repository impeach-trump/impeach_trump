import Link from "next/link";
import { StateVoteSummary } from "./_components/state-vote-summary";
import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <h1>Trump impeachment-related votes</h1>
        <Link className={styles.primaryLink} href="/past-votes">
          Past votes
        </Link>
      </section>

      <StateVoteSummary />
    </main>
  );
}
