"use client"

import { parseAsInteger, parseAsStringLiteral, useQueryStates } from "nuqs"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { IssueTab } from "@/modules/blood-bank/blood-issue/components/issue-tab"
import { PendingBloodIssueTable } from "@/modules/blood-bank/blood-issue/components/pending-blood-issue-table"

const tabs = ["issue", "pending"] as const
type Tab = (typeof tabs)[number]

/** Issue | Pending. The tab and the loaded case are kept in the URL. */
export function BloodIssueScreen() {
  const [state, setState] = useQueryStates(
    {
      tab: parseAsStringLiteral(tabs).withDefault("issue"),
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
        <TabsTrigger value="issue">Issue</TabsTrigger>
        <TabsTrigger value="pending">Pending</TabsTrigger>
      </TabsList>
      <TabsContent value="issue">
        <IssueTab
          caseId={state.case}
          onCaseChange={(caseId) => setState({ case: caseId })}
        />
      </TabsContent>
      <TabsContent value="pending">
        <PendingBloodIssueTable
          onOpenCase={(caseId) => setState({ tab: "issue", case: caseId })}
        />
      </TabsContent>
    </Tabs>
  )
}
