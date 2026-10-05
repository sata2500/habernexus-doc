"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Placeholder } from "@tiptap/extensions";
import {
  Bold, Italic, Underline, Strikethrough, Heading2, Heading3, List, ListOrdered, Quote, Undo, Redo, Minus, Link2, Link2Off,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TiptapEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

function ToolbarButton({ onClick, isActive, disabled, children, title }: {
  onClick: () => void; isActive?: boolean; disabled?: boolean; children: React.ReactNode; title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      aria-pressed={isActive}
      className={cn(
        "h-9 w-9 shrink-0 flex items-center justify-center rounded-lg transition-colors cursor-pointer",
        isActive ? "bg-primary-500 text-white" : "text-muted-foreground hover:bg-muted hover:text-foreground",
        disabled && "opacity-30 cursor-not-allowed"
      )}
    >
      {children}
    </button>
  );
}

const Divider = () => <span className="w-px h-6 bg-border mx-1 shrink-0" aria-hidden />;

export function TiptapEditor({ content, onChange, placeholder = "Haberi yazmaya başlayın…" }: TiptapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        code: false,
        codeBlock: false,
        link: { openOnClick: false, autolink: true, HTMLAttributes: { rel: "noopener noreferrer" } },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content,
    immediatelyRender: false, // SSR hydration uyumsuzluğunu önler
    editorProps: {
      attributes: {
        class: "prose prose-sm sm:prose-base dark:prose-invert prose-blue max-w-none px-4 py-5 sm:p-6 min-h-[320px] sm:min-h-[420px] focus:outline-none",
      },
    },
    onUpdate({ editor }) {
      onChange(editor.isEmpty ? "" : editor.getHTML());
    },
  });

  if (!editor) return <div className="h-96 rounded-2xl border border-border bg-muted/40 animate-pulse" />;

  const setLink = () => {
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Bağlantı adresi (https://…)", previous ?? "https://");
    if (url === null) return;
    if (!url.trim() || url.trim() === "https://") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    const href = /^(https?:\/\/|\/)/i.test(url.trim()) ? url.trim() : `https://${url.trim()}`;
    editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
  };

  return (
    <div className="border border-border rounded-2xl bg-background">
      {/* Araç çubuğu: kaydırırken üstte kalır, dar ekranda yatay kayar */}
      <div className="sticky top-16 z-10 flex items-center gap-0.5 overflow-x-auto no-scrollbar rounded-t-2xl border-b border-border bg-card/95 backdrop-blur px-2 py-1.5">
        <ToolbarButton title="Kalın" onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive("bold")}><Bold className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton title="İtalik" onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive("italic")}><Italic className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton title="Altı çizili" onClick={() => editor.chain().focus().toggleUnderline().run()} isActive={editor.isActive("underline")}><Underline className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton title="Üstü çizili" onClick={() => editor.chain().focus().toggleStrike().run()} isActive={editor.isActive("strike")}><Strikethrough className="h-4 w-4" /></ToolbarButton>
        <Divider />
        <ToolbarButton title="Ara başlık" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} isActive={editor.isActive("heading", { level: 2 })}><Heading2 className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton title="Alt başlık" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} isActive={editor.isActive("heading", { level: 3 })}><Heading3 className="h-4 w-4" /></ToolbarButton>
        <Divider />
        <ToolbarButton title="Madde işaretli liste" onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive("bulletList")}><List className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton title="Numaralı liste" onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={editor.isActive("orderedList")}><ListOrdered className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton title="Alıntı" onClick={() => editor.chain().focus().toggleBlockquote().run()} isActive={editor.isActive("blockquote")}><Quote className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton title="Ayraç çizgisi" onClick={() => editor.chain().focus().setHorizontalRule().run()}><Minus className="h-4 w-4" /></ToolbarButton>
        <Divider />
        <ToolbarButton title="Bağlantı ekle" onClick={setLink} isActive={editor.isActive("link")}><Link2 className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton title="Bağlantıyı kaldır" onClick={() => editor.chain().focus().unsetLink().run()} disabled={!editor.isActive("link")}><Link2Off className="h-4 w-4" /></ToolbarButton>
        <Divider />
        <ToolbarButton title="Geri al" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}><Undo className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton title="Yinele" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}><Redo className="h-4 w-4" /></ToolbarButton>
      </div>

      <EditorContent editor={editor} />
    </div>
  );
}
