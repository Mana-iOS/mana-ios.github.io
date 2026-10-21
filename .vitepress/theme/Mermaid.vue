<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useData } from "vitepress";
import { decorate, legendFor, mermaidConfig } from "./mermaidTheme";

const props = defineProps<{ code: string }>();

const { isDark } = useData();
const svg = ref("");
const error = ref("");
const dialog = ref<HTMLDialogElement>();

const source = computed(() => decodeURIComponent(props.code));

// `%% title: …` and `%% subtitle: …` comments become the card header.
function directive(name: string): string | undefined {
  return new RegExp(`^\\s*%%\\s*${name}:\\s*(.+)$`, "m").exec(source.value)?.[1].trim();
}

const title = computed(() => directive("title"));
const subtitle = computed(() => directive("subtitle"));
const legend = computed(() => legendFor(source.value));

let renders = 0;

async function render() {
  const { default: mermaid } = await import("mermaid");
  // Labels are sized from the loaded font; measuring a fallback font clips them.
  await document.fonts.load('600 13px "JetBrains Mono Variable"');
  await document.fonts.ready;

  const id = `mana-mermaid-${Math.random().toString(36).slice(2)}-${++renders}`;
  mermaid.initialize(mermaidConfig(isDark.value));

  try {
    const result = await mermaid.render(id, source.value);
    svg.value = decorate(result.svg, source.value);
    error.value = "";
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
  }
}

onMounted(render);
watch(isDark, render);
</script>

<template>
  <figure class="mana-diagram" :class="{ 'is-loading': !svg && !error }">
    <header v-if="title" class="mana-diagram__header">
      <span class="mana-diagram__dot" />
      <div>
        <div class="mana-diagram__title">{{ title }}</div>
        <div v-if="subtitle" class="mana-diagram__subtitle">{{ subtitle }}</div>
      </div>
    </header>

    <button
      v-if="svg"
      class="mana-diagram__expand"
      type="button"
      title="Expand diagram"
      aria-label="Expand diagram"
      @click="dialog?.showModal()"
    >
      <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
        <path
          d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </button>

    <div v-if="svg" class="mana-diagram__canvas" v-html="svg" />
    <pre v-else-if="error" class="mana-diagram__error">{{ error }}</pre>

    <footer v-if="svg && legend.length" class="mana-diagram__legend">
      <span class="mana-diagram__legend-title">Legend</span>
      <span v-for="item in legend" :key="item.name" class="mana-diagram__legend-item">
        <span class="mana-diagram__swatch" :class="`is-${item.name}`" />
        {{ item.label }}
      </span>
    </footer>

    <dialog v-if="svg" ref="dialog" class="mana-diagram__dialog" @click.self="dialog?.close()">
      <header v-if="title" class="mana-diagram__header">
        <span class="mana-diagram__dot" />
        <div>
          <div class="mana-diagram__title">{{ title }}</div>
          <div v-if="subtitle" class="mana-diagram__subtitle">{{ subtitle }}</div>
        </div>
      </header>
      <button class="mana-diagram__close" type="button" aria-label="Close" @click="dialog?.close()">
        ✕
      </button>
      <div class="mana-diagram__canvas mana-diagram__canvas--large" v-html="svg" />
    </dialog>
  </figure>
</template>
