import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: "LinkDen",
      url: "/",
      transparentMode: "top",
    },
    githubUrl: "https://github.com/mrdemonwolf/linkden",
    links: [{ text: "Docs", url: "/docs" }],
    themeSwitch: { enabled: true, mode: "light-dark-system" },
    searchToggle: { enabled: true },
  };
}
