import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 transform active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 text-white shadow-[0_4px_20px_-4px_rgba(59,130,246,0.5)] hover:shadow-[0_8px_30px_-4px_rgba(59,130,246,0.6)] hover:from-blue-500 hover:via-blue-400 hover:to-cyan-400 hover:-translate-y-0.5 border border-blue-400/30",
        destructive:
          "bg-gradient-to-r from-red-600 to-rose-500 text-white shadow-[0_4px_20px_-4px_rgba(239,68,68,0.5)] hover:shadow-[0_8px_30px_-4px_rgba(239,68,68,0.6)] hover:from-red-500 hover:to-rose-400 hover:-translate-y-0.5 border border-red-400/30",
        outline:
          "border-2 border-blue-500/50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:border-blue-500 hover:shadow-[0_4px_20px_-4px_rgba(59,130,246,0.3)] hover:-translate-y-0.5",
        secondary:
          "bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-[0_4px_20px_-4px_rgba(20,184,166,0.5)] hover:shadow-[0_8px_30px_-4px_rgba(20,184,166,0.6)] hover:from-teal-400 hover:to-cyan-400 hover:-translate-y-0.5 border border-teal-400/30",
        ghost:
          "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400",
        link: "text-blue-600 dark:text-blue-400 underline-offset-4 hover:underline hover:text-blue-500",
      },
      size: {
        default: "h-11 px-6 py-2.5",
        sm: "h-9 rounded-lg px-4 text-xs",
        lg: "h-12 rounded-xl px-10 text-base",
        icon: "h-11 w-11 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
  VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
