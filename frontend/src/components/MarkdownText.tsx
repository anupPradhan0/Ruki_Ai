// Lightweight renderer for AI text that follows a tiny markdown subset:
// "# h2", "## h3", and "• / - / *" bullets. Everything else is a paragraph.
export default function MarkdownText({ text }: { text: string }) {
  return (
    <>
      {text.split("\n").map((raw, i) => {
        const line = raw.trim()
        if (!line) return <div key={i} className="h-1" />
        if (line.startsWith("## ")) {
          return (
            <h3 key={i} className="text-[#FFD700] font-semibold text-sm mt-3">
              {line.replace(/^##\s*/, "")}
            </h3>
          )
        }
        if (line.startsWith("# ")) {
          return (
            <h2 key={i} className="text-white font-semibold text-base mt-3">
              {line.replace(/^#\s*/, "")}
            </h2>
          )
        }
        if (line.startsWith("• ") || line.startsWith("- ") || line.startsWith("* ")) {
          return (
            <div key={i} className="flex gap-2">
              <span className="text-[#FFD700] shrink-0">•</span>
              <span>{line.replace(/^[•\-*]\s*/, "")}</span>
            </div>
          )
        }
        return <p key={i}>{line}</p>
      })}
    </>
  )
}
