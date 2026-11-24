"use client"

import { PlusIcon, Trash2Icon } from "lucide-react"
import { useState } from "react"
import {
  useController,
  useFieldArray,
  useFormContext,
  useWatch,
} from "react-hook-form"

import { AutocompleteInput } from "@/components/autocomplete-input"
import { focusNextField } from "@/components/form"
import { Money } from "@/components/money"
import { ReadonlyInput } from "@/components/readonly-input"
import { RequiredMark } from "@/components/required-mark"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FieldError } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatTaka } from "@/lib/format"
import {
  hasBloodBankItems,
  type InvoiceValues,
  type TestLineValues,
} from "@/modules/shared/billing/invoices/schemas"
import { testItemCategoryLabels } from "@/modules/shared/test-catalog/enums"
import { useTestItemLookup } from "@/modules/shared/test-catalog/queries"
import type { TestItem } from "@/modules/shared/test-catalog/types"

type TestLine = TestLineValues

/** Catalog rate (quantity is always 1), for the preview only. The server bills from its own catalog. */
function lineAmount(line: Partial<TestLine> | undefined): number | null {
  return line?.item ? line.item.rate : null
}

/**
 * Tests billed on the invoice. Item ID (code) and name search the catalog; the other
 * columns are read-only. Amounts preview the catalog rate; the totals are the server's.
 *
 * General and Blood Bank items may share one bill. With a Blood Bank item on it, saving also
 * opens the Blood Bank case for those items.
 */
export function InvoiceTestItemsFields() {
  const { control, formState } = useFormContext<InvoiceValues>()
  const items = useFieldArray({ control, name: "items" })
  const lines = useWatch({ control, name: "items" })
  const itemsError = formState.errors.items
  const hasBloodBank = hasBloodBankItems(lines)

  function addTest() {
    items.append(
      {},
      {
        focusName: `items.${items.fields.length}.test_item_id`,
      }
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {hasBloodBank ? (
        <p className="text-sm text-muted-foreground">
          <Badge variant="secondary" className="mr-2">
            {testItemCategoryLabels.blood_bank}
          </Badge>
          Saving opens the Blood Bank case for the Blood Bank items.
        </p>
      ) : null}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">Sl</TableHead>
            <TableHead>Department</TableHead>
            <TableHead>
              Item ID <RequiredMark />
            </TableHead>
            <TableHead>
              Item name <RequiredMark />
            </TableHead>
            <TableHead className="text-right">Rate</TableHead>
            <TableHead>Qty</TableHead>
            <TableHead>Delivery status</TableHead>
            <TableHead>Delivery time</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="w-10">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.fields.map((line, index) => (
            <TestLineRow
              key={line.id}
              index={index}
              // Tests on the other rows are not offered again; this row's own may stay.
              otherLines={lines.filter((_, other) => other !== index)}
              canRemove={items.fields.length > 1}
              isLast={index === items.fields.length - 1}
              onAdd={addTest}
              onRemove={() => items.remove(index)}
            />
          ))}
        </TableBody>
      </Table>
      <FieldError errors={[itemsError?.root ?? itemsError]} />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="self-start"
        onClick={addTest}
      >
        <PlusIcon data-icon="inline-start" />
        Add test
      </Button>
    </div>
  )
}

function testItemOption(item: TestItem) {
  return (
    <div className="flex w-full items-center gap-3">
      <div className="flex min-w-0 flex-col">
        <span className="truncate">
          <span className="font-medium">{item.code}</span> · {item.name}
        </span>
        {item.department_name ? (
          <span className="text-xs text-muted-foreground">
            {item.department_name}
          </span>
        ) : null}
      </div>
      <Money
        paisa={item.rate}
        className="ml-auto text-xs text-muted-foreground tabular-nums"
      />
    </div>
  )
}

/** The term also matches a test already on the form, so the empty list means "all added". */
function matchesPicked(lines: Partial<TestLine>[], search: string): boolean {
  const term = search.toLowerCase()
  return lines.some(
    ({ item }) =>
      item !== undefined &&
      (item.code.toLowerCase().includes(term) ||
        item.name.toLowerCase().includes(term))
  )
}

function TestLineRow({
  index,
  otherLines,
  canRemove,
  isLast,
  onAdd,
  onRemove,
}: {
  index: number
  otherLines: Partial<TestLine>[]
  canRemove: boolean
  isLast: boolean
  /** Appends a row and focuses its Item ID. */
  onAdd: () => void
  onRemove: () => void
}) {
  const { control, setValue } = useFormContext<InvoiceValues>()
  const itemPath = `items.${index}.item` as const
  const {
    field: { ref: inputRef, name: fieldName, onChange, onBlur },
    fieldState,
  } = useController({
    control,
    name: `items.${index}.test_item_id`,
  })
  const line = useWatch({ control, name: `items.${index}` })
  const item = line.item
  const [code, setCode] = useState(item?.code ?? "")
  const [itemName, setItemName] = useState(item?.name ?? "")
  // Item ID and name share one search: Enter in either runs it for that field's text.
  const [search, setSearch] = useState("")
  const lookup = useTestItemLookup(
    search,
    otherLines.flatMap(({ test_item_id }) =>
      test_item_id === undefined ? [] : [test_item_id]
    )
  )
  const nameId = `items.${index}.item.name`
  const amount = lineAmount(line)
  const rowLabel = `Test ${index + 1}`

  const listProps = {
    onSearch: (term: string) =>
      term === search ? void lookup.refetch() : setSearch(term),
    items: lookup.data,
    loading: lookup.isFetching && !lookup.data,
    error: lookup.isError,
    picked: item !== undefined,
    getKey: (option: TestItem) => String(option.id),
    renderItem: testItemOption,
    listClassName: "w-96",
    emptyText: matchesPicked(otherLines, search)
      ? "All matching tests are already added."
      : "No data found.",
    onSelect: pick,
  }

  function edit(next: { code: string; name: string }) {
    setCode(next.code)
    setItemName(next.name)
    // Typed but not picked: the row needs a test; an empty row is skipped.
    setValue(
      `items.${index}.typed`,
      next.code.trim() !== "" || next.name.trim() !== ""
    )
    if (item) {
      setValue(itemPath, undefined)
      onChange(undefined)
    }
  }

  function pick(option: TestItem) {
    setCode(option.code)
    setItemName(option.name)
    setValue(itemPath, option)
    onChange(option.id)
    // The quantity is fixed: on to the next test, adding its row after the last.
    if (isLast) {
      onAdd()
      return
    }
    const nameInput = document.getElementById(nameId)
    if (nameInput) {
      focusNextField(nameInput)
    }
  }

  return (
    <TableRow className="*:align-top hover:bg-transparent">
      <TableCell className="pt-3.5 text-muted-foreground tabular-nums">
        {index + 1}
      </TableCell>
      <TableCell className="min-w-32">
        <ReadonlyInput
          aria-label={`${rowLabel} department`}
          value={item?.department_name}
        />
      </TableCell>
      <TableCell className="min-w-28">
        <AutocompleteInput
          {...listProps}
          id={fieldName}
          ref={inputRef}
          aria-label={`${rowLabel} item ID`}
          aria-invalid={fieldState.invalid}
          value={code}
          onValueChange={(text) =>
            edit({ code: text, name: item ? "" : itemName })
          }
          onBlur={onBlur}
        />
        <FieldError errors={[fieldState.error]} className="mt-1" />
      </TableCell>
      <TableCell className="min-w-56">
        <AutocompleteInput
          {...listProps}
          id={nameId}
          aria-label={`${rowLabel} item name`}
          aria-invalid={fieldState.invalid}
          value={itemName}
          onValueChange={(text) => edit({ code: item ? "" : code, name: text })}
        />
      </TableCell>
      <TableCell className="min-w-28">
        <ReadonlyInput
          aria-label={`${rowLabel} rate`}
          className="text-right tabular-nums"
          value={item ? formatTaka(item.rate) : null}
        />
      </TableCell>
      <TableCell className="w-20 min-w-20">
        {/* Every test is billed once (`billedLines` sends 1); `<Form>` skips the box. */}
        <Input
          disabled
          aria-label={`${rowLabel} quantity`}
          className="tabular-nums"
          value={item ? "1" : ""}
        />
      </TableCell>
      <TableCell className="min-w-28">
        <ReadonlyInput
          aria-label={`${rowLabel} delivery status`}
          value={null}
        />
      </TableCell>
      <TableCell className="min-w-36">
        <ReadonlyInput aria-label={`${rowLabel} delivery time`} value={null} />
      </TableCell>
      <TableCell className="min-w-28">
        <ReadonlyInput
          aria-label={`${rowLabel} amount`}
          className="text-right tabular-nums"
          value={amount === null ? null : formatTaka(amount)}
        />
      </TableCell>
      <TableCell>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Remove test ${index + 1}`}
          disabled={!canRemove}
          onClick={onRemove}
        >
          <Trash2Icon />
        </Button>
      </TableCell>
    </TableRow>
  )
}
