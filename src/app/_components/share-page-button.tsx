"use client";

import { Check, Share2 } from "lucide-react";
import { useState } from "react";
import { trackGaEvent } from "../_lib/ga-events";
import styles from "../page.module.css";

const SHARE_TEXT =
  "Track House roll-call votes tied to efforts to impeach Trump.";

export function SharePageButton() {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const nativeShare = (
      navigator as unknown as { share?: (data: ShareData) => Promise<void> }
    ).share;
    const method = nativeShare ? "native_share" : "copy_link";
    const shareData = {
      title: "Track efforts to impeach Trump",
      text: SHARE_TEXT,
      url: window.location.href,
    };

    trackGaEvent("share_page_click", {
      method,
    });

    try {
      if (nativeShare) {
        await nativeShare.call(navigator, shareData);
        trackGaEvent("share_page_result", {
          method,
          result: "shared",
        });
        return;
      }

      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
      trackGaEvent("share_page_result", {
        method,
        result: "copied",
      });
    } catch {
      setCopied(false);
      trackGaEvent("share_page_result", {
        method,
        result: "failed",
      });
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
