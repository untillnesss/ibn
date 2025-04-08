<template>
  <div id="tree" ref="tree"></div>
</template>

<script>
import FamilyTree from '@balkangraph/familytree.js'

export default {
  name: 'family-tree',
  data() {
    return {
      nodes: [
        {
          id: 1,
          pids: [2],
          name: 'Amber McKenzie',
          gender: 'female',
          img: 'https://cdn.balkan.app/shared/2.jpg',
        },
        {
          id: 2,
          pids: [1],
          name: 'Ava Field',
          gender: 'male',
          img: 'https://cdn.balkan.app/shared/m30/5.jpg',
        },
        {
          id: 3,
          mid: 1,
          fid: 2,
          name: 'Peter Stevens',
          gender: 'male',
          img: 'https://cdn.balkan.app/shared/m10/2.jpg',
        },
        {
          id: 4,
          mid: 1,
          fid: 2,
          name: 'Savin Stevens',
          gender: 'male',
          img: 'https://cdn.balkan.app/shared/m10/1.jpg',
        },
        {
          id: 5,
          mid: 1,
          fid: 2,
          name: 'Emma Stevens',
          gender: 'female',
          img: 'https://cdn.balkan.app/shared/w10/3.jpg',
        },
      ],
    }
  },

  methods: {
    mytree: function (domEl, x) {
      this.family = new FamilyTree(domEl, {
        nodes: x,
        nodeBinding: {
          field_0: 'name',
          img_0: 'img',
        },
      })
    },
  },

  mounted() {
    this.mytree(this.$refs.tree, this.nodes)
  },
}
</script>

<style scoped></style>
