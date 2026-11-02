"use client"

import { parseAsInteger, parseAsStringLiteral, useQueryStates } from "nuqs"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PendingSerologyTable } from "@/modules/blood-bank/donor-serology/components/pending-serology-table"
import { SerologyTab } from "@/modules/blood-bank/donor-serology/components/serology-tab"

const tabs = ["serology", "pending"] as const
type Tab = (typeof tabs)[number]

/** Serology | Pending. The tab, the loaded case and a sample scan's donor are kept in the URL. */
export function DonorSerologyScreen() {
  const [state, setState] = useQueryStates(
    {
      tab: parseAsStringLiteral(tabs).withDefault("serology"),
      case: parseAsInteger,
      // The case donor a sample scan focused on; null shows every donor.
      donor: parseAsInteger,
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
        <TabsTrigger value="serology">Serology</TabsTrigger>
        <TabsTrigger value="pending">Pending</TabsTrigger>
      </TabsList>
      <TabsContent value="serology">
        <SerologyTab
          caseId={state.case}
          focusDonorId={state.case === null ? null : state.donor}
          onCaseChange={(caseId, focusDonorId) =>
            setState({ case: caseId, donor: focusDonorId })
          }
        />
      </TabsContent>
      <TabsContent value="pending">
        <PendingSerologyTable
          onOpenCase={(caseId) =>
            setState({ tab: "serology", case: caseId, donor: null })
          }
        />
      </TabsContent>
    </Tabs>
  )
}
