"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  createContext,
  Fragment,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { isActivePath, type NavItem } from "@/modules/shared/layout/nav"

type Crumb = { label: string; href?: string }

/** Labels pages register for raw URL segments (e.g. case id `12` → `BB-2026-0012`). */
function createLabelStore() {
  let labels: Record<string, string> = {}
  const listeners = new Set<() => void>()
  const emit = () => listeners.forEach((listener) => listener())

  return {
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    get: () => labels,
    set(segment: string, label: string) {
      labels = { ...labels, [segment]: label }
      emit()
    },
    remove(segment: string) {
      labels = { ...labels }
      delete labels[segment]
      emit()
    },
  }
}

type LabelStore = ReturnType<typeof createLabelStore>

const LabelStoreContext = createContext<LabelStore | null>(null)

export function BreadcrumbLabelProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [store] = useState(createLabelStore)
  return (
    <LabelStoreContext.Provider value={store}>
      {children}
    </LabelStoreContext.Provider>
  )
}

/**
 * Shows `label` instead of the raw URL `segment` in the breadcrumb while the
 * calling component is mounted. Pass `undefined` until the record has loaded.
 */
export function useBreadcrumbLabel(segment: string, label: string | undefined) {
  const store = useContext(LabelStoreContext)

  useEffect(() => {
    if (!store || !label) {
      return
    }
    store.set(segment, label)
    return () => store.remove(segment)
  }, [store, segment, label])
}

const segmentLabels: Record<string, string> = {
  new: "New",
  edit: "Edit",
}

function humanize(segment: string): string {
  if (segmentLabels[segment]) {
    return segmentLabels[segment]
  }
  if (/^\d+$/.test(segment)) {
    return `#${segment}`
  }
  const words = decodeURIComponent(segment).replace(/[-_]+/g, " ")
  return words.charAt(0).toUpperCase() + words.slice(1)
}

/** Module → page (from the nav config) → remaining URL segments. */
export function buildCrumbs(
  pathname: string,
  navItems: NavItem[],
  labels: Record<string, string> = {}
): Crumb[] {
  if (pathname === "/") {
    const home = navItems.find((item) => item.href === "/")
    return [{ label: home?.title ?? "Dashboard" }]
  }

  const crumbs: Crumb[] = []
  let consumed = ""

  const match = navItems
    .flatMap((item) => (item.items ?? []).map((subItem) => ({ item, subItem })))
    .filter(({ subItem }) => isActivePath(pathname, subItem.href))
    .sort((a, b) => b.subItem.href.length - a.subItem.href.length)[0]

  if (match) {
    crumbs.push({ label: match.item.title })
    crumbs.push({ label: match.subItem.title, href: match.subItem.href })
    consumed = match.subItem.href
  } else {
    const direct = navItems.find(
      (item) =>
        item.href && item.href !== "/" && isActivePath(pathname, item.href)
    )
    if (direct?.href) {
      crumbs.push({ label: direct.title, href: direct.href })
      consumed = direct.href
    }
  }

  let href = consumed
  for (const segment of pathname.slice(consumed.length).split("/")) {
    if (!segment) {
      continue
    }
    href = `${href}/${segment}`
    crumbs.push({ label: labels[segment] ?? humanize(segment), href })
  }

  const last = crumbs.at(-1)
  if (last) {
    crumbs[crumbs.length - 1] = { label: last.label }
  }
  return crumbs
}

const noLabels: Record<string, string> = {}
const noopSubscribe = () => () => {}

export function AppBreadcrumbs({ navItems }: { navItems: NavItem[] }) {
  const pathname = usePathname()
  const store = useContext(LabelStoreContext)
  const labels = useSyncExternalStore(
    store?.subscribe ?? noopSubscribe,
    store?.get ?? (() => noLabels),
    () => noLabels
  )
  const crumbs = buildCrumbs(pathname, navItems, labels)

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {crumbs.map((crumb, index) => {
          // Phones show only the current page and its parent.
          const hideOnMobile = index < crumbs.length - 2
          return (
            <Fragment key={`${index}-${crumb.label}`}>
              {index > 0 ? (
                <BreadcrumbSeparator
                  className={hideOnMobile ? "hidden md:block" : undefined}
                />
              ) : null}
              <BreadcrumbItem
                className={hideOnMobile ? "hidden md:block" : undefined}
              >
                {crumb.href ? (
                  <BreadcrumbLink asChild>
                    <Link href={crumb.href}>{crumb.label}</Link>
                  </BreadcrumbLink>
                ) : index === crumbs.length - 1 ? (
                  <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                ) : (
                  <span>{crumb.label}</span>
                )}
              </BreadcrumbItem>
            </Fragment>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
