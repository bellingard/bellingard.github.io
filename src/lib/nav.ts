export const navItems = [
  { label: "About", href: "/" },
  { label: "Experience", href: "/experience" },
  { label: "Impact", href: "/impact" },
  { label: "Open source", href: "/open-source" },
  { label: "Skills", href: "/skills" },
  { label: "Publications", href: "/publications" },
  { label: "Social", href: "/social" },
] as const;

export type NavItem = (typeof navItems)[number];
