import { ReceiptIcon } from "lucide-react"

import type { NavItem } from "@/modules/shared/layout/nav"
import { SharedPermission } from "@/modules/shared/rbac/permissions"

export const billingNav: NavItem = {
  title: "Billing",
  icon: ReceiptIcon,
  items: [
    {
      title: "New Invoice Entry",
      href: "/billing/invoices/new",
      permission: SharedPermission.BillingCreate,
    },
    {
      title: "Invoice list",
      href: "/billing/invoices",
      permission: SharedPermission.BillingView,
    },
  ],
}
