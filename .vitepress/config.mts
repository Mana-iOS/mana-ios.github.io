import { defineConfig } from "vitepress";

export default defineConfig({
  title: "Mana",
  description: "Everything you read, all in one place. Mana is a full-featured reader for manga, comics, novels and books on iPhone, iPad and Mac.",
  cleanUrls: true,
  lastUpdated: true,
  // The repository README describes the repo, not the site.
  srcExclude: ["README.md"],
  sitemap: { hostname: "https://mana-ios.github.io" },

  themeConfig: {
    nav: [{ text: "Docs", link: "/Overview", activeMatch: "^/(?!$)" }],

    sidebar: [
      {
        text: "Introduction",
        items: [
          { text: "Overview", link: "/Overview" },
          { text: "Getting started", link: "/GettingStarted" },
        ],
      },
      {
        text: "Sources",
        items: [
          { text: "Content and chapters", link: "/Content" },
          { text: "Search", link: "/Search" },
          { text: "Pages and links", link: "/Pages" },
          { text: "Forms, preferences and setup", link: "/Forms" },
          { text: "Authentication", link: "/Authentication" },
          { text: "Events and sync", link: "/Events" },
        ],
      },
      {
        text: "Runtime",
        items: [
          { text: "Networking", link: "/Networking" },
          { text: "Images", link: "/Images" },
          { text: "Crypto", link: "/Crypto" },
          { text: "Storage", link: "/Storage" },
          { text: "WebView pages", link: "/WebView" },
        ],
      },
      {
        text: "Trackers",
        items: [{ text: "Trackers", link: "/Trackers" }],
      },
      {
        text: "Reference",
        items: [
          { text: "Data model", link: "/DataModel" },
          { text: "API status", link: "/Status" },
        ],
      },
    ],

    outline: { level: [2, 3] },
    search: { provider: "local" },
    socialLinks: [
      { icon: "discord", link: "https://discord.gg/g2mHBDCpWz" },
      { icon: "github", link: "https://github.com/Mana-iOS" },
    ],

    footer: {
      message: 'Join the community on <a href="https://discord.gg/g2mHBDCpWz">Discord</a>.',
    },
  },

  markdown: {
    // ```mermaid fences render through the theme's <Mermaid> component.
    config(md) {
      const fence = md.renderer.rules.fence!;
      md.renderer.rules.fence = (tokens, index, options, env, self) => {
        const token = tokens[index];
        if (token.info.trim() === "mermaid") {
          return `<Mermaid code="${encodeURIComponent(token.content)}" />`;
        }
        return fence(tokens, index, options, env, self);
      };
    },
  },
});
