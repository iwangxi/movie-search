<template>
  <div class="app-container">
    <el-container>
      <el-header v-if="!isDetailPage">
        <h1>影视搜索</h1>
      </el-header>
      <el-main>
        <router-view></router-view>
      </el-main>
    </el-container>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const isDetailPage = computed(() => route.name === 'movie-detail')
</script>

<style>
.el-header {
  text-align: center;
  padding: 10px 0;
}

.el-main {
  --el-main-padding: 5px 0 0 0;
}
</style> 