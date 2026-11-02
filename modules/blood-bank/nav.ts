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
      title: "Donor Examination",
      href: "/blood-bank/donor-examination",
      permission: BloodBankPermission.DonorExamView,
    },
    {
      title: "Sample Collection",
      href: "/blood-bank/sample-collection",
      permission: BloodBankPermission.SampleView,
    },
    {
      title: "Donor Serology",
      href: "/blood-bank/donor-serology",
      permission: BloodBankPermission.SerologyView,
    },
    {
      title: "Blood Collection",
      href: "/blood-bank/blood-collection",
      permission: BloodBankPermission.CollectionView,
    },
    {
      title: "Component Preparation",
      href: "/blood-bank/component-preparation",
      permission: BloodBankPermission.UnitView,
    },
    {
      title: "Donors",
      href: "/blood-bank/donors",
      permission: BloodBankPermission.DonorView,
    },
  ],
}
