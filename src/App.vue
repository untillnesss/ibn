<script setup>
import { useRoute } from 'vue-router'
import FamilyTree from './components/FamilyTree.vue'
import AccountBar from './components/AccountBar.vue'

const route = useRoute()
</script>

<template>
  <template v-if="route.path === '/'">
    <AccountBar />
    <FamilyTree />
  </template>
  <router-view v-else />
</template>

<style scoped></style>
