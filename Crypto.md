# Crypto

Types: [CipherSpec](DataModel.md#crypto)

Mana decrypts for you, quickly, including large images. There are two entry points:

| Use | When |
|---|---|
| `response.decrypt(cipher, { contentType? })` | The encrypted data is a response body (images, documents). The bytes never enter JavaScript. |
| `Crypto.decrypt(cipher, bytes)` | You already hold the bytes (an encrypted JSON blob, a page list). |

```ts
import { Cipher, CipherPadding, Crypto, Key, KeyHash, parseSalted } from "@mana-app/types";
```

## Ciphers

### AES-CBC

```ts
const cipher = Cipher.aesCbc({ key, iv });                                      // PKCS7 padding
const zeroPadded = Cipher.aesCbc({ key, iv, padding: CipherPadding.Zero });     // strips trailing zeros
const raw = Cipher.aesCbc({ key, iv, padding: CipherPadding.None });

const image = await response.decrypt(cipher);
```

### AES-CTR

```ts
const cipher = Cipher.aesCtr({ key, counter: iv });                 // counter: the first 16-byte counter block
const wide = Cipher.aesCtr({ key, counter: iv, length: 128 });      // low bits that count blocks (default 64), as in WebCrypto
```

### AES-GCM

```ts
// `iv` is 12 bytes or more; `payload` is the ciphertext followed by its 16-byte tag.
const cipher = Cipher.aesGcm({ key, iv, additionalData: headerBytes });
const json = JSON.parse(Buffer.from(await Crypto.decrypt(cipher, payload)).toString("utf8"));
```

A wrong key or tampered data rejects with an `OperationError` instead of returning garbage.

### XOR

```ts
const cipher = Cipher.xor({ key });                        // whole body, key repeats
const header = Cipher.xor({ key, limit: 64 });             // only the first 64 bytes
const skip = Cipher.xor({ key, offset: 16 });              // leave the first 16 bytes as they are
```

AES keys are 16, 24 or 32 bytes; CBC and CTR IVs are 16 bytes. All keys, IVs and data are `Uint8Array`s.

## Keys

### From a passphrase (CryptoJS / OpenSSL)

`CryptoJS.AES.decrypt(text, "passphrase")` output starts with `Salted__`. Split it and derive the key and IV:

```ts
const data = Buffer.from(encryptedText, "base64");
const { salt, ciphertext } = parseSalted(data);
const { key, iv } = await Key.fromPassphrase("passphrase", salt);           // keySize 32 by default
const plain = await Crypto.decrypt(Cipher.aesCbc({ key, iv }), ciphertext);
```

Use `{ keySize: 16 }` or `24` for AES-128 or AES-192.

### PBKDF2

```ts
const key = await Key.pbkdf2({
  password: "secret",
  salt,
  iterations: 10_000,
  hash: KeyHash.Sha256,    // Sha1, Sha256, Sha512
  length: 32,              // bytes
});
```

## End-to-end: encrypted chapter

```ts
async getChapterData(contentId: string, chapterId: string): Promise<ChapterData> {
  const meta = await (await this.http.get(`/api/chapter/${chapterId}`)).requireOk().json<{ data: string; pass: string }>();

  const { salt, ciphertext } = parseSalted(Buffer.from(meta.data, "base64"));
  const { key, iv } = await Key.fromPassphrase(meta.pass, salt);
  const list = await Crypto.decrypt(Cipher.aesCbc({ key, iv }), ciphertext);

  const urls: string[] = JSON.parse(Buffer.from(list).toString("utf8"));
  return { pages: urls.map((url) => ({ url })) };
}
```

When `contentType` is omitted, `response.decrypt` detects common image types from the decrypted bytes.
