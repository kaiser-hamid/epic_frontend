import {
  createColumnHelper,
  tableFeatures,
  type ColumnHelper,
  type RowData,
} from "@tanstack/react-table"

/**
 * Lists are server-side: the backend paginates, sorts and filters, the table
 * only renders. Core features only; sort and page state live in the URL.
 */
export const dataTableFeatures = tableFeatures({})

export type DataTableFeatures = typeof dataTableFeatures

export type DataTableColumns<TData extends RowData> = ReturnType<
  ColumnHelper<DataTableFeatures, TData>["columns"]
>

/** Typed column helper for a DataTable. Call once at module scope per table. */
export function dataTableColumnHelper<TData extends RowData>(): ColumnHelper<
  DataTableFeatures,
  TData
> {
  return createColumnHelper<DataTableFeatures, TData>()
}
