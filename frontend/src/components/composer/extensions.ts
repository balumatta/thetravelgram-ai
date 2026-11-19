import { Node, type Editor } from "@tiptap/core";
import Paragraph from "@tiptap/extension-paragraph";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { SPEAKER_RE } from "./inlineHtml";

export type ParagraphVariant = "convo" | "fact" | null;

/**
 * A normal paragraph that can carry a *style*: conversation or fact.
 * It stays part of the main text — the style is just a class on the <p>.
 */
export const StyledParagraph = Paragraph.extend({
  addAttributes() {
    return {
      variant: {
        default: null,
        keepOnSplit: true,
        parseHTML: (el: HTMLElement) => (el.classList.contains("is-convo") ? "convo" : el.classList.contains("is-fact") ? "fact" : null),
        renderHTML: (attrs: { variant?: ParagraphVariant }) => (attrs.variant ? { class: `is-${attrs.variant}` } : {}),
      },
    };
  },

  addKeyboardShortcuts() {
    return {
      Enter: ({ editor }) => {
        const { $from, empty } = editor.state.selection;
        const node = $from.parent;
        if (!empty || node.type.name !== "paragraph") return false;
        const variant = node.attrs.variant as ParagraphVariant;
        // Enter on an empty conversation line leaves the conversation.
        if (variant === "convo" && !node.textContent.trim()) {
          return editor.commands.updateAttributes("paragraph", { variant: null });
        }
        // Enter at the end of a fact goes back to normal text.
        if (variant === "fact" && $from.parentOffset === node.content.size) {
          return editor.chain().splitBlock().updateAttributes("paragraph", { variant: null }).run();
        }
        return false;
      },
    };
  },

  addProseMirrorPlugins() {
    // Show the speaker name as a small label without changing the stored text.
    return [
      new Plugin({
        key: new PluginKey("speakerLabels"),
        props: {
          decorations(state) {
            const decos: Decoration[] = [];
            state.doc.descendants((node, pos) => {
              if (node.type.name !== "paragraph") return true;
              if (node.attrs.variant === "convo") {
                const first = node.firstChild;
                const m = first?.isText ? first.text?.match(SPEAKER_RE) : null;
                if (m) decos.push(Decoration.inline(pos + 1, pos + 1 + m[1].length, { class: "spk" }));
              }
              return false;
            });
            return DecorationSet.create(state.doc, decos);
          },
        },
      }),
    ];
  },
});

/** Photo or video with an editable caption. */
export const Figure = Node.create({
  name: "figure",
  group: "block",
  content: "inline*",
  marks: "",
  draggable: true,
  isolating: true,

  addAttributes() {
    return {
      src: { default: "" },
      kind: { default: "image" },
      // Placement carried over from Wix (and kept through edits): size, alignment, real dimensions.
      size: { default: null },
      align: { default: null },
      width: { default: null },
      height: { default: null },
    };
  },

  parseHTML() {
    return [
      {
        tag: "figure",
        getAttrs: (el: HTMLElement) => {
          const media = el.querySelector("img, video");
          const src = media?.getAttribute("src");
          if (!src) return false;
          return {
            src,
            kind: media?.tagName === "VIDEO" ? "video" : "image",
            size: el.getAttribute("data-size"),
            align: el.getAttribute("data-align"),
            width: media?.getAttribute("width"),
            height: media?.getAttribute("height"),
          };
        },
        contentElement: (el: HTMLElement) => el.querySelector("figcaption") ?? document.createElement("figcaption"),
      },
      {
        // Plain images from older markdown/HTML blogs.
        tag: "img[src]",
        getAttrs: (el: HTMLElement) => ({
          src: el.getAttribute("src"),
          kind: "image",
          width: el.getAttribute("width"),
          height: el.getAttribute("height"),
        }),
      },
    ];
  },

  renderHTML({ node }) {
    const { src, kind, size, align, width, height } = node.attrs;
    const dims = width && height ? { width, height } : {};
    const media =
      kind === "video"
        ? ["video", { src, controls: "true", playsinline: "true" }]
        : ["img", { src, alt: node.textContent || "", ...dims }];
    const place = { ...(size ? { "data-size": size } : {}), ...(align ? { "data-align": align } : {}) };
    return ["figure", { "data-kind": kind, ...place }, media, ["figcaption", 0]];
  },

  addKeyboardShortcuts() {
    // Backspace at the start of a caption must not merge the caption (and drop the photo).
    const guard = ({ editor }: { editor: Editor }) => {
      const { $from, empty } = editor.state.selection;
      return empty && $from.parent.type.name === "figure" && $from.parentOffset === 0;
    };
    return { Backspace: guard };
  },

  /** Photo/video with a hover toolbar: size (small / normal / full) and remove. */
  addNodeView() {
    return ({ node: initial, editor, getPos }) => {
      let node = initial;
      const dom = document.createElement("figure");
      const caption = document.createElement("figcaption");
      let media: HTMLElement = document.createElement("img");

      const bar = document.createElement("div");
      bar.className = "cmp-fig-bar";
      bar.contentEditable = "false";
      const sizes: Array<[string | null, string]> = [["small", "Small"], [null, "Normal"], ["full", "Full"]];
      const sizeBtns = sizes.map(([size, label]) => {
        const b = document.createElement("button");
        b.type = "button";
        b.textContent = label;
        b.title = `${label} size`;
        b.onclick = () => {
          const pos = typeof getPos === "function" ? getPos() : undefined;
          if (pos == null) return;
          editor.view.dispatch(editor.view.state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, size }));
        };
        return { b, size };
      });
      const sep = document.createElement("span");
      sep.className = "cmp-fig-sep";
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "is-danger";
      remove.textContent = "Remove";
      remove.title = "Remove this photo";
      remove.onclick = () => {
        const pos = typeof getPos === "function" ? getPos() : undefined;
        if (pos == null) return;
        editor.chain().focus().command(({ tr }) => {
          tr.delete(pos, pos + node.nodeSize);
          return true;
        }).run();
      };
      // Keep focus/selection in the editor when using the toolbar.
      bar.addEventListener("mousedown", (e) => e.preventDefault());
      bar.append(...sizeBtns.map((x) => x.b), sep, remove);

      const render = () => {
        const { src, kind, size, align, width, height } = node.attrs;
        const want = kind === "video" ? "VIDEO" : "IMG";
        if (media.tagName !== want) {
          const next = document.createElement(want.toLowerCase());
          media.replaceWith(next);
          media = next;
        }
        media.setAttribute("src", src);
        if (kind === "video") {
          media.setAttribute("controls", "true");
          media.setAttribute("playsinline", "true");
        }
        width && height ? (media.setAttribute("width", width), media.setAttribute("height", height)) : (media.removeAttribute("width"), media.removeAttribute("height"));
        dom.setAttribute("data-kind", kind);
        size ? dom.setAttribute("data-size", size) : dom.removeAttribute("data-size");
        align ? dom.setAttribute("data-align", align) : dom.removeAttribute("data-align");
        remove.textContent = kind === "video" ? "Remove video" : "Remove";
        sizeBtns.forEach(({ b, size: s }) => b.classList.toggle("is-on", (size ?? null) === s || (!size && s === null)));
      };

      dom.append(media, bar, caption);
      render();

      return {
        dom,
        contentDOM: caption,
        update: (next) => {
          if (next.type !== node.type) return false;
          node = next;
          render();
          return true;
        },
        stopEvent: (e) => bar.contains(e.target as globalThis.Node),
        ignoreMutation: (m) => !caption.contains(m.target),
      };
    };
  },
});
