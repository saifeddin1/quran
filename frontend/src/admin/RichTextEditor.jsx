import { useMemo } from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Heading2,
  Heading3,
  Quote,
  Link2,
  Undo2,
  Redo2,
} from "lucide-react";
import { toRichHtml } from "../lib/richText.jsx";

function Tool({ label, active = false, disabled = false, onClick, children }) {
  return (
    <button
      type="button"
      className="rich-tool"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export default function RichTextEditor({
  label,
  value,
  onChange,
  locale,
  compact = false,
  t,
}) {
  const extensions = useMemo(
    () => [
      StarterKit.configure({
        heading: compact ? false : { levels: [2, 3] },
        bulletList: compact ? false : {},
        orderedList: compact ? false : {},
        listItem: compact ? false : {},
        blockquote: compact ? false : {},
        code: false,
        codeBlock: false,
        horizontalRule: false,
        strike: false,
        link: {
          openOnClick: false,
          autolink: false,
          HTMLAttributes: { target: null, rel: null },
        },
      }),
    ],
    [compact],
  );
  const editor = useEditor({
    extensions,
    content: toRichHtml(value),
    editorProps: {
      attributes: {
        "aria-label": label,
        "aria-multiline": "true",
        role: "textbox",
        dir: locale === "ar" ? "rtl" : "ltr",
        class: "admin-prose",
      },
    },
    onUpdate: ({ editor: current }) =>
      onChange(current.isEmpty ? "" : current.getHTML()),
  });
  useEditorState({
    editor,
    selector: ({ editor: current }) =>
      current
        ? {
            bold: current.isActive("bold"),
            italic: current.isActive("italic"),
            underline: current.isActive("underline"),
            bullet: current.isActive("bulletList"),
            ordered: current.isActive("orderedList"),
            h2: current.isActive("heading", { level: 2 }),
            h3: current.isActive("heading", { level: 3 }),
            quote: current.isActive("blockquote"),
            link: current.isActive("link"),
          }
        : null,
  });
  function editLink() {
    const current = editor.getAttributes("link").href || "";
    const href = window.prompt(t.linkPrompt, current);
    if (href === null) return;
    if (!href.trim()) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    if (!/^(https?:\/\/|mailto:)/i.test(href.trim())) {
      window.alert(t.linkInvalid);
      return;
    }
    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: href.trim() })
      .run();
  }
  return (
    <div className={`admin-rich-field ${compact ? "compact" : ""}`}>
      <span className="admin-rich-label">{label}</span>
      <div className="admin-rich-editor">
        <div
          className="admin-rich-toolbar"
          role="toolbar"
          aria-label={`${label} — ${t.formatting}`}
        >
          <Tool
            label={t.bold}
            active={editor?.isActive("bold")}
            onClick={() => editor.chain().focus().toggleBold().run()}
            disabled={!editor}
          >
            <Bold size={16} />
          </Tool>
          <Tool
            label={t.italic}
            active={editor?.isActive("italic")}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            disabled={!editor}
          >
            <Italic size={16} />
          </Tool>
          <Tool
            label={t.underline}
            active={editor?.isActive("underline")}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            disabled={!editor}
          >
            <Underline size={16} />
          </Tool>
          {!compact && (
            <>
              <span className="admin-rich-divider" />
              <Tool
                label={t.bullets}
                active={editor?.isActive("bulletList")}
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                disabled={!editor}
              >
                <List size={16} />
              </Tool>
              <Tool
                label={t.numbers}
                active={editor?.isActive("orderedList")}
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                disabled={!editor}
              >
                <ListOrdered size={16} />
              </Tool>
              <Tool
                label={t.heading2}
                active={editor?.isActive("heading", { level: 2 })}
                onClick={() =>
                  editor.chain().focus().toggleHeading({ level: 2 }).run()
                }
                disabled={!editor}
              >
                <Heading2 size={16} />
              </Tool>
              <Tool
                label={t.heading3}
                active={editor?.isActive("heading", { level: 3 })}
                onClick={() =>
                  editor.chain().focus().toggleHeading({ level: 3 }).run()
                }
                disabled={!editor}
              >
                <Heading3 size={16} />
              </Tool>
              <Tool
                label={t.quote}
                active={editor?.isActive("blockquote")}
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
                disabled={!editor}
              >
                <Quote size={16} />
              </Tool>
            </>
          )}
          <span className="admin-rich-divider" />
          <Tool
            label={t.link}
            active={editor?.isActive("link")}
            onClick={editLink}
            disabled={!editor}
          >
            <Link2 size={16} />
          </Tool>
          <span className="admin-rich-divider" />
          <Tool
            label={t.undo}
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor || !editor.can().undo()}
          >
            <Undo2 size={16} />
          </Tool>
          <Tool
            label={t.redo}
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor || !editor.can().redo()}
          >
            <Redo2 size={16} />
          </Tool>
        </div>
        <EditorContent editor={editor} className="admin-rich-content" />
      </div>
    </div>
  );
}
