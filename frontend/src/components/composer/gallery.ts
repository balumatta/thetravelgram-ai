import { Node } from "@tiptap/core";

/**
 * Photo gallery block. Stored as:
 *   <div data-gallery><figure data-kind="image"><img src width height><figcaption>…</figcaption></figure>…</div>
 * Published: an adaptive grid (up to 3×2); more than 6 photos become a carousel of 3×2 pages (richHtml.ts).
 * Editor: a tile grid with "+" to add photos, and move/remove on each photo.
 */

export interface GalleryImage {
  src: string;
  width?: number;
  height?: number;
  caption?: string;
}

interface GalleryOptions {
  upload: (file: File) => Promise<string>;
  onError: (message: string) => void;
}

/** Real pixel size of a local image file, so the published grid can keep aspect ratios. */
export function imageSize(file: File): Promise<{ width?: number; height?: number }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      resolve({});
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

/** Upload image files in parallel; failed ones are reported and skipped. */
export async function uploadImages(files: File[], upload: GalleryOptions["upload"], onError: GalleryOptions["onError"]) {
  const results = await Promise.all(
    files
      .filter((f) => f.type.startsWith("image/"))
      .map(async (f) => {
        try {
          const [src, size] = await Promise.all([upload(f), imageSize(f)]);
          return { src, ...size } as GalleryImage;
        } catch {
          onError(`Couldn't upload ${f.name}. Check that the backend is running.`);
          return null;
        }
      }),
  );
  return results.filter((r): r is GalleryImage => !!r);
}

export function pickImages(onFiles: (files: File[]) => void) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.multiple = true;
  input.onchange = () => input.files?.length && onFiles(Array.from(input.files));
  input.click();
}

export const Gallery = Node.create<GalleryOptions>({
  name: "gallery",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addOptions() {
    return {
      upload: async () => {
        throw new Error("No uploader configured");
      },
      onError: () => {},
    };
  },

  addAttributes() {
    return {
      images: {
        default: [],
        parseHTML: (el: HTMLElement): GalleryImage[] =>
          Array.from(el.querySelectorAll("img"))
            .filter((img) => img.getAttribute("src"))
            .map((img) => ({
              src: img.getAttribute("src")!,
              width: Number(img.getAttribute("width")) || undefined,
              height: Number(img.getAttribute("height")) || undefined,
              caption: img.closest("figure")?.querySelector("figcaption")?.textContent?.trim() || undefined,
            })),
        renderHTML: () => ({}),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-gallery]", priority: 60 }];
  },

  renderHTML({ node }) {
    const images = (node.attrs.images ?? []) as GalleryImage[];
    return [
      "div",
      { "data-gallery": "" },
      ...images.map((im) => [
        "figure",
        { "data-kind": "image" },
        ["img", { src: im.src, ...(im.width && im.height ? { width: im.width, height: im.height } : {}), alt: im.caption ?? "" }],
        im.caption ? ["figcaption", {}, im.caption] : ["figcaption"],
      ]),
    ];
  },

  addNodeView() {
    return ({ node: initial, editor, getPos }) => {
      let node = initial;
      let pending = 0;
      const { upload, onError } = this.options;

      const dom = document.createElement("div");
      dom.className = "cmp-gal";
      dom.contentEditable = "false";

      const pos = () => (typeof getPos === "function" ? getPos() : undefined);
      const images = () => (node.attrs.images ?? []) as GalleryImage[];
      const save = (next: GalleryImage[]) => {
        const p = pos();
        if (p == null) return;
        editor.view.dispatch(editor.view.state.tr.setNodeMarkup(p, undefined, { ...node.attrs, images: next }));
      };
      const add = () =>
        pickImages(async (files) => {
          pending += files.length;
          render();
          const added = await uploadImages(files, upload, onError);
          pending -= files.length;
          // Read the latest images: other edits may have happened during the upload.
          save([...images(), ...added]);
          render();
        });

      const button = (label: string, title: string, onClick: () => void, cls = "") => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = cls;
        b.textContent = label;
        b.title = title;
        b.setAttribute("aria-label", title);
        b.onclick = (e) => {
          e.preventDefault();
          onClick();
        };
        return b;
      };

      const render = () => {
        const list = images();
        dom.replaceChildren();

        const head = document.createElement("div");
        head.className = "cmp-gal-head";
        const label = document.createElement("span");
        const pages = Math.ceil(list.length / 6);
        label.textContent = `Gallery · ${list.length} photo${list.length === 1 ? "" : "s"}${pages > 1 ? ` · carousel of ${pages} pages` : ""}`;
        head.append(
          label,
          button("+ Add photos", "Add photos", add, "is-add"),
          button("Remove gallery", "Remove gallery", () => {
            const p = pos();
            if (p != null) editor.chain().focus().command(({ tr }) => (tr.delete(p, p + node.nodeSize), true)).run();
          }, "is-danger"),
        );

        const grid = document.createElement("div");
        grid.className = "cmp-gal-grid";
        list.forEach((im, i) => {
          const tile = document.createElement("div");
          tile.className = "cmp-gal-tile";
          const img = document.createElement("img");
          img.src = im.src;
          img.alt = im.caption ?? "";
          const n = document.createElement("span");
          n.className = "cmp-gal-n";
          n.textContent = String(i + 1);
          const ops = document.createElement("div");
          ops.className = "cmp-gal-ops";
          const move = (d: number) => {
            const next = [...list];
            const j = i + d;
            if (j < 0 || j >= next.length) return;
            [next[i], next[j]] = [next[j], next[i]];
            save(next);
          };
          if (i > 0) ops.append(button("‹", "Move earlier", () => move(-1)));
          if (i < list.length - 1) ops.append(button("›", "Move later", () => move(1)));
          ops.append(button("✕", "Remove photo", () => save(list.filter((_, k) => k !== i)), "is-danger"));
          tile.append(img, n, ops);
          grid.append(tile);
        });
        for (let k = 0; k < pending; k++) {
          const t = document.createElement("div");
          t.className = "cmp-gal-tile is-pending";
          t.textContent = "Uploading…";
          grid.append(t);
        }
        grid.append(button("+", "Add photos", add, "cmp-gal-plus"));

        const hint = document.createElement("p");
        hint.className = "cmp-gal-hint";
        hint.textContent = "Up to 6 photos show as a grid; more turn into a swipeable carousel of 3 × 2 pages.";
        dom.append(head, grid, hint);
      };

      render();

      return {
        dom,
        update: (next) => {
          if (next.type !== node.type) return false;
          node = next;
          render();
          return true;
        },
        stopEvent: (e) => e.type !== "dragstart" && (e.target as HTMLElement).closest?.("button") != null,
        ignoreMutation: () => true,
      };
    };
  },
});
