three 0.186.1, vendored from jsDelivr (MIT, see LICENSE).
Files: build/three.module.min.js, build/three.core.min.js, examples/jsm/environments/RoomEnvironment.js, examples/jsm/geometries/RoundedBoxGeometry.js.
One patch: three.module.min.js imports "./three.core.min.js" instead of the unminified "./three.core.js" to keep the transfer small. Re-apply when upgrading.
