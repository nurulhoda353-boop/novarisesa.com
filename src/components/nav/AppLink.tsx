"use client";

import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { forwardRef, type AnchorHTMLAttributes, type ReactNode } from "react";

/**
 * Drop-in replacement for TanStack Router's <Link>, backed by next/link.
 * Supports the subset of the TanStack API used across this site:
 *   - `to` (may contain path params like "/projects/$slug")
 *   - `params` (fills the `$param` tokens in `to`)
 *   - `activeProps` + `activeOptions.exact` (active-state styling)
 *   - `preload` (ignored — Next handles prefetch automatically)
 */
type ActiveProps = { className?: string };

type AppLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  to?: string;
  href?: string;
  params?: Record<string, string | number>;
  search?: Record<string, unknown>;
  hash?: string;
  activeProps?: ActiveProps;
  activeOptions?: { exact?: boolean };
  preload?: unknown;
  children?: ReactNode;
};

function buildHref(to: string, params?: Record<string, string | number>): string {
  if (!params) return to;
  return Object.entries(params).reduce(
    (acc, [key, value]) => acc.replace(`$${key}`, String(value)),
    to,
  );
}

export const Link = forwardRef<HTMLAnchorElement, AppLinkProps>(function Link(
  { to, href, params, search: _search, hash, activeProps, activeOptions, preload: _preload, className, children, ...rest },
  ref,
) {
  const pathname = usePathname();
  const base = buildHref(to ?? href ?? "#", params);
  const target = hash ? `${base}#${hash}` : base;

  const isHashOrExternal = target.startsWith("#") || /^https?:|^mailto:|^tel:/.test(target);

  let mergedClassName = className;
  if (activeProps?.className && !isHashOrExternal) {
    const isActive = activeOptions?.exact
      ? pathname === target
      : pathname === target || pathname.startsWith(`${target}/`);
    if (isActive) {
      mergedClassName = [className, activeProps.className].filter(Boolean).join(" ");
    }
  }

  if (isHashOrExternal) {
    return (
      <a ref={ref} href={target} className={mergedClassName} {...rest}>
        {children}
      </a>
    );
  }

  return (
    <NextLink ref={ref} href={target} className={mergedClassName} {...rest}>
      {children}
    </NextLink>
  );
});
