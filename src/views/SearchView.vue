<template>
  <div class="w-full min-h-screen px-4 sm:px-6">
    <div class="max-w-[1200px] w-full mx-auto space-y-6">
      <!-- 搜索栏 -->
      <div class="flex flex-col sm:flex-row gap-4">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="请输入影片名称"
          class="w-full px-4 py-2 rounded-lg border border-gray-200 
                 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
        />
        <div class="flex gap-4">
          <select
            v-model="selectedSource"
            class="w-28 px-4 py-2 rounded-lg border border-gray-200 
                   focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option v-for="i in 5" :key="i" :value="i">片源{{ i }}</option>
          </select>
          <button
            @click="searchMovies"
            class="w-24 px-6 py-2 bg-primary text-white rounded-lg transition-colors
                   hover:bg-primary/90 focus:outline-none focus:ring-2 
                   focus:ring-primary focus:ring-offset-2"
          >
            搜索
          </button>
        </div>
      </div>

      <!-- 搜索历史 -->
      <div v-if="searchHistoryStore.history.length" class="space-y-4">
        <div class="flex justify-between items-center">
          <h3 class="text-lg font-medium">搜索历史</h3>
          <button
            @click="searchHistoryStore.clearHistory"
            class="text-sm text-gray-500 hover:text-primary"
          >
            清空历史
          </button>
        </div>
        <div class="flex flex-wrap gap-2">
          <span
            v-for="item in searchHistoryStore.history"
            :key="item"
            @click="useHistoryItem(item)"
            class="px-3 py-1 bg-gray-100 rounded-full text-sm cursor-pointer
                   hover:bg-gray-200 transition-colors"
          >
            {{ item }}
          </span>
        </div>
      </div>

      <!-- 搜索结果 -->
      <div v-if="searchResults.length" 
           class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
        <div
          v-for="movie in searchResults"
          :key="movie.vod_id"
          @click="showDetails(movie.vod_id)"
          class="group cursor-pointer bg-white rounded-lg overflow-hidden shadow-sm
                 hover:shadow-md transition-shadow duration-300"
        >
          <div class="relative aspect-[3/4]">
            <div v-if="!movie.pic" class="absolute inset-0 bg-gray-200 flex items-center justify-center">
              <div class="animate-pulse text-gray-400">加载中...</div>
            </div>
            <img
              v-if="movie.pic"
              :src="movie.pic"
              :alt="movie.vod_name"
              class="absolute inset-0 w-full h-full object-cover"
              @error="handleImageError"
            />
            <div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100
                        transition-opacity duration-300 flex items-center justify-center">
              <span class="text-white">点击查看详情</span>
            </div>
          </div>
          <div class="p-4 space-y-2">
            <h3 class="font-medium truncate">{{ movie.vod_name }}</h3>
            <p class="text-sm text-gray-500">{{ movie.vod_remarks }}</p>
            <p class="text-xs text-gray-400">{{ movie.type_name }}</p>
          </div>
        </div>
      </div>

      <!-- 无结果提示 -->
      <div v-else-if="hasSearched" class="text-center py-12 text-gray-500">
        未找到相关影片
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useSearchHistoryStore } from '../stores/searchHistory'
import axios from 'axios'

const router = useRouter()
const searchHistoryStore = useSearchHistoryStore()
const searchQuery = ref('')
const selectedSource = ref(1)
const searchResults = ref([])
const hasSearched = ref(false)

const searchMovies = async () => {
  if (!searchQuery.value) return
  
  // 添加到搜索历史
  searchHistoryStore.addSearch(searchQuery.value)
  
  try {
    const { data } = await axios.get(`https://v.vpsaz.cn/api/ysss/`, {
      params: {
        y: selectedSource.value,
        wd: searchQuery.value
      }
    })
    console.log('搜索结果:', data)
    
    // 先显示基本信息
    searchResults.value = (data.list || []).map(movie => ({
      ...movie,
      pic: null // 初始化封面为null
    }))
    hasSearched.value = true

    // 异步加载每个电影的封面
    searchResults.value.forEach(async (movie, index) => {
      try {
        const detailResponse = await axios.get(`https://v.vpsaz.cn/api/ysss/`, {
          params: {
            y: selectedSource.value,
            id: movie.vod_id
          }
        })
        // 更新单个电影的封面
        searchResults.value[index] = {
          ...searchResults.value[index],
          pic: detailResponse.data.pic
        }
      } catch (error) {
        console.error('获取电影封面失败:', error)
        // 设置默认封面为本地图片
        searchResults.value[index] = {
          ...searchResults.value[index],
          pic: '/cover.jpg'
        }
      }
    })
  } catch (error) {
    console.error('搜索失败:', error)
    ElMessage.error('搜索失败，请稍后重试')
  }
}

const useHistoryItem = (query) => {
  searchQuery.value = query
  searchMovies()
}

const showDetails = (movieId) => {
  router.push({
    name: 'movie-detail',
    params: { id: movieId },
    query: { y: selectedSource.value }
  })
}

const handleImageError = (e) => {
  // 使用本地默认封面
  e.target.src = '/cover.jpg'
}
</script> 