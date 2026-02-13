import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import Youtube from "@tiptap/extension-youtube";
import { Subscript } from "@tiptap/extension-subscript";
import { Superscript } from "@tiptap/extension-superscript";
import FontFamily from "@tiptap/extension-font-family";
import { common, createLowlight } from "lowlight";
import { useEffect, useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Type, CaseSensitive, LineChart } from "lucide-react";

// Custom TextStyle extension with fontSize and lineHeight
const CustomTextStyle = TextStyle.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      fontSize: {
        default: null,
        parseHTML: (element) => element.style.fontSize?.replace(/['"]+/g, ""),
        renderHTML: (attributes) => {
          if (!attributes.fontSize) {
            return {};
          }
          return {
            style: `font-size: ${attributes.fontSize}`,
          };
        },
      },
      lineHeight: {
        default: null,
        parseHTML: (element) => element.style.lineHeight?.replace(/['"]+/g, ""),
        renderHTML: (attributes) => {
          if (!attributes.lineHeight) {
            return {};
          }
          return {
            style: `line-height: ${attributes.lineHeight}`,
          };
        },
      },
    };
  },
});
import { useFileUpload } from "@/hooks/useFileUpload";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Link as LinkIcon,
  Image as ImageIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  Palette,
  Undo,
  Redo,
  Upload,
  Loader2,
  Code,
  Table as TableIcon,
  Video,
  Minus,
  Quote,
  Subscript as SubscriptIcon,
  Superscript as SuperscriptIcon,
  Plus,
  Trash2,
  RowsIcon,
  Columns,
  Merge,
  Split,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Create lowlight instance with common languages
const lowlight = createLowlight(common);

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
  courseId?: string;
}

const ToolbarButton = ({
  onClick,
  isActive = false,
  disabled = false,
  children,
  title,
}: {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  title?: string;
}) => (
  <Button
    type="button"
    variant="ghost"
    size="sm"
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={cn(
      "h-8 w-8 p-0 hover:bg-muted",
      isActive && "bg-muted text-primary"
    )}
  >
    {children}
  </Button>
);

const ToolbarDivider = () => (
  <div className="h-6 w-px bg-border mx-1" />
);

export const RichTextEditor = ({
  value,
  onChange,
  placeholder = "Start writing...",
  className,
  minHeight = "200px",
  courseId,
}: RichTextEditorProps) => {
  const [linkUrl, setLinkUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [videoWidth, setVideoWidth] = useState("640");
  const [videoHeight, setVideoHeight] = useState("360");
  const [videoEmbedType, setVideoEmbedType] = useState<"youtube" | "embed">("youtube");
  const [tableRows, setTableRows] = useState("3");
  const [tableCols, setTableCols] = useState("3");
  const [linkPopoverOpen, setLinkPopoverOpen] = useState(false);
  const [imagePopoverOpen, setImagePopoverOpen] = useState(false);
  const [videoPopoverOpen, setVideoPopoverOpen] = useState(false);
  const [tablePopoverOpen, setTablePopoverOpen] = useState(false);
  const [codeBlockPopoverOpen, setCodeBlockPopoverOpen] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState("javascript");
  const [selectedFontSize, setSelectedFontSize] = useState("16px");
  const [selectedFontFamily, setSelectedFontFamily] = useState("default");
  const [selectedLineHeight, setSelectedLineHeight] = useState("1.5");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoFileInputRef = useRef<HTMLInputElement>(null);

  const fontSizes = [
    { value: "12px", label: "12" },
    { value: "14px", label: "14" },
    { value: "16px", label: "16" },
    { value: "18px", label: "18" },
    { value: "20px", label: "20" },
    { value: "24px", label: "24" },
    { value: "28px", label: "28" },
    { value: "32px", label: "32" },
    { value: "36px", label: "36" },
    { value: "48px", label: "48" },
    { value: "64px", label: "64" },
  ];

  const fontFamilies = [
    { value: "default", label: "Default" },
    { value: "Arial, sans-serif", label: "Arial" },
    { value: "Georgia, serif", label: "Georgia" },
    { value: "Times New Roman, serif", label: "Times New Roman" },
    { value: "Verdana, sans-serif", label: "Verdana" },
    { value: "Trebuchet MS, sans-serif", label: "Trebuchet MS" },
    { value: "Courier New, monospace", label: "Courier New" },
    { value: "Lucida Console, monospace", label: "Lucida Console" },
    { value: "Tahoma, sans-serif", label: "Tahoma" },
    { value: "Palatino Linotype, serif", label: "Palatino" },
  ];

  const lineHeights = [
    { value: "1", label: "1.0" },
    { value: "1.15", label: "1.15" },
    { value: "1.5", label: "1.5" },
    { value: "1.75", label: "1.75" },
    { value: "2", label: "2.0" },
    { value: "2.5", label: "2.5" },
    { value: "3", label: "3.0" },
  ];

  const { upload, uploading } = useFileUpload({
    bucket: "course-materials",
    folder: `courses/${courseId || "general"}/images`,
    maxSize: 10,
    allowedTypes: [".jpg", ".jpeg", ".png", ".gif", ".webp"],
  });

  const { upload: uploadVideo, uploading: uploadingVideo } = useFileUpload({
    bucket: "course-materials",
    folder: `courses/${courseId || "general"}/videos`,
    maxSize: 100,
    allowedTypes: [".mp4", ".webm", ".ogg"],
  });

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        codeBlock: false,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-primary underline cursor-pointer",
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: "max-w-full h-auto rounded-lg my-4",
        },
      }),
      Underline,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      CustomTextStyle,
      FontFamily.configure({
        types: ["textStyle"],
      }),
      Color,
      Highlight.configure({
        multicolor: true,
      }),
      CodeBlockLowlight.configure({
        lowlight,
        HTMLAttributes: {
          class: "code-block",
        },
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: "editor-table",
        },
      }),
      TableRow,
      TableCell,
      TableHeader,
      Youtube.configure({
        HTMLAttributes: {
          class: "youtube-video",
        },
        inline: false,
        width: 640,
        height: 360,
        nocookie: true,
        modestBranding: true,
        // Additional privacy parameters added via allowFullscreen attribute
        // rel=0 disables related videos, iv_load_policy=3 hides annotations
        allowFullscreen: true,
        origin: window.location.origin,
      }),
      Subscript,
      Superscript,
    ],
    content: value,
    editorProps: {
      attributes: {
        class: `prose prose-sm max-w-none focus:outline-none p-4`,
        style: `min-height: ${minHeight}`,
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  const setLink = useCallback(() => {
    if (!editor) return;

    if (linkUrl === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: linkUrl })
        .run();
    }
    setLinkUrl("");
    setLinkPopoverOpen(false);
  }, [editor, linkUrl]);

  const addImage = useCallback(() => {
    if (!editor || !imageUrl) return;

    editor.chain().focus().setImage({ src: imageUrl }).run();
    setImageUrl("");
    setImagePopoverOpen(false);
  }, [editor, imageUrl]);

  const addVideo = useCallback(() => {
    if (!editor || !videoUrl) return;

    const w = parseInt(videoWidth) || 640;
    const h = parseInt(videoHeight) || 360;

    if (videoEmbedType === "embed") {
      // Distraction-free embedded iframe
      const embedHtml = `<div class="video-wrapper"><iframe src="${videoUrl}" width="${w}" height="${h}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen class="embedded-video-iframe" style="border:0; border-radius:8px;"></iframe></div>`;
      editor.chain().focus().insertContent(embedHtml).run();
    } else {
      // Check if it's a YouTube URL
      const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
      if (youtubeRegex.test(videoUrl)) {
        editor.chain().focus().setYoutubeVideo({
          src: videoUrl,
          width: w,
          height: h,
        }).run();
      } else {
        // Insert as HTML5 video
        const videoHtml = `<div class="video-wrapper"><video controls width="${w}" height="${h}" class="embedded-video"><source src="${videoUrl}" type="video/mp4">Your browser does not support the video tag.</video></div>`;
        editor.chain().focus().insertContent(videoHtml).run();
      }
    }
    setVideoUrl("");
    setVideoPopoverOpen(false);
  }, [editor, videoUrl, videoWidth, videoHeight, videoEmbedType]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editor) return;

    const url = await upload(file);
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleVideoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editor) return;

    const url = await uploadVideo(file);
    if (url) {
      const videoHtml = `<div class="video-wrapper"><video controls width="${videoWidth}" height="${videoHeight}" class="embedded-video"><source src="${url}" type="${file.type}">Your browser does not support the video tag.</video></div>`;
      editor.chain().focus().insertContent(videoHtml).run();
      setVideoPopoverOpen(false);
    }
    if (videoFileInputRef.current) {
      videoFileInputRef.current.value = "";
    }
  };

  const insertTable = useCallback(() => {
    if (!editor) return;
    const rows = parseInt(tableRows) || 3;
    const cols = parseInt(tableCols) || 3;
    editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run();
    setTablePopoverOpen(false);
  }, [editor, tableRows, tableCols]);

  if (!editor) {
    return null;
  }

  const colors = [
    "#000000", "#374151", "#991b1b", "#b45309", "#15803d", "#0369a1", "#6b21a8", "#be185d",
    "#ef4444", "#f97316", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899",
  ];

  const highlightColors = [
    "#fef08a", "#bbf7d0", "#bfdbfe", "#ddd6fe", "#fecaca", "#fed7aa",
  ];

  return (
    <div className={cn("border rounded-lg bg-background overflow-hidden", className)}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 p-2 border-b bg-muted/50">
        {/* Undo/Redo */}
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Undo"
        >
          <Undo className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Redo"
        >
          <Redo className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarDivider />

        {/* Font Family */}
        <Select
          value={selectedFontFamily}
          onValueChange={(value) => {
            setSelectedFontFamily(value);
            if (value === "default") {
              editor.chain().focus().unsetFontFamily().run();
            } else {
              editor.chain().focus().setFontFamily(value).run();
            }
          }}
        >
          <SelectTrigger className="h-8 w-[120px] text-xs">
            <CaseSensitive className="h-3 w-3 mr-1" />
            <SelectValue placeholder="Font" />
          </SelectTrigger>
          <SelectContent>
            {fontFamilies.map((font) => (
              <SelectItem key={font.value} value={font.value} className="text-xs">
                <span style={{ fontFamily: font.value === "default" ? "inherit" : font.value }}>
                  {font.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Font Size */}
        <Select
          value={selectedFontSize}
          onValueChange={(value) => {
            setSelectedFontSize(value);
            editor.chain().focus().setMark("textStyle", { fontSize: value }).run();
          }}
        >
          <SelectTrigger className="h-8 w-[70px] text-xs">
            <Type className="h-3 w-3 mr-1" />
            <SelectValue placeholder="Size" />
          </SelectTrigger>
          <SelectContent>
            {fontSizes.map((size) => (
              <SelectItem key={size.value} value={size.value} className="text-xs">
                {size.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Line Height */}
        <Select
          value={selectedLineHeight}
          onValueChange={(value) => {
            setSelectedLineHeight(value);
            editor.chain().focus().setMark("textStyle", { lineHeight: value }).run();
          }}
        >
          <SelectTrigger className="h-8 w-[70px] text-xs" title="Line Height">
            <LineChart className="h-3 w-3 mr-1" />
            <SelectValue placeholder="LH" />
          </SelectTrigger>
          <SelectContent>
            {lineHeights.map((lh) => (
              <SelectItem key={lh.value} value={lh.value} className="text-xs">
                {lh.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <ToolbarDivider />

        {/* Headings */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          isActive={editor.isActive("heading", { level: 1 })}
          title="Heading 1"
        >
          <Heading1 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          isActive={editor.isActive("heading", { level: 2 })}
          title="Heading 2"
        >
          <Heading2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          isActive={editor.isActive("heading", { level: 3 })}
          title="Heading 3"
        >
          <Heading3 className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarDivider />

        {/* Text formatting */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive("bold")}
          title="Bold"
        >
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive("italic")}
          title="Italic"
        >
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          isActive={editor.isActive("underline")}
          title="Underline"
        >
          <UnderlineIcon className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          isActive={editor.isActive("strike")}
          title="Strikethrough"
        >
          <Strikethrough className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleSubscript().run()}
          isActive={editor.isActive("subscript")}
          title="Subscript"
        >
          <SubscriptIcon className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleSuperscript().run()}
          isActive={editor.isActive("superscript")}
          title="Superscript"
        >
          <SuperscriptIcon className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarDivider />

        {/* Text Color */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 hover:bg-muted"
              title="Text Color"
            >
              <Palette className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2">
            <div className="grid grid-cols-7 gap-1">
              {colors.map((color) => (
                <button
                  key={color}
                  type="button"
                  className="w-6 h-6 rounded border border-border hover:scale-110 transition-transform"
                  style={{ backgroundColor: color }}
                  onClick={() => editor.chain().focus().setColor(color).run()}
                />
              ))}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full mt-2 text-xs"
              onClick={() => editor.chain().focus().unsetColor().run()}
            >
              Remove color
            </Button>
          </PopoverContent>
        </Popover>

        {/* Highlight */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={cn(
                "h-8 w-8 p-0 hover:bg-muted",
                editor.isActive("highlight") && "bg-muted text-primary"
              )}
              title="Highlight"
            >
              <Highlighter className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2">
            <div className="grid grid-cols-6 gap-1">
              {highlightColors.map((color) => (
                <button
                  key={color}
                  type="button"
                  className="w-6 h-6 rounded border border-border hover:scale-110 transition-transform"
                  style={{ backgroundColor: color }}
                  onClick={() => editor.chain().focus().toggleHighlight({ color }).run()}
                />
              ))}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full mt-2 text-xs"
              onClick={() => editor.chain().focus().unsetHighlight().run()}
            >
              Remove highlight
            </Button>
          </PopoverContent>
        </Popover>

        <ToolbarDivider />

        {/* Alignment */}
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          isActive={editor.isActive({ textAlign: "left" })}
          title="Align Left"
        >
          <AlignLeft className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          isActive={editor.isActive({ textAlign: "center" })}
          title="Align Center"
        >
          <AlignCenter className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          isActive={editor.isActive({ textAlign: "right" })}
          title="Align Right"
        >
          <AlignRight className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("justify").run()}
          isActive={editor.isActive({ textAlign: "justify" })}
          title="Justify"
        >
          <AlignJustify className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarDivider />

        {/* Lists */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive("bulletList")}
          title="Bullet List"
        >
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive("orderedList")}
          title="Numbered List"
        >
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>

        {/* Blockquote */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive("blockquote")}
          title="Blockquote"
        >
          <Quote className="h-4 w-4" />
        </ToolbarButton>

        {/* Horizontal Rule */}
        <ToolbarButton
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="Horizontal Line"
        >
          <Minus className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarDivider />

        {/* Code Block */}
        <Popover open={codeBlockPopoverOpen} onOpenChange={setCodeBlockPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={cn(
                "h-8 w-8 p-0 hover:bg-muted",
                editor.isActive("codeBlock") && "bg-muted text-primary"
              )}
              title="Code Block"
            >
              <Code className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64">
            <div className="space-y-3">
              <p className="text-sm font-medium">Insert Code Block</p>
              <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                <SelectTrigger>
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="javascript">JavaScript</SelectItem>
                  <SelectItem value="typescript">TypeScript</SelectItem>
                  <SelectItem value="python">Python</SelectItem>
                  <SelectItem value="java">Java</SelectItem>
                  <SelectItem value="c">C</SelectItem>
                  <SelectItem value="cpp">C++</SelectItem>
                  <SelectItem value="csharp">C#</SelectItem>
                  <SelectItem value="go">Go</SelectItem>
                  <SelectItem value="rust">Rust</SelectItem>
                  <SelectItem value="php">PHP</SelectItem>
                  <SelectItem value="ruby">Ruby</SelectItem>
                  <SelectItem value="swift">Swift</SelectItem>
                  <SelectItem value="kotlin">Kotlin</SelectItem>
                  <SelectItem value="sql">SQL</SelectItem>
                  <SelectItem value="html">HTML</SelectItem>
                  <SelectItem value="css">CSS</SelectItem>
                  <SelectItem value="json">JSON</SelectItem>
                  <SelectItem value="xml">XML</SelectItem>
                  <SelectItem value="yaml">YAML</SelectItem>
                  <SelectItem value="markdown">Markdown</SelectItem>
                  <SelectItem value="bash">Bash/Shell</SelectItem>
                  <SelectItem value="plaintext">Plain Text</SelectItem>
                </SelectContent>
              </Select>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  editor.chain().focus().toggleCodeBlock({ language: selectedLanguage }).run();
                  setCodeBlockPopoverOpen(false);
                }}
                className="w-full"
              >
                Insert Code Block
              </Button>
              {editor.isActive("codeBlock") && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    editor.chain().focus().toggleCodeBlock().run();
                    setCodeBlockPopoverOpen(false);
                  }}
                  className="w-full"
                >
                  Remove Code Block
                </Button>
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* Table */}
        <Popover open={tablePopoverOpen} onOpenChange={setTablePopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={cn(
                "h-8 w-8 p-0 hover:bg-muted",
                editor.isActive("table") && "bg-muted text-primary"
              )}
              title="Insert Table"
            >
              <TableIcon className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72">
            <div className="space-y-4">
              <p className="text-sm font-medium">Insert Table</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="rows" className="text-xs">Rows</Label>
                  <Input
                    id="rows"
                    type="number"
                    min="1"
                    max="20"
                    value={tableRows}
                    onChange={(e) => setTableRows(e.target.value)}
                    className="h-8"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cols" className="text-xs">Columns</Label>
                  <Input
                    id="cols"
                    type="number"
                    min="1"
                    max="10"
                    value={tableCols}
                    onChange={(e) => setTableCols(e.target.value)}
                    className="h-8"
                  />
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={insertTable}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Insert Table
              </Button>
              
              {editor.isActive("table") && (
                <div className="pt-2 border-t space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Table Actions</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => editor.chain().focus().addRowBefore().run()}
                      className="text-xs h-7"
                    >
                      <RowsIcon className="h-3 w-3 mr-1" />
                      Row Before
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => editor.chain().focus().addRowAfter().run()}
                      className="text-xs h-7"
                    >
                      <RowsIcon className="h-3 w-3 mr-1" />
                      Row After
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => editor.chain().focus().addColumnBefore().run()}
                      className="text-xs h-7"
                    >
                      <Columns className="h-3 w-3 mr-1" />
                      Col Before
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => editor.chain().focus().addColumnAfter().run()}
                      className="text-xs h-7"
                    >
                      <Columns className="h-3 w-3 mr-1" />
                      Col After
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => editor.chain().focus().deleteRow().run()}
                      className="text-xs h-7"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Delete Row
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => editor.chain().focus().deleteColumn().run()}
                      className="text-xs h-7"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Delete Col
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => editor.chain().focus().mergeCells().run()}
                      className="text-xs h-7"
                    >
                      <Merge className="h-3 w-3 mr-1" />
                      Merge
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => editor.chain().focus().splitCell().run()}
                      className="text-xs h-7"
                    >
                      <Split className="h-3 w-3 mr-1" />
                      Split
                    </Button>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      editor.chain().focus().deleteTable().run();
                      setTablePopoverOpen(false);
                    }}
                    className="w-full text-xs h-7"
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Delete Table
                  </Button>
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>

        <ToolbarDivider />

        {/* Link */}
        <Popover open={linkPopoverOpen} onOpenChange={setLinkPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={cn(
                "h-8 w-8 p-0 hover:bg-muted",
                editor.isActive("link") && "bg-muted text-primary"
              )}
              title="Add Link"
            >
              <LinkIcon className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="space-y-2">
              <p className="text-sm font-medium">Insert Link</p>
              <Input
                placeholder="https://example.com"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    setLink();
                  }
                }}
              />
              <div className="flex gap-2">
                <Button type="button" size="sm" onClick={setLink} className="flex-1">
                  Insert
                </Button>
                {editor.isActive("link") && (
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      editor.chain().focus().unsetLink().run();
                      setLinkPopoverOpen(false);
                    }}
                  >
                    Remove
                  </Button>
                )}
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Image */}
        <Popover open={imagePopoverOpen} onOpenChange={setImagePopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 hover:bg-muted"
              title="Add Image"
            >
              <ImageIcon className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="space-y-3">
              <p className="text-sm font-medium">Insert Image</p>
              
              {/* File Upload */}
              <div className="space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.gif,.webp"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Image
                    </>
                  )}
                </Button>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-popover px-2 text-muted-foreground">Or</span>
                </div>
              </div>

              {/* URL Input */}
              <Input
                placeholder="Paste image URL"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addImage();
                  }
                }}
              />
              <Button
                type="button"
                size="sm"
                onClick={addImage}
                disabled={!imageUrl}
                className="w-full"
              >
                Insert from URL
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        {/* Video */}
        <Popover open={videoPopoverOpen} onOpenChange={setVideoPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 hover:bg-muted"
              title="Add Video"
            >
              <Video className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="space-y-3">
              <p className="text-sm font-medium">Insert Video</p>

              {/* Embed Type Selector */}
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={videoEmbedType === "youtube" ? "default" : "outline"}
                  onClick={() => setVideoEmbedType("youtube")}
                  className="flex-1 text-xs"
                >
                  YouTube / Video URL
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={videoEmbedType === "embed" ? "default" : "outline"}
                  onClick={() => setVideoEmbedType("embed")}
                  className="flex-1 text-xs"
                >
                  Embed (Distraction-Free)
                </Button>
              </div>
              
              {/* Video File Upload - only for youtube/video type */}
              {videoEmbedType === "youtube" && (
                <>
                  <div className="space-y-2">
                    <input
                      ref={videoFileInputRef}
                      type="file"
                      accept=".mp4,.webm,.ogg"
                      onChange={handleVideoFileUpload}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => videoFileInputRef.current?.click()}
                      disabled={uploadingVideo}
                    >
                      {uploadingVideo ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="mr-2 h-4 w-4" />
                          Upload Video (MP4, WebM, OGG)
                        </>
                      )}
                    </Button>
                  </div>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-popover px-2 text-muted-foreground">Or</span>
                    </div>
                  </div>
                </>
              )}

              {/* URL Input */}
              <div className="space-y-2">
                <Input
                  placeholder={videoEmbedType === "embed" ? "Paste embed/iframe URL" : "YouTube URL or video URL"}
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                />
                {videoEmbedType === "embed" && (
                  <p className="text-xs text-muted-foreground">
                    Paste any embed URL for distraction-free viewing (e.g. YouTube embed, Vimeo, Loom)
                  </p>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="videoWidth" className="text-xs">Width</Label>
                    <Input
                      id="videoWidth"
                      type="number"
                      value={videoWidth}
                      onChange={(e) => setVideoWidth(e.target.value)}
                      className="h-8"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="videoHeight" className="text-xs">Height</Label>
                    <Input
                      id="videoHeight"
                      type="number"
                      value={videoHeight}
                      onChange={(e) => setVideoHeight(e.target.value)}
                      className="h-8"
                    />
                  </div>
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={addVideo}
                disabled={!videoUrl}
                className="w-full"
              >
                {videoEmbedType === "embed" ? "Embed Video" : "Insert Video"}
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Editor Content */}
      <EditorContent editor={editor} />

      <style>{`
        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: hsl(var(--muted-foreground));
          pointer-events: none;
          height: 0;
        }
        .ProseMirror:focus {
          outline: none;
        }
        .ProseMirror h1 {
          font-size: 1.875rem;
          font-weight: 700;
          line-height: 1.2;
          margin-top: 1rem;
          margin-bottom: 0.5rem;
        }
        .ProseMirror h2 {
          font-size: 1.5rem;
          font-weight: 600;
          line-height: 1.3;
          margin-top: 0.75rem;
          margin-bottom: 0.5rem;
        }
        .ProseMirror h3 {
          font-size: 1.25rem;
          font-weight: 600;
          line-height: 1.4;
          margin-top: 0.5rem;
          margin-bottom: 0.25rem;
        }
        .ProseMirror p {
          margin-bottom: 0.5rem;
        }
        .ProseMirror ul, .ProseMirror ol {
          padding-left: 1.5rem;
          margin-bottom: 0.5rem;
        }
        .ProseMirror ul {
          list-style-type: disc;
        }
        .ProseMirror ol {
          list-style-type: decimal;
        }
        .ProseMirror img {
          max-width: 100%;
          height: auto;
          border-radius: 0.5rem;
          margin: 1rem 0;
        }
        .ProseMirror mark {
          border-radius: 0.25rem;
          padding: 0.125rem 0.25rem;
        }
        .ProseMirror blockquote {
          border-left: 3px solid hsl(var(--primary));
          padding-left: 1rem;
          margin: 1rem 0;
          font-style: italic;
          color: hsl(var(--muted-foreground));
        }
        .ProseMirror hr {
          border: none;
          border-top: 2px solid hsl(var(--border));
          margin: 1.5rem 0;
        }
        .ProseMirror sub {
          font-size: 0.75em;
          vertical-align: sub;
        }
        .ProseMirror sup {
          font-size: 0.75em;
          vertical-align: super;
        }
        /* Code Block Styles */
        .ProseMirror .code-block {
          background-color: hsl(var(--muted));
          border-radius: 0.5rem;
          padding: 1rem;
          margin: 1rem 0;
          font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace;
          font-size: 0.875rem;
          line-height: 1.5;
          overflow-x: auto;
        }
        .ProseMirror pre {
          background-color: hsl(var(--muted));
          border-radius: 0.5rem;
          padding: 1rem;
          margin: 1rem 0;
          font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace;
          font-size: 0.875rem;
          line-height: 1.5;
          overflow-x: auto;
        }
        .ProseMirror pre code {
          background: none;
          padding: 0;
          border-radius: 0;
          font-size: inherit;
          color: inherit;
        }
        .ProseMirror code {
          background-color: hsl(var(--muted));
          border-radius: 0.25rem;
          padding: 0.125rem 0.375rem;
          font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace;
          font-size: 0.875em;
        }
        /* Table Styles */
        .ProseMirror .editor-table {
          border-collapse: collapse;
          table-layout: fixed;
          width: 100%;
          margin: 1rem 0;
          overflow: hidden;
          border-radius: 0.5rem;
          border: 1px solid hsl(var(--border));
        }
        .ProseMirror table {
          border-collapse: collapse;
          table-layout: fixed;
          width: 100%;
          margin: 1rem 0;
          overflow: hidden;
        }
        .ProseMirror td,
        .ProseMirror th {
          min-width: 1em;
          border: 1px solid hsl(var(--border));
          padding: 0.5rem 0.75rem;
          vertical-align: top;
          box-sizing: border-box;
          position: relative;
        }
        .ProseMirror th {
          font-weight: 600;
          text-align: left;
          background-color: hsl(var(--muted));
        }
        .ProseMirror .selectedCell:after {
          z-index: 2;
          position: absolute;
          content: "";
          left: 0;
          right: 0;
          top: 0;
          bottom: 0;
          background: hsl(var(--primary) / 0.15);
          pointer-events: none;
        }
        .ProseMirror .column-resize-handle {
          position: absolute;
          right: -2px;
          top: 0;
          bottom: -2px;
          width: 4px;
          background-color: hsl(var(--primary));
          pointer-events: none;
        }
        .ProseMirror.resize-cursor {
          cursor: col-resize;
        }
        /* Video Styles */
        .ProseMirror .video-wrapper {
          margin: 1rem 0;
        }
        .ProseMirror .embedded-video {
          max-width: 100%;
          border-radius: 0.5rem;
        }
        .ProseMirror .youtube-video {
          margin: 1rem 0;
        }
        .ProseMirror iframe {
          border-radius: 0.5rem;
          max-width: 100%;
        }
        /* Syntax highlighting styles are now in index.css for global consistency */
      `}</style>
    </div>
  );
};
