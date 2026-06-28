"use client";

import { Check, Share2 } from "lucide-react";
import { useState } from "react";
import styles from "../page.module.css";

const SHARE_TEXT =
  "Track House roll-call votes tied to efforts to impeach Trump.";

export function SharePageButton() {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const shareData = {
      title: "Track efforts to impeach Trump",
      text: SHARE_TEXT,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }

      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button className={styles.ctaButton} onClick={handleShare} type="button">
      {copied ? (
        <Check aria-hidden="true" className={styles.buttonIcon} />
      ) : (
        <Share2 aria-hidden="true" className={styles.buttonIcon} />
      )}
      {copied ? "Link copied" : "Share this page"}
    </button>
  );
}
