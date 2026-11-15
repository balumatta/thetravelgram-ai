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
    };
  },

  parseHTML() {
    return [
      {
        tag: "figure",
        getAttrs: (el: HTMLElement) => {
          const media = el.querySelector("img, video");
          const src = media?.getAttribute("src");
          return src ? { src, kind: media?.tagName === "VIDEO" ? "video" : "image" } : false;
        },
        contentElement: (el: HTMLElement) => el.querySelector("figcaption") ?? document.createElement("figcaption"),
      },
      {
        // Plain images from older markdown/HTML blogs.
        tag: "img[src]",
        getAttrs: (el: HTMLElement) => ({ src: el.getAttribute("src"), kind: "image" }),
      },
    ];
  },

  renderHTML({ node }) {
    const media =
      node.attrs.kind === "video"
        ? ["video", { src: node.attrs.src, controls: "true", playsinline: "true" }]
        : ["img", { src: node.attrs.src, alt: node.textContent || "" }];
    return ["figure", { "data-kind": node.attrs.kind }, media, ["figcaption", 0]];
  },

  addKeyboardShortcuts() {
    // Backspace at the start of a caption must not merge the caption (and drop the photo).
    const guard = ({ editor }: { editor: Editor }) => {
      const { $from, empty } = editor.state.selection;
      return empty && $from.parent.type.name === "figure" && $from.parentOffset === 0;
    };
    return { Backspace: guard };
  },
});
