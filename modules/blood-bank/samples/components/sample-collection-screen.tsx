"use client"

import { parseAsInteger, parseAsStringLiteral, useQueryStates } from "nuqs"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CollectedSampleTable } from "@/modules/blood-bank/samples/components/collected-sample-table"
import { CollectionTab } from "@/modules/blood-bank/samples/components/collection-tab"
import { PendingCollectionTable } from "@/modules/blood-bank/samples/components/pending-collection-table"
import { SampleLabelPrinter } from "@/modules/blood-bank/samples/components/sample-label-printer"

const tabs = ["collection", "pending", "collected"] as const
type Tab = (typeof tabs)[number]

/** Collection | Pending | Collected. The tab and the loaded case are kept in the URL. */
export function SampleCollectionScreen() {
  const [state, setState] = useQueryStates(
    {
      tab: parseAsStringLiteral(tabs).withDefault("collection"),
      case: parseAsInteger,
    },
    { history: "replace" }
  )

  return (
    <SampleLabelPrinter>
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
            onCaseChange={(caseId) => setState({ case: caseId })}
          />
        </TabsContent>
        <TabsContent value="pending">
          <PendingCollectionTable
            onOpenCase={(caseId) =>
              setState({ tab: "collection", case: caseId })
            }
          />
        </TabsContent>
        <TabsContent value="collected">
          <CollectedSampleTable />
        </TabsContent>
      </Tabs>
    </SampleLabelPrinter>
  )
}
