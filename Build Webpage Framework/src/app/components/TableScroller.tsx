import { ReactNode } from "react";

type TableScrollerProps = {
  children: ReactNode;
  className?: string;
};

export function TableScroller({ children, className = "" }: TableScrollerProps) {
  return (
    <div className={`hud-scroll-region ${className}`} tabIndex={0}>
      {children}
    </div>
  );
}
