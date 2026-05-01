# 🔥 M3U8 Proxy Server (Node.js + Express)

A lightweight **M3U8/HLS proxy server** built with Node.js and Express.  
It rewrites playlist URLs and forwards requests with optional custom headers, making it easier to bypass CORS restrictions and stream protected HLS content.

---

## 🚀 Features

- Proxy `.m3u8` playlists
- Supports AES-128 key URLs (`URI`)
- Rewrites segment URLs automatically
- Supports custom request headers (Referer, Origin, etc.)
- Streams video segments efficiently
- Built with Express + Axios

---

## 📦 Installation

```console
git clone https://github.com/JulzOhern/Gogoanime-and-Hianime-proxy.git
npm install
```

## ▶️ Run Locally

```console
npm run dev
```

## 📡 Usage

### Proxy an M3U8 URL
```console
http://localhost:4040/m3u8-proxy?url=YOUR_M3U8_URL
```

### Example
```console
http://localhost:4040/m3u8-proxy?url=https://example.com/master.m3u8
```

### 🧩 With Custom Headers
```console
http://localhost:4040/m3u8-proxy?url=YOUR_M3U8_URL&headers={"Referer":"https://example.com/"}
```

---

## ⚙️ How It Works

1. Fetches the .m3u8 playlist
2. Parses each line
3. Rewrites: Segment URLs, Key URIs (AES-128)
4. Proxies all media requests through the server












