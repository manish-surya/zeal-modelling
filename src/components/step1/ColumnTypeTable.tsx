"use client";

import { ColumnMeta, ColumnType } from "@/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const TYPE_OPTIONS: { value: ColumnType; label: string }[] = [
  { value: "numeric", label: "Numeric" },
  { value: "categorical", label: "Categorical" },
  { value: "boolean", label: "Boolean" },
  { value: "datetime", label: "DateTime" },
  { value: "text", label: "Text" },
  { value: "id", label: "ID (exclude)" },
];

const TYPE_COLORS: Record<ColumnType, string> = {
  numeric: "bg-[#D6E4F0] text-[#2E75B6]",
  categorical: "bg-[#E8F5E9] text-[#4CAF50]",
  boolean: "bg-[#FFF3E0] text-[#E67E22]",
  datetime: "bg-[#F3E5F5] text-[#9C27B0]",
  text: "bg-[#EEEEEE] text-[#666666]",
  id: "bg-[#FFEBEE] text-[#C0392B]",
};

interface ColumnTypeTableProps {
  columns: ColumnMeta[];
  onTypeChange: (name: string, type: ColumnType) => void;
}

export default function ColumnTypeTable({ columns, onTypeChange }: ColumnTypeTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#EEEEEE]">
            <th className="text-left py-2 px-3 font-medium text-[#666666]">Column</th>
            <th className="text-left py-2 px-3 font-medium text-[#666666]">Detected Type</th>
            <th className="text-left py-2 px-3 font-medium text-[#666666]">Override</th>
            <th className="text-left py-2 px-3 font-medium text-[#666666]">Cardinality</th>
            <th className="text-left py-2 px-3 font-medium text-[#666666]">Null Count</th>
          </tr>
        </thead>
        <tbody>
          {columns.map((col) => (
            <tr
              key={col.name}
              className="border-b border-[#EEEEEE] hover:bg-[#F8F9FA] transition-colors"
            >
              <td className="py-2 px-3">
                <span className="font-medium text-[#1A1A1A]">{col.name}</span>
              </td>
              <td className="py-2 px-3">
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${TYPE_COLORS[col.detected_type]}`}>
                  {col.detected_type}
                </span>
              </td>
              <td className="py-2 px-3">
                <Select
                  value={col.type}
                  onValueChange={(v) => onTypeChange(col.name, v as ColumnType)}
                >
                  <SelectTrigger className="h-7 w-36 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} className="text-xs">
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </td>
              <td className="py-2 px-3 text-[#666666]">{col.cardinality ?? "-"}</td>
              <td className="py-2 px-3 text-[#666666]">{col.null_count ?? 0}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
