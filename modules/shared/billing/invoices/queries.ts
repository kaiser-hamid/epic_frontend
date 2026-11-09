"use client"

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"

import {
  createInvoice,
  getInvoice,
  listInvoices,
  listPatientTypes,
  printInvoice,
  quoteInvoice,
  type InvoiceListParams,
  type QuoteInput,
} from "@/modules/shared/billing/invoices/api"
import type { Invoice } from "@/modules/shared/billing/invoices/types"
import { patientKeys } from "@/modules/shared/patient/queries"

export const invoiceKeys = {
  all: ["shared", "invoices"] as const,
  lists: () => [...invoiceKeys.all, "list"] as const,
  list: (params: InvoiceListParams) =>
    [...invoiceKeys.lists(), params] as const,
  details: () => [...invoiceKeys.all, "detail"] as const,
  detail: (id: number) => [...invoiceKeys.details(), id] as const,
  quote: (input: QuoteInput) => [...invoiceKeys.all, "quote", input] as const,
  patientTypes: () => [...invoiceKeys.all, "patient-types"] as const,
}

export function useInvoices(params: InvoiceListParams) {
  return useQuery({
    queryKey: invoiceKeys.list(params),
    queryFn: () => listInvoices(params),
    placeholderData: keepPreviousData,
  })
}

export function useInvoice(id: number) {
  return useQuery({
    queryKey: invoiceKeys.detail(id),
    queryFn: () => getInvoice(id),
  })
}

/** Reference data: patient types change rarely. */
export function usePatientTypes() {
  return useQuery({
    queryKey: invoiceKeys.patientTypes(),
    queryFn: listPatientTypes,
    staleTime: 5 * 60_000,
  })
}

/** Server totals for the lines on the form; off until a patient type and a test are chosen. */
export function useInvoiceQuote(input: QuoteInput | null) {
  return useQuery({
    queryKey: invoiceKeys.quote(input ?? { items: [], patient_type_id: 0 }),
    queryFn: () => quoteInvoice(input as QuoteInput),
    enabled: input !== null && input.items.length > 0,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  })
}

/**
 * The create response already has the detail shape, so it seeds the detail cache. A new
 * patient may have been registered, so patient searches are refetched. A Blood Bank bill opens
 * a case; the Blood Bank lists refetch on their own when opened (they are not cached here).
 */
export function useCreateInvoice() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createInvoice,
    onSuccess: (record: Invoice) => {
      queryClient.setQueryData(invoiceKeys.detail(record.id), record)
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() })
      queryClient.invalidateQueries({ queryKey: patientKeys.all })
    },
  })
}

export function usePrintInvoice() {
  return useMutation({ mutationFn: printInvoice })
}
