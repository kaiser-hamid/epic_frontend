import { ReceiptIcon } from "lucide-react"

import type { NavItem } from "@/modules/shared/layout/nav"
import { SharedPermission } from "@/modules/shared/rbac/permissions"

export const billingNav: NavItem = {
  title: "Billing",
  icon: ReceiptIcon,
  items: [
    {
      title: "New Bill Entry",
      href: "/billing/invoices/new",
      permission: SharedPermission.BillingCreate,
    },
    {
      title: "Bill List",
      href: "/billing/invoices",
      permission: SharedPermission.BillingView,
    },
  ],
}
