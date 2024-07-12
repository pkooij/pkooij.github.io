import * as UIL from "uil";

var gui = null;

export function initGui() {
  gui = new UIL.Gui({ css: "h:40; w: 100; z-index: 98" });
  gui.setHeight();
}
