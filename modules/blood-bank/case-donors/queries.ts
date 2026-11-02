"use client"

import {
  skipToken,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"

import { hasErrorCode } from "@/lib/api-error"
import {
  addCaseDonor,
  findCaseForAddDonor,
} from "@/modules/blood-bank/case-donors/api"
import { AddDonorErrorCode } from "@/modules/blood-bank/case-donors/error-messages"
import { caseKeys } from "@/modules/blood-bank/cases/queries"
import type { BloodBankCase } from "@/modules/blood-bank/cases/types"
import { donorExaminationKeys } from "@/modules/blood-bank/donor-examinations/queries"
import { donorSerologyKeys } from "@/modules/blood-bank/donor-serology/queries"
import { donorKeys } from "@/modules/blood-bank/donors/queries"
import { sampleKeys } from "@/modules/blood-bank/samples/queries"

export const caseDonorKeys = {
  all: ["blood-bank", "case-donors"] as const,
  /** The Add donor page's case, by the invoice in the URL. */
  byInvoice: (invoiceNo: string | null) =>
    [...caseDonorKeys.all, "by-invoice", invoiceNo] as const,
}

/** The case of the invoice in the URL; idle while none is scanned. */
export function useAddDonorCase(invoiceNo: string | null) {
  return useQuery({
    queryKey: caseDonorKeys.byInvoice(invoiceNo),
    queryFn:
      invoiceNo === null ? skipToken : () => findCaseForAddDonor(invoiceNo),
  })
}

/**
 * Invoice scan. An action rather than a query: each Enter asks the server again. The result
 * seeds the page's query for that invoice, so loading it needs no second request.
 */
export function useFindAddDonorCase() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: findCaseForAddDonor,
    onSuccess: (record: BloodBankCase, invoiceNo: string) => {
      queryClient.setQueryData(caseDonorKeys.byInvoice(invoiceNo), record)
    },
  })
}

/**
 * The response is the updated case detail, so it replaces the page's case and the case
 * detail cache. The new donor shows up on the Cases list (donor count), the work screens
 * and pending lists of Sample Collection and Donor Examination, and the donor search.
 */
export function useAddCaseDonor(invoiceNo: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: addCaseDonor,
    onSuccess: (record: BloodBankCase) => {
      queryClient.setQueryData(caseDonorKeys.byInvoice(invoiceNo), record)
      queryClient.setQueryData(caseKeys.detail(record.id), record)
      queryClient.invalidateQueries({ queryKey: caseKeys.lists() })
      queryClient.invalidateQueries({ queryKey: sampleKeys.pendingLists() })
      queryClient.invalidateQueries({
        queryKey: sampleKeys.collection(record.id),
      })
      queryClient.invalidateQueries({
        queryKey: donorExaminationKeys.pendingLists(),
      })
      queryClient.invalidateQueries({
        queryKey: donorExaminationKeys.screen(record.id),
      })
      queryClient.invalidateQueries({
        queryKey: donorSerologyKeys.caseScreens(record.id),
      })
      queryClient.invalidateQueries({ queryKey: donorKeys.all })
    },
    onError: (error) => {
      // The case was closed meanwhile: reload it, which hides the form.
      if (hasErrorCode(error, AddDonorErrorCode.CaseNotOpen)) {
        queryClient.invalidateQueries({
          queryKey: caseDonorKeys.byInvoice(invoiceNo),
        })
      }
    },
  })
}
