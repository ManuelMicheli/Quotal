"use client"

import * as React from "react"
import {
  ArrowDownIcon,
  ArrowUpDownIcon,
  ArrowUpIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  Loader2Icon,
} from "lucide-react"
import {
  type ColumnDef,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/shared/empty-state"
import { cn } from "@/lib/utils"

type DataTableProps<TData, TValue> = {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  /** Show input above the table that filters by the given column id. */
  searchKey?: string
  searchPlaceholder?: string
  /** Show pagination footer. Pass `false` to render a flat list. */
  pagination?: boolean
  pageSize?: number
  /** Render skeleton rows in place of data. */
  loading?: boolean
  /** Empty-state config — falls back to a sensible default. */
  empty?: {
    title?: React.ReactNode
    description?: React.ReactNode
    icon?: React.ReactNode
    action?: React.ReactNode
  }
  className?: string
  /** Optional row-click handler. */
  onRowClick?: (row: TData) => void
}

function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  searchPlaceholder = "Cerca…",
  pagination = true,
  pageSize = 10,
  loading = false,
  empty,
  className,
  onRowClick,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([])

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    ...(pagination && { getPaginationRowModel: getPaginationRowModel() }),
    initialState: { pagination: { pageSize } },
    state: { sorting },
  })

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {searchKey && (
        <div className="flex items-center">
          <Input
            value={
              (table.getColumn(searchKey)?.getFilterValue() as string) ?? ""
            }
            onChange={(event) =>
              table.getColumn(searchKey)?.setFilterValue(event.target.value)
            }
            placeholder={searchPlaceholder}
            className="max-w-xs"
          />
        </div>
      )}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-1)]">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort()
                  const sortDir = header.column.getIsSorted()
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder ? null : canSort ? (
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className="inline-flex items-center gap-1.5 select-none transition-colors hover:text-foreground"
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                          {sortDir === "asc" ? (
                            <ArrowUpIcon className="size-3" />
                          ) : sortDir === "desc" ? (
                            <ArrowDownIcon className="size-3" />
                          ) : (
                            <ArrowUpDownIcon className="size-3 opacity-40" />
                          )}
                        </button>
                      ) : (
                        flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )
                      )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={`skeleton-${i}`} className="hover:bg-transparent">
                  {columns.map((_col, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-[80%]" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() ? "selected" : undefined}
                  onClick={() => onRowClick?.(row.original)}
                  className={cn(onRowClick && "cursor-pointer")}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={columns.length}
                  className="p-0"
                >
                  <EmptyState
                    title={empty?.title ?? "Nessun risultato"}
                    description={
                      empty?.description ??
                      "Non ci sono ancora dati da mostrare qui."
                    }
                    icon={empty?.icon}
                    action={empty?.action}
                    className="rounded-none"
                  />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {pagination && (
        <DataTablePagination table={table} loading={loading} />
      )}
    </div>
  )
}

function DataTablePagination<TData>({
  table,
  loading,
}: {
  table: ReturnType<typeof useReactTable<TData>>
  loading?: boolean
}) {
  const pageCount = table.getPageCount()
  const pageIndex = table.getState().pagination.pageIndex
  const total = table.getFilteredRowModel().rows.length

  if (pageCount <= 1 && !loading) {
    return total > 0 ? (
      <p className="text-xs text-muted-foreground">
        {total} risultat{total === 1 ? "o" : "i"}
      </p>
    ) : null
  }

  return (
    <div className="flex flex-col-reverse items-center justify-between gap-3 sm:flex-row">
      <p className="text-xs text-muted-foreground tabular">
        {loading ? (
          <span className="inline-flex items-center gap-1.5">
            <Loader2Icon className="size-3 animate-spin" />
            Caricamento…
          </span>
        ) : (
          <>
            Pagina <span className="font-medium text-foreground">{pageIndex + 1}</span>{" "}
            di <span className="font-medium text-foreground">{pageCount}</span>
            <span className="mx-2 text-border">·</span>
            {total} risultat{total === 1 ? "o" : "i"}
          </>
        )}
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => table.setPageIndex(0)}
          disabled={!table.getCanPreviousPage()}
          aria-label="Prima pagina"
        >
          <ChevronsLeftIcon />
        </Button>
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
          aria-label="Pagina precedente"
        >
          <ChevronLeftIcon />
        </Button>
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
          aria-label="Pagina successiva"
        >
          <ChevronRightIcon />
        </Button>
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => table.setPageIndex(pageCount - 1)}
          disabled={!table.getCanNextPage()}
          aria-label="Ultima pagina"
        >
          <ChevronsRightIcon />
        </Button>
      </div>
    </div>
  )
}

export { DataTable }
export type { DataTableProps }
