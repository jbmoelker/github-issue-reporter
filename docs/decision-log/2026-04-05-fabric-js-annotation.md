# Fabric.js for Screenshot Annotation

**We've decided to use [Fabric.js](http://fabricjs.com/) as the canvas library for the screenshot annotation editor.**

- Date: 2026-04-05
- Alternatives Considered: Plain Canvas 2D API, Konva.js, Excalidraw (embedded), SVG-based approach
- Decision Made By: [Jasper](https://github.com/jbmoelker), [Claude (AI)](https://github.com/claude)

## Decision

The annotation editor needs to support a set of interactive drawing tools — text, filled and outlined rectangles, blur rectangles, and arrows — where each placed annotation can be selected, moved, resized, and deleted after creation. This requires an object model on top of the canvas, not just pixel drawing.

**Plain Canvas 2D API**

Drawing with Canvas 2D is straightforward, but hit-testing, selection handles, drag-to-resize, and z-ordering for multiple overlapping objects require significant custom code. Maintaining an object graph, rendering order, and interaction state by hand would be hundreds of lines of low-level canvas work.

**Konva.js**

Konva provides a similar object model (shapes as first-class objects with events). The API and documentation are good, but Fabric.js has a wider adoption, more active community, and built-in text editing (`IText` with cursor, selection, and inline editing) which is a core requirement.

**Excalidraw (embedded)**

Excalidraw is a full-featured diagramming tool that can be embedded as a React component. It is significantly heavier (large bundle), opinionated in its UI and interactions, and would be difficult to trim down to the specific subset of tools needed here.

**Fabric.js (chosen)**

Fabric.js provides exactly the right abstraction level:

- An object model (`Rect`, `IText`, `Group`, `Line`, `Triangle`) where each object is selectable, movable, and resizable out of the box via built-in handles.
- Built-in `IText` with cursor, text selection, and keyboard editing.
- `canvas.loadFromJSON()` / `canvas.toJSON()` for serialising the full canvas state, enabling undo/redo and persistence.
- `canvas.toDataURL()` for flattening annotations to a bitmap on submission.

The blur rectangle tool (which shows a semi-transparent placeholder during editing and applies real CSS blur at export time) required custom logic regardless of library. Fabric.js's object model made it straightforward to tag custom properties on objects (`__blurRect`, `__blurAmount`) and process them at export time.

Fabric.js v6 (the version used) is an ES module release with improved TypeScript types over v5.
