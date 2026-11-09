"use client"

import { PlusIcon, Trash2Icon } from "lucide-react"
import { useState } from "react"
import {
  Controller,
  useController,
  useFieldArray,
  useFormContext,
  useWatch,
} from "react-hook-form"

import { AutocompleteInput } from "@/components/autocomplete-input"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { focusNextField } from "@/components/form"
import { Money } from "@/components/money"
import { NumberInput } from "@/components/number-input"
import { ReadonlyInput } from "@/components/readonly-input"
import { RequiredMark } from "@/components/required-mark"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FieldError } from "@/components/ui/field"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { lookupEmptyText, useLookupTerm } from "@/hooks/use-lookup-term"
import { formatTaka } from "@/lib/format"
import {
  invoiceCategory,
  type InvoiceValues,
  type TestLineValues,
} from "@/modules/shared/billing/invoices/schemas"
import { TestItemCategory } from "@/modules/shared/test-catalog/enums"
import { useTestItemLookup } from "@/modules/shared/test-catalog/queries"
import type { TestItem } from "@/modules/shared/test-catalog/types"

type TestLine = TestLineValues

/** Catalog rate × quantity, for the preview only. The server bills from its own catalog. */
function lineAmount(line: Partial<TestLine> | undefined): number | null {
  return line?.item && line.quantity ? line.item.rate * line.quantity : null
}

/** A Blood Bank item picked while other items are on the bill, waiting for confirmation. */
type PendingSwitch = { apply: () => void; removeIndexes: number[] }

/**
 * Tests billed on the invoice. Item ID (code) and name search the catalog; the other
 * columns are read-only. Amounts preview the catalog rate; the totals are the server's.
 *
 * A bill is either general or Blood Bank, never both. Picking the first Blood Bank item while
 * other items are listed asks to remove them; once a Blood Bank item is on the bill, the
 * search offers Blood Bank items only. Removing the last one makes it a general bill again.
 */
export function InvoiceTestItemsFields() {
  const { control, formState } = useFormContext<InvoiceValues>()
  const items = useFieldArray({ control, name: "items" })
  const lines = useWatch({ control, name: "items" })
  const itemsError = formState.errors.items
  const isBloodBank = invoiceCategory(lines) === TestItemCategory.BloodBank
  const [pendingSwitch, setPendingSwitch] = useState<PendingSwitch | null>(null)

  function addTest() {
    items.append({ quantity: 1 } as TestLine, {
      focusName: `items.${items.fields.length}.test_item_id`,
    })
  }

  /** Every row but `index` holding a general item: what a Blood Bank pick would remove. */
  function generalRowsBesides(index: number): number[] {
    return lines.flatMap((line, other) =>
      other !== index &&
      line.item !== undefined &&
      line.item.category !== TestItemCategory.BloodBank
        ? [other]
        : []
    )
  }

  function confirmPick(index: number, option: TestItem, apply: () => void) {
    const removeIndexes =
      option.category === TestItemCategory.BloodBank
        ? generalRowsBesides(index)
        : []
    if (removeIndexes.length === 0) {
      apply()
      return
    }
    setPendingSwitch({ apply, removeIndexes })
  }

  const removeCount = pendingSwitch?.removeIndexes.length ?? 0

  return (
    <div className="flex flex-col gap-4">
      {isBloodBank ? (
        <p className="text-sm text-muted-foreground">
          <Badge variant="secondary" className="mr-2">
            Blood Bank bill
          </Badge>
          Only Blood Bank items can be added. Saving opens the Blood Bank case.
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
            <TableHead>
              Qty <RequiredMark />
            </TableHead>
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
              category={isBloodBank ? TestItemCategory.BloodBank : undefined}
              onPick={(option, apply) => confirmPick(index, option, apply)}
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
      <ConfirmDialog
        open={pendingSwitch !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingSwitch(null)
          }
        }}
        title="Make this a Blood Bank bill?"
        description={`Blood Bank items are billed on their own. ${
          removeCount === 1
            ? "The other item on this bill will be removed."
            : `The ${removeCount} other items on this bill will be removed.`
        }`}
        confirmLabel="Remove and continue"
        destructive
        onConfirm={() => {
          if (pendingSwitch) {
            pendingSwitch.apply()
            items.remove(pendingSwitch.removeIndexes)
          }
          setPendingSwitch(null)
        }}
      />
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
  category,
  onPick,
  canRemove,
  isLast,
  onAdd,
  onRemove,
}: {
  index: number
  otherLines: Partial<TestLine>[]
  /** Narrows the search (a Blood Bank bill offers Blood Bank items only). */
  category: TestItemCategory | undefined
  /** Runs `apply` (puts the pick on the row) now, or after the user confirms removing others. */
  onPick: (option: TestItem, apply: () => void) => void
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
  // Item ID and name share one term: the last edited of the two.
  const lookupTerm = useLookupTerm()
  const lookup = useTestItemLookup(
    lookupTerm.search,
    otherLines.flatMap(({ test_item_id }) =>
      test_item_id === undefined ? [] : [test_item_id]
    ),
    category
  )
  const nameId = `items.${index}.item.name`
  const amount = lineAmount(line)
  const rowLabel = `Test ${index + 1}`

  const listProps = {
    items: lookup.data,
    loading: lookupTerm.waiting || lookup.isFetching,
    getKey: (option: TestItem) => String(option.id),
    renderItem: testItemOption,
    listClassName: "w-96",
    emptyText: lookupEmptyText(
      { tooShort: lookupTerm.tooShort, isError: lookup.isError },
      matchesPicked(otherLines, lookupTerm.search)
        ? "All matching tests are already added."
        : "No matching tests."
    ),
    onSelect: pick,
  }

  function edit(next: { code: string; name: string }, typed: string) {
    setCode(next.code)
    setItemName(next.name)
    lookupTerm.setTerm(typed)
    if (item) {
      setValue(itemPath, undefined)
      onChange(undefined)
    }
  }

  function pick(option: TestItem) {
    lookupTerm.setTerm("")
    onPick(option, () => {
      setCode(option.code)
      setItemName(option.name)
      setValue(itemPath, option)
      onChange(option.id)
      // On to the quantity.
      const nameInput = document.getElementById(nameId)
      if (nameInput) {
        focusNextField(nameInput)
      }
    })
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
            edit({ code: text, name: item ? "" : itemName }, text)
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
          onValueChange={(text) =>
            edit({ code: item ? "" : code, name: text }, text)
          }
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
        <Controller
          name={`items.${index}.quantity`}
          control={control}
          render={({ field: quantity, fieldState: quantityState }) => (
            <>
              <NumberInput
                id={quantity.name}
                name={quantity.name}
                ref={quantity.ref}
                value={quantity.value}
                onChange={quantity.onChange}
                onBlur={quantity.onBlur}
                max={999}
                // Enter goes to the next row's Item ID, or adds a row after the last.
                data-enter-key="native"
                onKeyDown={(event) => {
                  if (
                    event.key !== "Enter" ||
                    event.nativeEvent.isComposing ||
                    event.altKey ||
                    event.ctrlKey ||
                    event.metaKey ||
                    event.shiftKey
                  ) {
                    return
                  }
                  event.preventDefault()
                  if (isLast) {
                    onAdd()
                  } else {
                    document
                      .getElementById(`items.${index + 1}.test_item_id`)
                      ?.focus()
                  }
                }}
                aria-label={`${rowLabel} quantity`}
                aria-invalid={quantityState.invalid}
              />
              <FieldError errors={[quantityState.error]} className="mt-1" />
            </>
          )}
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
