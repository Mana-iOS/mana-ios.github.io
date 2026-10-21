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
    nav: [{ text: "Docs", link: "/overview", activeMatch: "^/(?!$)" }],

    sidebar: [
      {
        text: "Introduction",
        items: [
          { text: "Overview", link: "/overview" },
          { text: "Getting started", link: "/getting-started" },
        ],
      },
      {
        text: "Sources",
        items: [
          { text: "Content and chapters", link: "/content" },
          { text: "Search", link: "/search" },
          { text: "Pages and links", link: "/pages" },
          { text: "Forms, preferences and setup", link: "/forms" },
          { text: "Authentication", link: "/authentication" },
          { text: "Events and sync", link: "/events" },
        ],
      },
      {
        text: "Runtime",
        items: [
          { text: "Networking", link: "/networking" },
          { text: "Images", link: "/images" },
          { text: "Crypto", link: "/crypto" },
          { text: "Storage", link: "/storage" },
          { text: "WebView pages", link: "/webview" },
        ],
      },
      {
        text: "Trackers",
        items: [{ text: "Trackers", link: "/trackers" }],
      },
      {
        text: "Reference",
        items: [
          { text: "Data model", link: "/data-model" },
          { text: "API status", link: "/status" },
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
