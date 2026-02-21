# Minecraft Server Manager

An Electron-based desktop application to manage and host Minecraft servers with integrated tunneling.

## Features

* **Version Management**: Fetches and downloads Minecraft Vanilla (Mojang) and Forge versions.
* **Instance Support**: Create and store multiple server configurations.
* **Integrated Tunneling**: Built-in support for Bore to expose servers to the internet without port forwarding.
* **Console Streaming**: Real-time server and tunnel logs visible within the app.
* **Resource Allocation**: Adjustable RAM (Xmx/Xms) and port settings per instance.
* **File Management**: Quick access to server directories and world regeneration.

## Tech Stack

* **Framework**: Electron, Vue 3 (Vite).
* **Styling**: Tailwind CSS.
* **Backend**: Node.js (Child Process, File System).
* **Tunneling**: Bore.

## Prerequisites

* **Node.js**: Current LTS version.
* **Java**: Required to run server JARs (version must match Minecraft requirements).

## Installation

1. Clone the repository:
```bash
git clone <repository-url>

```


2. Install dependencies:
```bash
npm install

```

## Development

Run the application in development mode:

```bash
npm run dev

```

## Production

Build the application for distribution:

```bash
npm run build

```

## Data Persistence

* **Metadata**: Configuration and server lists are stored in `servers.json` within the app's user data directory.
* **Files**: Server JARs and world data are stored in the `server_files` subdirectory.