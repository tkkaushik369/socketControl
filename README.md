# [Offline Demo](https://tkkaushik369.github.io/socketControl)

# Multiplayer Game

|                    Demo                     |                   Demo Debug                    |
| :-----------------------------------------: | :---------------------------------------------: |
|     ![images/demo_1.png](images/demo_1.png)     | ![images/demo_debug_1.png](images/demo_debug_1.png) |
|                  Player 1                   |                    Player 2                     |
| ![images/Player_1_1.png](images/Player_1_1.png) |   ![images/Player_2_1.png](images/Player_2_1.png)   |
|                  Electron                   |                    Electron Debug                     |
| ![images/electron_1.png](images/electron_1.png) | ![images/electron_debug_1.png](images/electron_debug_1.png) |
|                  THREE.js Editor                   |                    THREE.js Editor                     |
| ![images/editor_1.png](images/editor_1.png) | ![images/editor_3.png](images/editor_3.png) |

**Multiplayer Game** is a real-time, browser-based 3D game built with [Three.js](https://threejs.org/), [Cannon-es](https://github.com/pmndrs/cannon-es), and [Socket.io](https://socket.io/). This project demonstrates how to create an interactive multiplayer environment where players can connect, interact, and compete within a dynamic 3D world.

## Features

-   **Real-time Multiplayer**: Connect multiple players in real-time using Socket.io, enabling seamless interactions and gameplay across the globe.
-   **3D Graphics**: Powered by Three.js, the game features smooth 3D rendering with support for complex geometries, lighting, and textures.
-   **Physics Engine**: Integrates Cannon-es to simulate realistic physics, allowing for dynamic interactions and collisions between objects.
-   **Interactive Environment**: Players can move, jump, and interact with various objects in the game world.
-   **Cross-Platform Compatibility**: Play directly in your browser with no need for downloads or installations.

## Base Source Code

This project is based on the source code from swift502/[Sketchbook](https://github.com/swift502/Sketchbook) v0.4. The base code provided a solid foundation for building the mechanics and 3D environment.

# Requirements

-   Node.js v19 or higher (Using Node v22.11 as of now)

# Code Map
![images/CodeMap.svg](images/CodeMap.svg)

# Installation

```
// to install
npm install

// to build (High Resources but fast)
npm run build

// to build (High Time Build)
npm run build:nw

// to build using Turbo (Optimal Speed)
npm run build:turbo

// to build individual
npm run build:world
npm run build:worldclient
npm run build:worldserver
npm run build:client
npm run build:server
npm run build:offline

// start server
npm run start:server

// start electron server (electron-forge)
npm run start

// start server on development
npm run dev
```

# Quick Install & Build then Run

```
npm run setup
npm run start:server
```
#### `http://localhost:3000`

# Technologies Used

-   **Three.js**: For rendering 3D graphics.
-   **Cannon-es**: For physics simulation.
-   **Socket.io**: For real-time, bidirectional communication between clients and server.
-   **Node.js & Express**: Backend server setup.

### Features

#### 02th September 2025
-   Vehicles First Person Camera Lock Added
-   Teleport to Camera Lock Added, if inside vehicle it will teleports with you.
-   Race Lap Count Added (Unfinished)

#### 24th August 2025

-	@WorldClient  and @WorldServer splitted from client.ts and server.ts
-	Files can be imported to THREE.js Editor, ~~need to disable CORS in browser (use extension)~~ github pages is accessable in editor so imported from them.
	```
	// host files using
	npx serve ./dist
	```
	1. Example file in `ThreejsEditor/project.json`.
	2. Open in THREE.js Editor
	3. Select Scene > Script Tab will Show > Update Script `SB`
	4. In Project Tab Click Play

#### 21th August 2025

-   MapConfig `client/models/MapConfig.json` to load Maps
-   Character Follow Added `Check Map > Example`
-   Box and Sphere Shape Physics Added `Check Map > Example`
-   Touch Support Started

#### 10th June 2025

-   Offline Mode Added
-   Texture On/Off in Settings > Post Processing
-	Github demo page Added

#### 12th May 2025

-	Webpack Optimaization added turborepo

#### 09th May 2025

-   Grass Animation Added (Sketchbook v 0.3)

#### 22th April 2025

-   Player Attachment Bug Fix
-	Camera distance Network Update Bug Fix
-   Server Side Visualization

#### 12th April 2025

-   Re Structured Adjustments
-   Gekoes.io testing

#### 18th April 2025

-   Re Structured Workspace (No Game related changes)
-   Rapier.js raycast inconsistent results. Rapier.js skipped till finding a solution.
-   Direct webpack build usage for electron.

#### 18th January 2025

-   World Creation OneForEach Room Creation Fix (Join and Leave)
-   Bug Fix

#### 07th January 2025

-   Rapier.js test window added

#### 14th November 2024

-   Electron-Forge - { start, package, make }
    -   Used Electron-Forge Webpack-Typescript Template, Modified Webpack Plugin (./src/plugin-webpack)
-   Client and Electron Server Window (Work in progress)
    -   Server Logging in Server Window
    -   Server Debugging in Server Window (Comming soon)
-   Started React Integration

#### Till now

-   Offline and Multiplayer (Join)
-   Multiple World Maps with Different Scenarios
-   Chat (No Previous data yet)
-   Socket.io, WebSocket Communication (any one)
-   Replay: Enter `/replay` in chat to replay the game (past 15s inside world room)
-   Audio (Just Implemented as world object at origin for now)

### Todo

-   Loadout Page
-   Fix Few Syncing issues in client
-   Cannon-es to Rapier.js (Comming soon)
-   Remove Physics and Debug Related from Client and Show in Server Window

## Contributing

Contributions are welcome! If you have ideas, feature requests, or bug reports, please open an issue or submit a pull request.
