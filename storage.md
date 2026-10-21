# Storage

Two global key/value stores keep data between launches. Both are scoped to your source (and to each instance when `allowsMultipleInstances` is on), and both store any JSON value.

| Store | Kept in | Synced | In Mana backups | Use for |
|---|---|---|---|---|
| `ObjectStore` | Mana's app preferences on the device | No | Only when the user includes "Sensitive source data" | Settings, caches, IDs, timestamps |
| `SecureStore` | iOS Keychain | Yes, through iCloud Keychain | No | Tokens, passwords, API keys |

```mermaid
flowchart LR
    %% title: Where values are stored
    %% subtitle: Each store is scoped to the source instance · values are saved as JSON text

    subgraph Src[class Target]
        OS["ObjectStore.set(key, value)"]
        SS["SecureStore.set(key, value)"]
    end

    OS -->|JSON text| Pref["App preferences<br/><small>sourceId · key</small>"]
    SS -->|JSON text| KC["iOS Keychain<br/><small>sourceId · key</small>"]
    Pref -.->|opt-in| Backup["Mana backup<br/><small>Sensitive source data</small>"]
    KC -.->|iCloud Keychain| Devices["User's other devices"]

    class Src,OS,SS source
    class Pref,KC mana
    class Backup,Devices external
```

Values stay when the source is updated or uninstalled, so a reinstalled source finds its old settings and tokens. Clear what you no longer need with `remove`.

## API

```ts
// Write any JSON value.
await ObjectStore.set("lastSync", Date.now());
await ObjectStore.set("session", { token: "abc", expires: 1767225600 });
await SecureStore.set("password", "hunter2");

// Read. Returns null when missing.
const session = (await ObjectStore.get("session")) as { token: string; expires: number } | null;

// Remove.
await ObjectStore.remove("session");

// Typed reads: throw if the stored value has another type.
const token = await SecureStore.string("token");             // string | null
const nsfw = await ObjectStore.boolean("nsfw");              // boolean | null
const page = await ObjectStore.number("page");               // number | null
const languages = await ObjectStore.stringArray("languages"); // string[] | null
```

Every call is a round trip to Mana: the value is turned into JSON text in JavaScript, stored as text, and parsed again when read.

```mermaid
sequenceDiagram
    %% title: Writing and reading a value
    %% subtitle: Values cross to Mana as JSON text and are parsed again in JavaScript
    autonumber
    participant S as Source (JS)
    participant M as Mana
    participant P as App preferences

    S->>S: JSON.stringify({ token: "abc" })
    S->>M: ObjectStore.set("session", text)
    M->>P: Save under sourceId · session
    M-->>S: resolves
    S->>M: ObjectStore.get("session")
    M->>P: Read sourceId · session
    P-->>M: JSON text
    M-->>S: text
    S->>S: JSON.parse → { token: "abc" }
    Note over S,P: SecureStore works the same way, with the Keychain instead of app preferences
```

The typed reads check the parsed value. They return `null` for falsy values too (`false`, `0`, `""`):

```mermaid
flowchart LR
    %% title: Typed reads
    %% subtitle: string(), boolean(), number() and stringArray()

    Read["store.boolean(key)"] --> Stored{"Stored and<br/>truthy?"}
    Stored -->|no| Null["null<br/><small>also for false · 0 · empty string</small>"]
    Stored -->|yes| Type{"Right type?"}
    Type -->|yes| Value["The value"]
    Type -->|no| Throw["Throws<br/><small>type assertion failed</small>"]

    class Read source
    class Null muted
    class Value good
    class Throw bad
```

For settings that can be `false` or `0`, use `get` with a default:

```ts
const nsfw = ((await ObjectStore.get("nsfw")) as boolean | null) ?? true;
```

## Patterns

### Typed settings

```ts
const DEFAULTS = { nsfw: false, quality: "high", languages: ["en"] };
type Settings = typeof DEFAULTS;

async function setting<K extends keyof Settings>(key: K): Promise<Settings[K]> {
  return ((await ObjectStore.get(key)) as Settings[K] | null) ?? DEFAULTS[key];
}

const quality = await setting("quality");
```

### Cache with expiry

```mermaid
flowchart LR
    %% title: Cache with expiry
    %% subtitle: Serve from ObjectStore while fresh · otherwise load and save

    Call["cached(key, ttl, load)"] --> Hit{"Stored and<br/>younger than ttl?"}
    Hit -->|yes| Cached["Stored value"]
    Hit -->|no| Load["load()<br/><small>HttpClient</small>"] --> Save["ObjectStore.set<br/><small>{ at, value }</small>"] --> Fresh["New value"]

    class Call,Load,Save source
    class Cached,Fresh good
```

```ts
async function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const entry = (await ObjectStore.get(key)) as { at: number; value: T } | null;
  if (entry && Date.now() - entry.at < ttlMs) return entry.value;

  const value = await load();
  await ObjectStore.set(key, { at: Date.now(), value });
  return value;
}

const genres = await cached("genres", 24 * 60 * 60 * 1000, () => this.fetchGenres());
```

### Token storage

```ts
async function saveTokens(t: { access: string; refresh: string; expiresIn: number }) {
  await SecureStore.set("tokens", { ...t, expiresAt: Date.now() + t.expiresIn * 1000 });
}

async function accessToken(): Promise<string | null> {
  const t = (await SecureStore.get("tokens")) as { access: string; expiresAt: number } | null;
  return t && t.expiresAt > Date.now() ? t.access : null;
}
```

Keep the stored shape small: each `get` reads and parses the whole value.
