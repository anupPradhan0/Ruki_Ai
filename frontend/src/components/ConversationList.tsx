import { useEffect, useRef, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate, useRouterState } from "@tanstack/react-router"
import { MessageSquarePlus, MoreHorizontal, Pencil, Trash2, MessageSquare, Loader2 } from "lucide-react"
import { api, type ConversationSummary } from "@/lib/api"

export default function ConversationList() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  // Use the selector form so we only re-render on path changes, not on every
  // router state mutation (matches/loaders/etc.).
  const path = useRouterState({ select: (s) => s.location.pathname })

  // /dashboard/chat/<id> — pull the id out of the path
  const activeId = (() => {
    const m = path.match(/^\/dashboard\/chat\/([^/]+)/)
    return m ? m[1] : null
  })()

  const { data, isLoading, isError } = useQuery({
    queryKey: ["conversations"],
    queryFn: api.listConversations,
  })

  const renameMutation = useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) => api.renameConversation(id, title),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["conversations"] }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteConversation(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] })
      queryClient.removeQueries({ queryKey: ["conversation", id] })
      if (activeId === id) navigate({ to: "/dashboard/chat" })
    },
  })

  const handleNewChat = () => {
    navigate({ to: "/dashboard/chat" })
  }

  return (
    <div className="px-3 pb-3 flex flex-col min-h-0 flex-1">
      <button
        type="button"
        onClick={handleNewChat}
        className="flex items-center gap-2 px-3 py-2 mb-2 rounded-xl text-sm text-white/80 border border-white/10 hover:bg-white/5 hover:text-white transition-all"
      >
        <MessageSquarePlus size={15} />
        New chat
      </button>

      <div className="text-[10px] uppercase tracking-wider text-white/30 px-2 pb-1.5">
        Recent
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto -mr-1 pr-1 space-y-0.5">
        {isLoading && (
          <div className="flex justify-center py-4 text-white/30">
            <Loader2 size={14} className="animate-spin" />
          </div>
        )}

        {isError && (
          <p className="text-[11px] text-red-400/70 px-2">Couldn't load history.</p>
        )}

        {data && data.length === 0 && (
          <p className="text-[11px] text-white/30 px-2 py-2">No chats yet.</p>
        )}

        {data?.map((c) => (
          <ConversationItem
            key={c.id}
            convo={c}
            active={activeId === c.id}
            onRename={(title) => renameMutation.mutate({ id: c.id, title })}
            onDelete={() => deleteMutation.mutate(c.id)}
          />
        ))}
      </div>
    </div>
  )
}

function ConversationItem({
  convo,
  active,
  onRename,
  onDelete,
}: {
  convo: ConversationSummary
  active: boolean
  onRename: (title: string) => void
  onDelete: () => void
}) {
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(convo.title)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [menuOpen])

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  const commit = () => {
    const t = draft.trim()
    if (t && t !== convo.title) onRename(t)
    setEditing(false)
  }

  const startRename = () => {
    setDraft(convo.title)
    setEditing(true)
    setMenuOpen(false)
  }

  const handleDelete = () => {
    setMenuOpen(false)
    if (window.confirm(`Delete "${convo.title}"? This can't be undone.`)) {
      onDelete()
    }
  }

  return (
    <div ref={wrapperRef} className="relative group">
      {editing ? (
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit()
            if (e.key === "Escape") {
              setDraft(convo.title)
              setEditing(false)
            }
          }}
          className="w-full px-3 py-2 rounded-lg text-sm bg-[#1A1A1A] border border-[#FFD700]/40 outline-none text-white"
        />
      ) : (
        <div
          className={`flex items-center gap-2 pl-3 pr-1 py-2 rounded-lg text-sm transition-all ${
            active
              ? "bg-[#FFD700]/10 text-white border border-[#FFD700]/30"
              : "text-white/65 hover:text-white hover:bg-white/5 border border-transparent"
          }`}
        >
          <button
            type="button"
            onClick={() => navigate({ to: `/dashboard/chat/${convo.id}` })}
            className="flex items-center gap-2 flex-1 min-w-0 text-left"
          >
            <MessageSquare size={13} className="shrink-0 opacity-60" />
            <span className="truncate flex-1">{convo.title}</span>
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setMenuOpen((o) => !o)
            }}
            className={`p-1 rounded-md transition-opacity shrink-0 ${
              menuOpen || active
                ? "opacity-80"
                : // Visible by default on touch (no hover); hidden until hover on md+.
                  "opacity-60 md:opacity-0 md:group-hover:opacity-60"
            } hover:opacity-100 hover:bg-white/10`}
            aria-label="More"
          >
            <MoreHorizontal size={13} />
          </button>
        </div>
      )}

      {menuOpen && (
        <div className="absolute right-1 top-full mt-1 z-20 w-36 rounded-lg bg-[#161616] border border-white/10 shadow-lg overflow-hidden">
          <button
            type="button"
            onClick={startRename}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white/80 hover:bg-white/5 transition-colors"
          >
            <Pencil size={12} />
            Rename
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <Trash2 size={12} />
            Delete
          </button>
        </div>
      )}
    </div>
  )
}
