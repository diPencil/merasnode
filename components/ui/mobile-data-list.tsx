"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useIsMobile } from "@/hooks/use-mobile"

export interface MobileDataListColumn<T> {
  key: string
  header: string
  render: (item: T) => React.ReactNode
  /** Label for mobile card row (e.g. "Name", "Email") */
  mobileLabel?: string
  /** Whether to hide this column on mobile cards */
  hideOnMobile?: boolean
}

export interface MobileDataListProps<T> {
  data: T[]
  columns: MobileDataListColumn<T>[]
  keyExtractor: (item: T) => string
  onRowClick?: (item: T) => void
  emptyMessage?: string
  className?: string
  /** Optional render for mobile card - overrides default card layout */
  renderMobileCard?: (item: T) => React.ReactNode
}

export function MobileDataList<T extends Record<string, unknown>>({
  data,
  columns,
  keyExtractor,
  onRowClick,
  emptyMessage = "No data",
  className,
  renderMobileCard,
}: MobileDataListProps<T>) {
  const isMobile = useIsMobile()

  if (data.length === 0) {
    return (
      <div className={cn("py-12 text-center text-muted-foreground text-sm", className)}>
        {emptyMessage}
      </div>
    )
  }

  if (isMobile) {
    return (
      <div className={cn("space-y-3", className)}>
        {data.map((item) =>
          renderMobileCard ? (
            <div key={keyExtractor(item)} onClick={() => onRowClick?.(item)}>
              {renderMobileCard(item)}
            </div>
          ) : (
            <Card
              key={keyExtractor(item)}
              className={cn(
                "overflow-hidden transition-colors",
                onRowClick && "cursor-pointer active:bg-accent/50"
              )}
              onClick={() => onRowClick?.(item)}
            >
              <CardContent className="p-4 space-y-3">
                {columns
                  .filter((col) => !col.hideOnMobile)
                  .map((col) => (
                    <div key={col.key} className="flex flex-col gap-0.5">
                      {col.mobileLabel && (
                        <span className="text-xs font-medium text-muted-foreground">
                          {col.mobileLabel}
                        </span>
                      )}
                      <div className="text-sm font-medium">{col.render(item)}</div>
                    </div>
                  ))}
              </CardContent>
            </Card>
          )
        )}
      </div>
    )
  }

  return (
    <div className={cn("overflow-x-auto -mx-4 sm:mx-0", className)}>
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((col) => (
              <TableHead key={col.key}>{col.header}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item) => (
            <TableRow
              key={keyExtractor(item)}
              className={onRowClick ? "cursor-pointer" : undefined}
              onClick={() => onRowClick?.(item)}
            >
              {columns.map((col) => (
                <TableCell key={col.key}>{col.render(item)}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
