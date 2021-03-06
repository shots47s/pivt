<template>
  <div id="floating-windows" v-bind:class="dragging ? 'dragging-mode' : ''">
    <div
      class="floating-window-layer"
      v-for="application in applications"
      v-bind:key="application.getUid()"
      v-if="application.isRunning"
      v-bind:window-controller="application"
    >
      <floating-window-container
        v-for="(tool, idx) in application.getTools()"
        v-bind:key="application.getUid() + '-' + idx"
        v-if="tool.windowConfig && tool.windowConfig.widget && tool.windowConfig.open"
        v-bind:window-controller="tool"
        v-on:window-grab="dragging = true"
        v-on:window-focus="focused = idx"
        v-on:window-release="dragging = false"
        v-bind:class="windowClass(idx)"
      >
      </floating-window-container>
    </div>
  </div>
</template>

<script>
import FloatingWindowContainer from '@/components/FloatingWindowContainer';

/**
 * floating-window-manager creates a overlapping full-screen invisible
 * div on the screen for each layer and renders the current running
 * application's floating windows. The window's inner component constructor
 * is fetched out of the tool's floatingWindow attribute and drawn
 * using FloatingWindowWidget.
 */
export default {
  name: 'floating-window-manager',
  components: {
    'floating-window-container': FloatingWindowContainer
  },
  props: ['applications'],
  data() {
    return { dragging: false, focused: 0 };
  },
  methods: {
    windowClass(idx) {
      return {
        'dragging-mode': this.dragging,
        focused: this.focused === idx
      };
    }
  }
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
#floating-windows {
  pointer-events: none;
  position: absolute;
  width: 100vw;
  height: 100vh;
  z-index: 2;
}
 #floating-windows .floating-window-layer {
  pointer-events: none;
  position: absolute;
  width: 100vw;
  height: 100vh;
}
#floating-windows.dragging-mode {
  pointer-events: all;
}
#floating-windows .floating-window-layer.dragging-mode {
  pointer-events: all;
}
</style>
