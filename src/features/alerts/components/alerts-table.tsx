import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CONDITION_LABELS } from "@/features/alerts/constants";
import { formatDate, formatPair, formatRate } from "@/lib/format";
import type { Alert } from "@/types";

interface AlertsTableProps {
  alerts: Alert[];
}

export function AlertsTable({ alerts }: AlertsTableProps) {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Pair</TableHead>
            <TableHead className="text-right">Target rate</TableHead>
            <TableHead>Condition</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="hidden sm:table-cell">Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {alerts.map((alert) => {
            const condition = CONDITION_LABELS[alert.condition];
            return (
              <TableRow key={alert.id}>
                <TableCell className="font-mono font-medium whitespace-nowrap">
                  {formatPair(alert.from_currency, alert.to_currency)}
                </TableCell>
                <TableCell className="text-right font-mono whitespace-nowrap">
                  <span className="text-muted-foreground mr-1">
                    {condition.symbol}
                  </span>
                  {formatRate(alert.target_rate)}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{condition.label}</Badge>
                </TableCell>
                <TableCell>
                  {alert.active ? (
                    <Badge>Active</Badge>
                  ) : (
                    <Badge variant="secondary">Paused</Badge>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground hidden whitespace-nowrap sm:table-cell">
                  {formatDate(alert.created_at)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
