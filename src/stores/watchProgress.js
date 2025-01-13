import { defineStore } from 'pinia'

export const useWatchProgressStore = defineStore('watchProgress', {
  state: () => ({
    progressData: {}
  }),

  actions: {
    updateProgress(movieId, episodeUrl, currentTime) {
      this.progressData[`${movieId}-${episodeUrl}`] = {
        progress: currentTime,
        lastWatched: Date.now()
      }
    },

    getProgress(movieId, episodeUrl) {
      return this.progressData[`${movieId}-${episodeUrl}`]?.progress || 0
    }
  },

  persist: {
    enabled: true,
    strategies: [
      {
        key: 'watch-progress',
        storage: localStorage,
      },
    ],
  },
}) 