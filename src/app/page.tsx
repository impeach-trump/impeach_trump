import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <p className={styles.kicker}>U.S. House roll-call votes</p>
        <h1>Trump impeachment-related votes</h1>
      </section>

      <section className={styles.section} aria-labelledby="tracked-votes">
        <h2 id="tracked-votes">Tracked votes</h2>

        <div className={styles.voteList}>
          <article className={styles.voteCard}>
            <div>
              <p className={styles.meta}>June 24, 2025</p>
              <h3>Roll Call 175 · H. Res. 537</h3>
              <p>On Motion to Table · Passed</p>
            </div>
            <a
              href="https://clerk.house.gov/Votes/2025175"
              target="_blank"
              rel="noopener noreferrer"
            >
              Official House Clerk source
            </a>
          </article>

          <article className={styles.voteCard}>
            <div>
              <p className={styles.meta}>December 11, 2025</p>
              <h3>Roll Call 322 · H. Res. 939</h3>
              <p>On Motion to Table · Passed</p>
            </div>
            <a
              href="https://clerk.house.gov/Votes/2025322"
              target="_blank"
              rel="noopener noreferrer"
            >
              Official House Clerk source
            </a>
          </article>
        </div>
      </section>
    </main>
  );
}
