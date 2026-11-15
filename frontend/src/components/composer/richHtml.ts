import DOMPurify from "dompurify";
import { SPEAKER_RE } from "./inlineHtml";

/**
 * Prepare stored story HTML for the published view (browser only):
 * sanitize, turn "Rinku:" at the start of conversation lines into a label,
 * and open links in a new tab.
 */
export function prepareStoryHtml(html: string): string {
  const clean = DOMPurify.sanitize(html, { ADD_ATTR: ["controls", "playsinline"] });
  const root = document.createElement("div");
  root.innerHTML = clean;

  root.querySelectorAll("p.is-convo").forEach((p) => {
    const first = p.firstChild;
    if (!first || first.nodeType !== Node.TEXT_NODE) return;
    const t = first as Text;
    const m = t.data.match(SPEAKER_RE);
    if (!m) return;
    const rest = t.splitText(m[1].length);
    const label = document.createElement("span");
    label.className = "spk";
    label.textContent = m[1].trim();
    t.replaceWith(label);
    rest.data = rest.data.replace(/^\s+/, "");
  });

  root.querySelectorAll("a[href]").forEach((a) => {
    a.setAttribute("target", "_blank");
    a.setAttribute("rel", "noopener noreferrer");
  });
  return root.innerHTML;
}
