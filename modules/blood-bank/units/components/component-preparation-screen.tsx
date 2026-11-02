"use client"

import { parseAsInteger, parseAsStringLiteral, useQueryStates } from "nuqs"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PendingPreparationTable } from "@/modules/blood-bank/units/components/pending-preparation-table"
import { PreparationTab } from "@/modules/blood-bank/units/components/preparation-tab"
import { UnitLabelPrinter } from "@/modules/blood-bank/units/components/unit-label-printer"
import { UnitTable } from "@/modules/blood-bank/units/components/unit-table"

const tabs = ["preparation", "pending", "units"] as const
type Tab = (typeof tabs)[number]

/** Preparation | Pending | Units. The tab and the loaded bag (case and bag ids) are kept in the URL. */
export function ComponentPreparationScreen() {
  const [state, setState] = useQueryStates(
    {
      tab: parseAsStringLiteral(tabs).withDefault("preparation"),
      case: parseAsInteger,
      bag: parseAsInteger,
    },
    { history: "replace" }
  )
  const preparation =
    state.case === null || state.bag === null
      ? null
      : { caseId: state.case, bagId: state.bag }

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
          <TabsTrigger value="preparation">Preparation</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="units">Units</TabsTrigger>
        </TabsList>
        <TabsContent value="preparation">
          <PreparationTab
            preparation={preparation}
            onBagChange={(next) =>
              setState({ case: next?.caseId ?? null, bag: next?.bagId ?? null })
            }
          />
        </TabsContent>
        <TabsContent value="pending">
          <PendingPreparationTable
            onOpenBag={(next) =>
              setState({
                tab: "preparation",
                case: next.caseId,
                bag: next.bagId,
              })
            }
          />
        </TabsContent>
        <TabsContent value="units">
          <UnitTable />
        </TabsContent>
      </Tabs>
    </UnitLabelPrinter>
  )
}
