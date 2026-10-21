# mana-ios.github.io

Source for [mana-ios.github.io](https://mana-ios.github.io): the Mana website and source API docs, plus web links that open Mana.

## Web links

Links that open Mana, for places that only allow `https` links (like Discord).

| Link | Opens |
|---|---|
| `https://mana-ios.github.io/add-repo/?url=<repo URL>[&name=<name>]` | `mana://add-repo?url=…&name=…` |
| `https://mana-ios.github.io/install-source/?repo=<repo URL>&id=<source id>` | `mana://install-source?repo=…&id=…` |

Percent-encode the repository URL. The query is passed to Mana unchanged; Mana checks it and asks before adding or installing anything. These pages live in `public/` and are published as-is.

## Docs

The site is built with [VitePress](https://vitepress.dev). Pages are the Markdown files in the repository root.

```sh
npm install
npm run dev       # live preview
npm run build     # static site in .vitepress/dist
```

Pushing to `main` builds and deploys the site with GitHub Actions.
