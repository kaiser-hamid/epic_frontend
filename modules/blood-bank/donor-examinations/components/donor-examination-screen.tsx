"use client"

import { parseAsInteger, parseAsStringLiteral, useQueryStates } from "nuqs"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ExaminationTab } from "@/modules/blood-bank/donor-examinations/components/examination-tab"
import { PendingExaminationTable } from "@/modules/blood-bank/donor-examinations/components/pending-examination-table"

const tabs = ["examination", "pending"] as const
type Tab = (typeof tabs)[number]

/** Examination | Pending. The tab and the loaded case are kept in the URL. */
export function DonorExaminationScreen() {
  const [state, setState] = useQueryStates(
    {
      tab: parseAsStringLiteral(tabs).withDefault("examination"),
      case: parseAsInteger,
    },
    { history: "replace" }
  )

  return (
    <Tabs
      value={state.tab}
      onValueChange={(value) => {
        const tab = tabs.find((option): option is Tab => option === value)
        if (tab) {
          setState({ tab })
        }
      }}
    >
      <TabsList>
        <TabsTrigger value="examination">Examination</TabsTrigger>
        <TabsTrigger value="pending">Pending</TabsTrigger>
      </TabsList>
      <TabsContent value="examination">
        <ExaminationTab
          caseId={state.case}
          onCaseChange={(caseId) => setState({ case: caseId })}
        />
      </TabsContent>
      <TabsContent value="pending">
        <PendingExaminationTable
          onOpenCase={(caseId) =>
            setState({ tab: "examination", case: caseId })
          }
        />
      </TabsContent>
    </Tabs>
  )
}
