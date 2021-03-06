import R from 'ramda';

export default class ViewportEventHandler {
  constructor(viewport, container) {
    this.viewport = viewport;
    this.enabled = true;
    this.container = container;
    this.mousedownpan = this.viewport.getPan();
    this.mousedownpos = { x: 0, y: 0 };
    this.mousedownbutton = null;
    this.handlerExtensions = {};
    this.listeners = {
      mouseup: e => this.mouseUp(e),
      mousedown: e => this.mouseDown(e),
      mousemove: e => this.mouseMove(e),
      wheel: e => this.wheel(e)
    };
    this.container.addEventListener('mouseup', this.listeners.mouseup);
    this.container.addEventListener('mousedown', this.listeners.mousedown);
    this.container.addEventListener('wheel', this.listeners.wheel);
    this.container.oncontextmenu = () => false;
  }
  setEnabled(boolean) {
    this.enabled = boolean;
  }
  getViewport() {
    return this.viewport;
  }
  withAction(methodName, fn) {
    if (fn instanceof Function) {
      if (!(this.handlerExtensions[methodName] instanceof Array)) {
        this.handlerExtensions[methodName] = [];
      }
      this.handlerExtensions[methodName].push(fn);
    }
  }
  doMouseAction(methodName, ...args) {
    let propagation = true;
    const stopPropagation = () => { propagation = false; };
    const handlers = this.handlerExtensions[methodName] || [];
    handlers.forEach((f) => {
      if (propagation) {
        f(stopPropagation, this.enabled, ...args);
      }
    });
    return this.enabled && propagation;
  }
  mouseUp() {
    this.container.removeEventListener('mousemove', this.listeners.mousemove);
    this.mousedownbutton = null;
    if (this.mouseUpAction instanceof Function) {
      this.mouseUpAction(this.mousedownpos.x, this.mousedownpos.y, this.mousedownbutton);
    }
  }
  mouseUpAction(x, y, clickCode) {
    return this.doMouseAction('mouseUpAction', x, y, clickCode);
  }
  mouseDown(event) {
    if (this.viewport.mouseIntersects()) {
      this.mousedownpos = { x: event.clientX, y: event.clientY };
      this.mousedownbutton = event.button;
      this.mousedownpan = this.viewport.getPan();
      this.container.addEventListener('mousemove', this.listeners.mousemove);
      this.mouseDownAction(this.mousedownpos.x, this.mousedownpos.y, this.mousedownbutton);
    }
  }
  mouseDownAction(x, y, clickCode) {
    return this.doMouseAction('mouseDownAction', x, y, clickCode);
  }
  mouseMove(event) {
    if (!isNaN(this.mousedownbutton)) {
      const zoom = this.viewport.getTHREECamera().zoom;
      const x = (event.clientX - this.mousedownpos.x) / Math.sqrt(zoom);
      const y = (event.clientY - this.mousedownpos.y) / Math.sqrt(zoom);
      return this.mouseMoveAction(x, y, this.mousedownbutton);
    }
    return false;
  }
  mouseMoveAction(x, y, clickCode) {
    return this.doMouseAction('mouseMoveAction', x, y, clickCode);
  }
  wheel(event) {
    if (this.viewport.mouseIntersects()) {
      const mouse = this.viewport.getMousePosReference();
      this.mouseWheelAction(event.deltaY, mouse.x, mouse.y);
    }
  }
  mouseWheelAction(deltaY, x, y) {
    return this.doMouseAction('mouseWheelAction', deltaY, x, y);
  }
  dispose() {
    R.keys(this.listeners).forEach((key) => {
      this.container.removeEventListener(key, this.listeners[key]);
    });
  }
}
