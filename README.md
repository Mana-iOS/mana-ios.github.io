# mana-ios.github.io

Web links that open Mana, for places that only allow `https` links (like Discord).

| Link | Opens |
|---|---|
| `https://mana-ios.github.io/add-repo/?url=<repo URL>[&name=<name>]` | `mana://add-repo?url=…&name=…` |
| `https://mana-ios.github.io/install-source/?repo=<repo URL>&id=<source id>` | `mana://install-source?repo=…&id=…` |

Percent-encode the repository URL. The query is passed to Mana unchanged; Mana checks it and asks before adding or installing anything.
