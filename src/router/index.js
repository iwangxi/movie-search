import { createRouter, createWebHistory } from 'vue-router'
import SearchView from '../views/SearchView.vue'
import MovieDetail from '../views/MovieDetail.vue'

const routes = [
  {
    path: '/',
    name: 'search',
    component: SearchView
  },
  {
    path: '/movie/:id',
    name: 'movie-detail',
    component: MovieDetail
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

export default router 