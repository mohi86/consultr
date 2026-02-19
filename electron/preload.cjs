const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("consultrDesktop", {
  isDesktop: true,
});
