import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        draft: "border-transparent bg-[#EEEEEE] text-[#1A1A1A]",
        in_progress: "border-transparent bg-[#D6E4F0] text-[#2E75B6]",
        completed: "border-transparent bg-[#E8F5E9] text-[#4CAF50]",
        exported: "border-transparent bg-[#1B3A5C] text-white",
        training: "border-transparent bg-[#FFF3E0] text-[#E67E22] animate-pulse",
        failed: "border-transparent bg-[#FFEBEE] text-[#C0392B]",
        default: "border-transparent bg-[#EEEEEE] text-[#1A1A1A]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
