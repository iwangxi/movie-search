<template>
  <div v-if="movieDetails" class="min-h-screen flex flex-col bg-[#18171d]">
    <!-- 顶部导航 -->
    <div class="h-14 bg-[#18171d] border-b border-[#2b2b2b] px-4 flex items-center xl:fixed xl:top-0 xl:left-0 xl:right-0 xl:z-50">
      <div class="flex items-center space-x-6">
        <h1 class="text-white font-medium">{{ movieDetails.name }}</h1>
      </div>
    </div>

    <!-- 主要内容区域 -->
    <div class="flex-1 flex flex-col xl:flex-row xl:h-screen">
      <!-- 左侧：播放器区域 -->
      <div class="xl:w-[80%] bg-black h-[400px] xl:h-[calc(100vh-3.5rem)] fixed top-0 left-0 right-0 z-50 xl:fixed xl:top-14 xl:left-0 xl:right-[20%]">
        <div class="w-full h-full">
          <div v-if="!currentPlayUrl" class="w-full h-full flex items-center justify-center text-gray-400">
            请选择剧集开始播放
          </div>
          <div v-show="currentPlayUrl" ref="artplayerRef" class="w-full h-full"></div>
        </div>
      </div>

      <!-- 右侧：信息和选集 -->
      <div class="xl:w-[20%] flex flex-col h-[calc(100vh-3.5rem)] bg-[#18171d] border-l border-[#2b2b2b] mt-[400px] xl:mt-14 xl:ml-auto">
        <!-- 影片信息 -->
        <div class="p-4 border-b border-[#2b2b2b]">
          <!-- 影片名称 -->
          <h2 class="text-white text-lg font-medium">{{ movieDetails.name }}</h2>
          <div class="flex items-center gap-2 mb-3">
            <div class="flex items-center text-[#00be06]">
              <el-rate
                v-model="movieDetails.douban_score"
                :max="10"
                disabled
                text-color="#ff9900"
                score-template="{value}"
              />
              <span class="ml-2">{{ movieDetails.douban_score || '暂无' }}分</span>
            </div>
          </div>
          <div class="space-y-2 text-sm">
            <p class="text-gray-400">{{ movieDetails.pubdate }} · {{ movieDetails.area }}</p>
            <p class="text-gray-400">{{ movieDetails.class }}</p>
          </div>
          
          <div class="mt-4">
            <p class="text-sm text-gray-400 leading-relaxed line-clamp-3 hover:line-clamp-none cursor-pointer" v-html="movieDetails.content"></p>
          </div>
        </div>

        <!-- 选集 -->
        <div class="flex-1 flex flex-col min-h-0">
          <div class="p-4 border-b border-[#2b2b2b]">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="text-white">选集</span>
                <el-dropdown trigger="click" @command="handleGroupChange">
                  <span class="text-xs text-gray-400 cursor-pointer hover:text-white">
                    {{ currentGroup }} <el-icon class="ml-1"><ArrowDown /></el-icon>
                  </span>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item
                        v-for="group in episodeGroups"
                        :key="group"
                        :command="group"
                        :class="{'text-[#00be06]': currentGroup === group}"
                      >
                        {{ group }}
                      </el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </div>
              <div class="text-xs text-gray-400">
                更新至{{ movieDetails.play_url?.length || 0 }}集
              </div>
            </div>
          </div>
          
          <div class="flex-1 overflow-y-auto">
            <div class="grid grid-cols-4 gap-2 p-4">
              <button
                v-for="episode in currentEpisodes"
                :key="episode.link"
                @click="playVideo(episode.link)"
                class="h-8 text-xs rounded transition-colors border border-[#2b2b2b]"
                :class="currentPlayUrl === episode.link ? 
                  'bg-[#00be06] text-white border-[#00be06]' : 
                  'text-gray-400 hover:border-[#00be06]'"
              >
                {{ episode.title }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useEventListener } from '@vueuse/core'
import { ArrowLeft, ArrowDown } from '@element-plus/icons-vue'
import axios from 'axios'
import Artplayer from 'artplayer'
import Hls from 'hls.js'
import { useWatchProgressStore } from '../stores/watchProgress'

const route = useRoute()
const router = useRouter()
const movieDetails = ref(null)
const currentPlayUrl = ref('')
const artplayer = ref(null)
const artplayerRef = ref(null)

// 分组相关
const groupSize = 50 // 每组显示的剧集数
const currentGroup = ref('1-50')

// 计算所有分组
const episodeGroups = computed(() => {
  if (!movieDetails.value?.play_url) return []
  const total = movieDetails.value.play_url.length
  const groups = []
  for (let i = 0; i < total; i += groupSize) {
    const groupStart = i + 1
    const groupEnd = Math.min(i + groupSize, total)
    groups.push(`${groupStart}-${groupEnd}`)
  }
  return groups
})

// 计算当前分组的剧集
const currentEpisodes = computed(() => {
  if (!movieDetails.value?.play_url) return []
  const [groupStart, groupEnd] = currentGroup.value.split('-').map(Number)
  return movieDetails.value.play_url.slice(groupStart - 1, groupEnd)
})

// 切换分组
const handleGroupChange = (group) => {
  currentGroup.value = group
}

// 获取影片详情
const fetchMovieDetails = async () => {
  try {
    const { data } = await axios.get(`https://v.vpsaz.cn/api/ysss/`, {
      params: {
        y: route.query.y,
        id: route.params.id
      }
    })
    movieDetails.value = data
  } catch (error) {
    console.error('获取详情失败:', error)
    ElMessage.error('获取影片详情失败')
  }
}

// 添加 store 实例
const watchProgressStore = useWatchProgressStore()

// 播放视频
const playVideo = async (url) => {
  currentPlayUrl.value = url
  
  if (artplayer.value) {
    artplayer.value.destroy()
  }

  // 获取保存的进度
  const savedProgress = watchProgressStore.getProgress(route.params.id, url)

  artplayer.value = new Artplayer({
    container: artplayerRef.value,
    url,
    type: 'm3u8',
    title: movieDetails.value?.name,
    poster: movieDetails.value?.pic,
    volume: 0.7,
    isLive: false,
    muted: false,
    autoplay: false,
    pip: true,
    autoSize: true,
    autoMini: true,
    screenshot: true,
    setting: true,
    hotkey: true,
    lock: true,
    playbackRate: true,
    aspectRatio: true,
    fullscreen: true,
    fullscreenWeb: true,
    subtitleOffset: true,
    miniProgressBar: true,
    playsInline: true,
    loop: true,
    autoOrientation: true,
    layers: [
      {
        name: 'playbackRecord',
        html: `
          <div class="art-layer-playback-record" style="display: none;">
            <div class="art-auto-playback-last">上次看到 ${Math.floor(savedProgress / 60)}:${String(Math.floor(savedProgress % 60)).padStart(2, '0')}</div>
            <div class="art-auto-playback-jump">继续播放</div>
            <div class="art-auto-playback-close">
              <i class="art-icon art-icon-close">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </i>
            </div>
          </div>
        `,
        style: {
          position: 'absolute',
          bottom: '60px',
          left: '20px',
          zIndex: 30,
        },
      },
    ],
    customType: {
      m3u8: function (video, url) {
        if (Hls.isSupported()) {
          const hls = new Hls()
          hls.loadSource(url)
          hls.attachMedia(video)
          
          this.hls = hls
          this.destroy = function () {
            if (this.hls) {
              this.hls.destroy()
              this.hls = null
            }
          }
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = url
        }
      },
    },
  })

  // 在播放器初始化后设置事件监听
  artplayer.value.on('ready', () => {
    if (savedProgress > 0) {
      const $layer = artplayer.value.template.$layer;
      const $record = $layer.querySelector('.art-layer-playback-record');
      
      if ($record) {
        $record.style.display = 'flex';
        
        // 使用 events.proxy 来代理点击事件
        artplayer.value.events.proxy($record.querySelector('.art-auto-playback-jump'), 'click', () => {
          artplayer.value.seek = savedProgress;
          artplayer.value.play();
          $record.style.display = 'none';
        });

        artplayer.value.events.proxy($record.querySelector('.art-auto-playback-close'), 'click', () => {
          $record.style.display = 'none';
        });

        // 视频开始播放后自动隐藏提示
        artplayer.value.once('video:timeupdate', () => {
          setTimeout(() => {
            $record.style.display = 'none';
          }, 5000);
        });
      }
    }
  });

  // 每 5 秒保存一次
  artplayer.value.on('video:timeupdate', () => {
    const currentTime = artplayer.value.currentTime;
    if (Math.floor(currentTime) % 5 === 0 && currentTime > 0) {
      watchProgressStore.updateProgress(
        route.params.id,
        currentPlayUrl.value,
        currentTime
      );
    }
  });
}

// 响应式处理
useEventListener('resize', () => {
  if (artplayer.value) {
    artplayer.value.resize()
  }
})

onMounted(() => {
  fetchMovieDetails()
})

onBeforeUnmount(() => {
  if (artplayer.value) {
    artplayer.value.destroy()
  }
})
</script>

<style>
.art-video-player {
  @apply w-full h-full;
}

.el-rate {
  --el-rate-star-color: #646464;
  --el-rate-star-size: 12px;
  height: auto;
  line-height: 1;
}

.el-dropdown-menu {
  @apply !bg-[#18171d] !border-[#2b2b2b];
}

.el-dropdown-menu__item {
  @apply !text-gray-400 hover:!bg-[#2b2b2b] hover:!text-white;
}

.el-dropdown-menu__item.text-\\[\\#00be06\\] {
  @apply !text-[#00be06];
}

/* 自定义滚动条 */
::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-track {
  background: #18171d;
}

::-webkit-scrollbar-thumb {
  background: #2b2b2b;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: #363636;
}

@media (max-width: 1280px) {
  .art-video-player {
    aspect-ratio: 16/9;
  }
}

.art-auto-playback-last {
  color: rgba(255, 255, 255, 0.8);
}

.art-auto-playback-jump {
  color: #00be06;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 2px;
  transition: background-color 0.3s;
}

.art-auto-playback-jump:hover {
  background: rgba(0, 190, 6, 0.1);
}

.art-auto-playback-close {
  cursor: pointer;
  opacity: 0.8;
  transition: opacity 0.3s;
}

.art-auto-playback-close:hover {
  opacity: 1;
}

.art-layer-playback-record {
  background: rgba(0, 0, 0, 0.8);
  border-radius: 4px;
  padding: 12px;
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}
</style> 