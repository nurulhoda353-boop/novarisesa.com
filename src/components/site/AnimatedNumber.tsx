"use client";

import { useCountUp, useInView } from "@/hooks/use-count-up";

type Props = {
  value: number;
  suffix?: string;
  prefix?: string;
  decimals?: number;
  duration?: number;
  className?: string;
};

export function AnimatedNumber({ value, suffix = "", prefix = "", decimals = 0, duration = 1800, className }: Props) {
  const { ref, visible } = useInView<HTMLSpanElement>(0.4);
  const v = useCountUp(value, visible, duration);
  const formatted = decimals > 0
    ? v.toFixed(decimals)
    : Math.floor(v).toLocaleString();
  return (
    <span ref={ref} className={className}>
      {prefix}{formatted}{suffix}
    </span>
  );
}
