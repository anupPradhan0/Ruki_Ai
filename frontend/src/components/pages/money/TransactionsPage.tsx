import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Plus } from "lucide-react"
import {
  api,
  CATEGORIES,
  type Category,
  type Transaction,
  type TxnType,
} from "@/lib/api"
import { toast, toastError } from "@/lib/toast"
import { TxnListSkeleton } from "@/components/Skeleton"
import TransactionForm from "./TransactionForm"
import TransactionRow from "./TransactionRow"

export default function TransactionsPage() {
  const qc = useQueryClient()
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [category, setCategory] = useState<Category | "">("")
  const [type, setType] = useState<TxnType | "">("")

  const { data, isLoading, error } = useQuery({
    queryKey: ["money", "list", { category, type }],
    queryFn: () => api.money.list({ category, type, limit: 100 }),
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ["money"] })

  const create = useMutation({
    mutationFn: api.money.create,
    onSuccess: () => {
      setAdding(false)
      toast.success("Transaction added")
      invalidate()
    },
    onError: (e) => toastError(e, "Could not add transaction"),
  })

  const update = useMutation({
    mutationFn: ({ id, data: d }: { id: string; data: Parameters<typeof api.money.update>[1] }) =>
      api.money.update(id, d),
    onSuccess: () => {
      setEditing(null)
      toast.success("Transaction updated")
      invalidate()
    },
    onError: (e) => toastError(e, "Could not update"),
  })

  const remove = useMutation({
    mutationFn: api.money.remove,
    onSuccess: () => {
      toast.success("Deleted")
      invalidate()
    },
    onError: (e) => toastError(e, "Could not delete"),
  })

  if (error) toastError(error, "Couldn't load transactions")

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-semibold text-white">Transactions</h2>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={type}
            onChange={(e) => setType(e.target.value as TxnType | "")}
            className="bg-[#111] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white"
          >
            <option value="">All types</option>
            <option value="expense">Expenses</option>
            <option value="income">Income</option>
          </select>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as Category | "")}
            className="bg-[#111] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white capitalize"
          >
            <option value="">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c.replace("_", " ")}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => {
              setAdding((v) => !v)
              setEditing(null)
            }}
            className="px-3 py-1.5 rounded-lg text-xs bg-[#FFD700] text-black font-medium hover:bg-[#FFD700]/90 transition-colors flex items-center gap-1.5"
          >
            <Plus size={14} />
            Add
          </button>
        </div>
      </div>

      {adding && (
        <TransactionForm
          onSubmit={async (d) => {
            await create.mutateAsync(d)
          }}
          onCancel={() => setAdding(false)}
        />
      )}

      {isLoading ? (
        <TxnListSkeleton />
      ) : data && data.items.length > 0 ? (
        <div className="space-y-2">
          {data.items.map((t) =>
            editing?.id === t.id ? (
              <TransactionForm
                key={t.id}
                initial={t}
                onSubmit={async (d) => {
                  await update.mutateAsync({ id: t.id, data: d })
                }}
                onCancel={() => setEditing(null)}
              />
            ) : (
              <TransactionRow
                key={t.id}
                txn={t}
                onEdit={() => {
                  setEditing(t)
                  setAdding(false)
                }}
                onDelete={() => remove.mutate(t.id)}
              />
            ),
          )}
        </div>
      ) : (
        <div className="text-center py-16 text-white/40 text-sm">
          No transactions yet. Click <span className="text-white/70">Add</span> to log your first.
        </div>
      )}
    </div>
  )
}
