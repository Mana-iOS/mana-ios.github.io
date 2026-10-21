# Images

Types: [ImageRequest](data-model.md#networking), [RedrawWithSizeCommand](data-model.md#redraw)

By default Mana downloads cover and page URLs itself, without calling your source. Add a transport when images need headers, cookies, a rate limit or decryption.

```mermaid
flowchart LR
    %% title: Image loading
    %% subtitle: Mana fetches URLs itself unless your source provides a transport

    URL["Cover or page URL<br/><small>from your results</small>"] --> T{"Transport<br/>method?"}
    T -->|no| Native["Mana downloads<br/><small>directly</small>"]
    T -->|yes| Source

    subgraph Source[Your HttpClient]
        direction TB
        ReqI["Request interceptors<br/><small>headers · referer</small>"] --> Fetch["Download"] --> ResI["Response interceptors<br/><small>decrypt · replace</small>"]
    end

    Native --> Show["Image shown<br/><small>cached by URL</small>"]
    Source --> Show
    Show --> R{"Redraw?"}
    R -->|yes| Redraw["Tiles moved<br/><small>redrawImageWithSize()</small>"]

    class URL,Native,Show mana
    class Source,ReqI,ResI source
    class Fetch external
    class Redraw good
```

## Transports

```ts
import { HttpClient, RequestOrigin, type ImageRequest } from "@mana-app/types";

private readonly http = new HttpClient()
  .setBaseURL("https://example.org")
  .setRateLimit(6, 1_000)
  .addRequestInterceptor((request, context) => {
    if (context.origin !== RequestOrigin.General) {
      request.headers.set("Referer", "https://example.org/");
    }
    return request;
  });

// Covers in search results, home rows and the library.
getCoverTransport(request: ImageRequest): HttpClient {
  return this.http;
}

// Reader pages and chapter downloads.
getPageTransport(request: ImageRequest): HttpClient {
  return this.http;
}
```

- Implement only the ones you need: a source whose covers load fine should skip `getCoverTransport` so covers never start your source.
- Return a long-lived client. A new client per call starts a fresh rate limiter each time.
- `request.url` and `request.origin` (`RequestOrigin.Cover` or `RequestOrigin.Page`) are available if you want separate clients.

```ts
private readonly cdn = new HttpClient().setRateLimit(20, 1_000);

getPageTransport(request: ImageRequest): HttpClient {
  return request.url.includes("cdn.example.org") ? this.cdn : this.http;
}
```

Images are cached by URL. If one URL can produce different images, put the distinguishing value in the URL (a query or [fragment](networking.md#fragment-parameters)).

## Decrypting or changing images

Use a response interceptor. Check `context.origin` so API responses are left alone.

```ts
import { Cipher, RequestOrigin } from "@mana-app/types";

this.http.addResponseInterceptor(async (response, context) => {
  if (context.origin !== RequestOrigin.Page) return response;

  // Key travels with the URL fragment from getChapterData (never sent to the server).
  const key = Buffer.from(response.request.fragmentParams.key, "hex");
  return response.decrypt(Cipher.xor({ key }));     // image type is detected
});
```

```ts
async getChapterData(contentId: string, chapterId: string): Promise<ChapterData> {
  const json = await (await this.http.get(`/api/chapter/${chapterId}`)).requireOk().json<any>();
  return { pages: json.pages.map((p: any) => ({ url: `${p.url}#key=${p.key}` })) };
}
```

To edit bytes yourself (slower, the image passes through JavaScript):

```ts
this.http.addResponseInterceptor(async (response, context) => {
  if (context.origin !== RequestOrigin.Page) return response;
  const bytes = await response.bytes();
  return response.withBody(stripHeader(bytes), { contentType: "image/webp" });
});
```

See [Crypto](crypto.md) for all ciphers.

## Where the bytes go

Image bytes normally stay in Mana's native memory: your source only handles a reference to the body. They are copied into the JavaScript runtime only when your code reads them (`bytes()`, `arrayBuffer()`, `base64()`, `text()`) or returns them (`withBody()`, `raw`).

```mermaid
flowchart LR
    %% title: Where image bytes live
    %% subtitle: Native memory by default · JavaScript only when you read or return bytes yourself

    Web[("Website")] --> Body["Response body<br/><small>held natively</small>"]
    Body -->|reference only| Show["Image shown<br/><small>cached by URL</small>"]
    Body --> Decrypt["Native decrypt<br/><small>response.decrypt()</small>"] --> Show

    subgraph JS[Source · JavaScript runtime]
        direction LR
        Bytes["Uint8Array<br/><small>response.bytes()</small>"] --> Transform["Your transform"] --> Out["withBody(bytes)"]
        Raw["base64 string<br/><small>ChapterPage.raw</small>"]
    end

    Body -.->|copy in| Bytes
    Out -.->|copy out| Show
    Body -.->|copy in as text| Raw
    Raw -.->|decode| Show

    class Body,Decrypt mana
    class JS source
    class Bytes,Transform,Out,Raw copy
    class Web external
    class Show good
```

| Case | Source runs? | Bytes enter JavaScript? | Cost |
|---|---|---|---|
| [No transport](#no-transport) | No | No | Cheapest |
| [Transport, headers only](#transport-with-headers) | Yes | No | One JavaScript call per image |
| [Native decryption](#native-decryption) | Yes | No | Decryption runs natively |
| [Reading bytes](#reading-and-replacing-bytes) | Yes | Yes, copied in and out | Two copies plus your JavaScript work |
| [Document](#documents) | Yes, once per chapter | No | One download, opened natively |
| [Inline `raw` pages](#inline-raw-pages) | Yes | Yes, as base64 text | Largest: text is about a third bigger than the image |

### No transport

The source has no `getCoverTransport` / `getPageTransport`, so Mana loads the URL itself and your JavaScript never starts for images.

```mermaid
sequenceDiagram
    %% title: Case 1 · No transport
    %% subtitle: Mana downloads the URL itself · your source is never called
    autonumber
    actor U as User
    participant M as Mana
    participant S as Source (JS)
    participant N as Mana network
    participant W as Website

    U->>M: Scroll the library
    M->>M: No getCoverTransport on this source
    M->>N: GET cover URL
    N->>W: Request with Mana's cookies
    W-->>N: Image bytes
    N-->>M: Bytes stay native
    M-->>U: Cover shown · cached by URL
    Note over S: Not started for this image
```

### Transport with headers

A request interceptor adds headers; the image comes back as a reference and is handed straight to Mana. Chapter downloads take the same path.

```mermaid
sequenceDiagram
    %% title: Case 2 · Transport, bytes stay native
    %% subtitle: Interceptors change the request · the image itself never enters JavaScript
    autonumber
    actor U as User
    participant M as Mana
    participant S as Source (JS)
    participant N as Mana network
    participant W as Website

    U->>M: Open a chapter
    M->>S: getPageTransport({ url, origin: Page })
    S-->>M: your HttpClient
    S->>S: Request interceptors add Referer
    S->>N: Fetch through the rate limiter
    N->>W: GET page image
    W-->>N: Image bytes
    N-->>S: Body reference · status · headers
    S->>S: Response interceptors · requireOk()
    S-->>M: Hand off the body reference
    M-->>U: Page shown · cached by URL
    Note over S,N: Only metadata crosses into JavaScript
```

### Native decryption

`response.decrypt(cipher)` asks Mana to decrypt the body where it is held. JavaScript only sends the cipher spec.

```mermaid
sequenceDiagram
    %% title: Case 3 · Native decryption
    %% subtitle: The key goes to Mana · the encrypted bytes never enter JavaScript
    autonumber
    actor U as User
    participant M as Mana
    participant S as Source (JS)
    participant N as Mana network
    participant W as Website

    U->>M: Open a chapter
    M->>S: getPageTransport(request)
    S->>N: Fetch page URL · key in fragment
    N->>W: GET (fragment not sent)
    W-->>N: Encrypted bytes
    N-->>S: Body reference
    S->>S: Read key from fragmentParams
    S->>N: response.decrypt(Cipher.xor({ key }))
    N->>N: Decrypt in native memory
    N-->>S: New body reference · type sniffed
    S-->>M: Hand off the decrypted body
    M-->>U: Page shown
```

### Reading and replacing bytes

Calling `response.bytes()` copies the image into JavaScript (a `Uint8Array`; base64 text under WebKit). Returning `withBody(newBytes)` copies the result back once. Use this only when no [native cipher](crypto.md) fits.

```mermaid
sequenceDiagram
    %% title: Case 4 · Bytes loaded into the runtime
    %% subtitle: Two copies across the bridge plus your JavaScript work, for every image
    %% legend: copy
    %% region: copy | Bytes in JavaScript
    autonumber
    actor U as User
    participant M as Mana
    participant S as Source (JS)
    participant N as Mana network
    participant W as Website

    U->>M: Open a chapter
    M->>S: getPageTransport(request)
    S->>N: Fetch
    N->>W: GET page image
    W-->>N: Image bytes
    N-->>S: Body reference
    S->>N: response.bytes()
    rect rgba(217, 70, 239, 0.14)
        Note over S,N: Bytes in JavaScript
        N-->>S: Copy of the bytes · Uint8Array
        S->>S: Transform in JavaScript
        S->>N: withBody(newBytes) · uploaded once
    end
    N-->>S: New body reference
    S-->>M: Hand off the new body
    M-->>U: Page shown
```

### Documents

A CBZ, EPUB, PDF or text file returned as `ChapterData.document` is handed to Mana as a native body when `getChapterData` finishes.

```mermaid
sequenceDiagram
    %% title: Case 5 · Document handed to the app
    %% subtitle: One download per chapter · Mana opens the file natively
    autonumber
    actor U as User
    participant M as Mana
    participant S as Source (JS)
    participant N as Mana network
    participant W as Website

    U->>M: Open a chapter
    M->>S: getChapterData(contentId, chapterId)
    S->>N: http.get("/download/12.cbz")
    N->>W: GET archive
    W-->>N: Archive bytes
    N-->>S: HttpResponse · body reference
    S-->>M: { document: response }
    M->>N: Adopt the native body
    M->>M: Open CBZ / EPUB / PDF
    M-->>U: Reader opens
```

### Inline raw pages

Pages returned as `raw` base64 strings pass through JavaScript as text and are decoded by Mana. Prefer `url` with a transport where you can.

```mermaid
sequenceDiagram
    %% title: Case 6 · Inline raw pages
    %% subtitle: The whole image crosses into JavaScript and back as base64 text
    %% legend: copy
    %% region: copy | Bytes in JavaScript
    autonumber
    actor U as User
    participant M as Mana
    participant S as Source (JS)
    participant N as Mana network
    participant W as Website

    U->>M: Open a chapter
    M->>S: getChapterData(contentId, chapterId)
    S->>N: http.get(page)
    N->>W: GET page image
    W-->>N: Image bytes
    N-->>S: Body reference
    S->>N: response.base64()
    rect rgba(217, 70, 239, 0.14)
        Note over M,N: Bytes in JavaScript
        N-->>S: base64 text
        S-->>M: { pages: [{ raw }] }
    end
    M->>M: Decode base64 into an image
    M-->>U: Page shown
```

## Descrambling tiles

For sites that cut pages into shuffled tiles. Both methods are required.

```mermaid
flowchart LR
    %% title: Tile descrambling
    %% subtitle: You return rects; Mana copies them into a new canvas

    A["Scrambled image<br/><small>800 × 1200</small>"] -->|"redrawImageWithSize()"| B["Copy commands<br/><small>source rect → destination rect</small>"]
    B --> C["Restored image"]

    class A bad
    class B source
    class C good
```

```ts
import type { BooleanState, CGSize, RedrawWithSizeCommand } from "@mana-app/types";

async shouldRedrawImage(url: string): Promise<BooleanState> {
  return { state: url.includes("/scrambled/") };
}

async redrawImageWithSize(size: CGSize): Promise<RedrawWithSizeCommand> {
  const columns = 4;
  const rows = 4;
  const w = Math.floor(size.width / columns);
  const h = Math.floor(size.height / rows);
  const order = [5, 2, 9, 0, 14, 7, 1, 12, 3, 10, 6, 15, 8, 13, 4, 11]; // site's tile order

  return {
    size,
    commands: order.map((from, to) => ({
      source: { origin: { x: (from % columns) * w, y: Math.floor(from / columns) * h }, size: { width: w, height: h } },
      destination: { origin: { x: (to % columns) * w, y: Math.floor(to / columns) * h }, size: { width: w, height: h } },
    })),
  };
}
```

`redrawImageWithSize` only receives the image size, so the tile order must not depend on the URL. If it does, decrypt or rearrange in a [response interceptor](#decrypting-or-changing-images) instead.
