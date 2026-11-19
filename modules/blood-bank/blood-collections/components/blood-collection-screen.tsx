"use client"

import { parseAsInteger, parseAsStringLiteral, useQueryStates } from "nuqs"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { CollectedBagTable } from "@/modules/blood-bank/blood-collections/components/collected-bag-table"
import { CollectionTab } from "@/modules/blood-bank/blood-collections/components/collection-tab"
import { PendingBloodCollectionTable } from "@/modules/blood-bank/blood-collections/components/pending-blood-collection-table"
import { UnitLabelPrinter } from "@/modules/blood-bank/units/components/unit-label-printer"

const tabs = ["collection", "pending", "collected"] as const
type Tab = (typeof tabs)[number]

/**
 * Collection | Pending | Collected. The tab, the loaded case and a donor no scan's donor are
 * kept in the URL.
 */
export function BloodCollectionScreen() {
  const [state, setState] = useQueryStates(
    {
      tab: parseAsStringLiteral(tabs).withDefault("collection"),
      case: parseAsInteger,
      // The case donor a donor no scan focused on; null shows every donor.
      donor: parseAsInteger,
    },
    { history: "replace" }
  )

  return (
    <UnitLabelPrinter>
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
          <TabsTrigger value="collection">Collection</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="collected">Collected</TabsTrigger>
        </TabsList>
        <TabsContent value="collection">
          <CollectionTab
            caseId={state.case}
            focusDonorId={state.case === null ? null : state.donor}
            onCaseChange={(caseId, focusDonorId) =>
              setState({ case: caseId, donor: focusDonorId })
            }
          />
        </TabsContent>
        <TabsContent value="pending">
          <PendingBloodCollectionTable
            onOpenCase={(caseId) =>
              setState({ tab: "collection", case: caseId, donor: null })
            }
          />
        </TabsContent>
        <TabsContent value="collected">
          <CollectedBagTable />
        </TabsContent>
      </Tabs>
    </UnitLabelPrinter>
  )
}
