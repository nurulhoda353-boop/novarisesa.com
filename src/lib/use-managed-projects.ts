"use client";

import { useMemo } from "react";
import { allProjects, type Project } from "./projects-data";
import { useCmsContent } from "./cms-content";

export function useManagedProjects(): Project[] {
  const { collections } = useCmsContent();
  return useMemo(() => {
    const managed = collections.projects ?? [];
    if (!managed.length) return allProjects;
    return managed.map((item, index) => {
      const fallback = allProjects.find((project) => project.slug === item.slug);
      return {
        key: fallback?.key ?? item.slug,
        slug: item.slug,
        img:
          (typeof item.data.featured_media_url === "string" && item.data.featured_media_url) ||
          fallback?.img ||
          "/assets/project-civil.jpg",
        rank: item.sort_order || index + 1,
        featured: item.is_featured,
      };
    });
  }, [collections.projects]);
}
