"use client";

import { useCountUp, useInView } from "@/hooks/use-count-up";
import { useEditMode } from "@/components/cms/EditModeContext";

type Props = {
  value: number;
  suffix?: string;
  prefix?: string;
  decimals?: number;
  duration?: number;
  className?: string;
  /** Translation path for the raw number — omit to leave it non-editable in pen mode. */
  field?: string;
};

export function AnimatedNumber({ value, suffix = "", prefix = "", decimals = 0, duration = 1800, className, field }: Props) {
  const { ref, visible } = useInView<HTMLSpanElement>(0.4);
  const { editing } = useEditMode();
  const v = useCountUp(value, visible, duration);
  const formatted = decimals > 0
    ? v.toFixed(decimals)
    : Math.floor(v).toLocaleString();

  // Pen mode: swap the animated, comma-formatted number for the raw editable
  // value — editing the formatted/animating text directly isn't reliable.
  if (editing && field) {
    const raw = decimals > 0 ? value.toFixed(decimals) : String(value);
    return (
      <span ref={ref} className={className}>
        {prefix}
        <span data-cms-field={field} suppressContentEditableWarning>{raw}</span>
        {suffix}
      </span>
    );
  }

  return (
    <span ref={ref} className={className}>
      {prefix}{formatted}{suffix}
    </span>
  );
}
