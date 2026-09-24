<script setup>
import { computed } from 'vue'
import { describeChangeDetailed } from '@/services/changeSummary'

const props = defineProps({
  item: { type: Object, required: true },
  liveById: { type: Object, default: () => ({}) },
})

const TYPE_LABELS = { add: 'Baru', update: 'Diubah', remove: 'Dihapus' }

const blocks = computed(() => describeChangeDetailed(props.item, props.liveById))
</script>

<template>
  <div v-for="(block, i) in blocks" :key="i" class="change" :class="block.type">
    <p class="heading">
      <span class="tag" :class="block.type">{{ TYPE_LABELS[block.type] }}</span>
      {{ block.heading }}
    </p>
    <p v-for="(relation, r) in block.relations" :key="`r${r}`" class="relation">
      {{ relation }}
    </p>

    <table v-if="block.rows.length" class="diff">
      <tbody>
        <tr v-for="(row, j) in block.rows" :key="j">
          <td class="label">{{ row.label }}</td>
          <template v-if="row.before !== undefined">
            <td class="before">{{ row.before }}</td>
            <td class="arrow">→</td>
          </template>
          <td class="after">{{ row.after }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.change {
  border-left: 3px solid #444;
  padding-left: 10px;
  margin-bottom: 8px;
}

.change.add {
  border-left-color: #2e9e57;
}

.change.update {
  border-left-color: #d9a520;
}

.change.remove {
  border-left-color: #d9534f;
}

.heading {
  font-weight: bold;
  margin: 0 0 4px;
}

.tag {
  display: inline-block;
  font-size: 11px;
  font-weight: bold;
  padding: 1px 8px;
  border-radius: 999px;
  margin-right: 6px;
  vertical-align: middle;
}

.tag.add {
  background: #0d4020;
  color: #5ee08a;
}

.tag.update {
  background: #5c4400;
  color: #ffcc4d;
}

.tag.remove {
  background: #4d1414;
  color: #ff7a7a;
}

.relation {
  margin: 0 0 4px;
  color: #8ab4f8;
  font-size: 13px;
}

.diff {
  border-collapse: collapse;
  font-size: 14px;
  margin-top: 4px;
}

.diff td {
  padding: 2px 8px 2px 0;
  vertical-align: top;
}

.diff .label {
  color: #aeaeae;
  white-space: nowrap;
}

.diff .before {
  color: #ff7a7a;
  text-decoration: line-through;
}

.diff .arrow {
  color: #777;
}

.diff .after {
  color: #e6e6e6;
}

.change.update .diff .before + .arrow + .after {
  color: #5ee08a;
}
</style>
