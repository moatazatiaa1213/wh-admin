import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface Column<T> {
  key: string
  header: string
  render: (row: T) => React.ReactNode
  className?: string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  emptyMessage?: string
}

export function DataTable<T>({ columns, data, emptyMessage = 'No results.' }: DataTableProps<T>) {
  return (
    <div className="bg-[#111111] border border-[#1c1c1c] rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-[#1c1c1c] hover:bg-transparent">
            {columns.map(col => (
              <TableHead
                key={col.key}
                className={`text-[10px] font-semibold uppercase tracking-widest text-zinc-500 py-3 ${col.className ?? ''}`}
              >
                {col.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow className="border-[#1c1c1c]">
              <TableCell
                colSpan={columns.length}
                className="text-center text-zinc-500 text-sm py-12"
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            data.map((row, i) => (
              <TableRow key={i} className="border-[#1c1c1c] hover:bg-zinc-900/40 transition-colors duration-100">
                {columns.map(col => (
                  <TableCell key={col.key} className={`py-3 text-sm ${col.className ?? ''}`}>
                    {col.render(row)}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
