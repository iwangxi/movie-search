import { defineStore } from 'pinia'

export const useSearchHistoryStore = defineStore('searchHistory', {
  state: () => ({
    history: []
  }),
  
  actions: {
    addSearch(query) {
      // 避免重复添加相同的搜索词
      if (!this.history.includes(query)) {
        this.history.unshift(query)
        // 只保留最近的10条记录
        if (this.history.length > 10) {
          this.history.pop()
        }
      }
    },
    
    clearHistory() {
      this.history = []
    }
  },

  persist: {
    enabled: true,
    strategies: [
      {
        key: 'search-history',
        storage: localStorage
      }
    ]
  }
}) 