import { DropletIcon } from "lucide-react"

import { BloodBankPermission } from "@/modules/blood-bank/permissions"
import type { NavItem } from "@/modules/shared/layout/nav"

export const bloodBankNav: NavItem = {
  title: "Blood Bank",
  icon: DropletIcon,
  items: [
    {
      title: "Cases",
      href: "/blood-bank/cases",
      permission: BloodBankPermission.CaseView,
    },
    {
      title: "Sample Collection",
      href: "/blood-bank/sample-collection",
      permission: BloodBankPermission.SampleView,
    },
    {
      title: "Donors",
      href: "/blood-bank/donors",
      permission: BloodBankPermission.DonorView,
    },
    
  ],
}
