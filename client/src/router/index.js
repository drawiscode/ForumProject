import { createRouter, createWebHistory } from 'vue-router'

const Home = () => import('../views/Home.vue')
const Login = () => import('../views/Login.vue')
const Register = () => import('../views/Register.vue')
const PostDetail = () => import('../views/PostDetail.vue')
const Publish = () => import('../views/Publish.vue')
const Profile =() => import('../views/Profile.vue')
const MyPosts = () => import('../views/MyPosts.vue')
const Settings = () => import('../views/Settings.vue')

const Board = () => import('../views/Board.vue')

const CommentThread = () => import('../views/CommentThread.vue')
const CommentDialog = () => import('../views/CommentDialog.vue')  

const routes = 
[
  { path: '/', name: 'Home', component: Home },
  { path: '/login', name: 'Login', component: Login },
  { path: '/register', name: 'Register', component: Register },
  { path: '/post/:id', name: 'PostDetail', component: PostDetail },

  {path: '/profile', name: 'Profile', component: Profile,meta:{ requiresAuth: true }},
  {path: '/publish', name: 'Publish', component: Publish,meta:{ requiresAuth: true }},

  { path: '/my-posts', name: 'MyPosts', component: MyPosts, meta: { requiresAuth: true } },
  { path: '/settings', name: 'Settings', component: Settings, meta: { requiresAuth: true } },

  { path: '/board/:name', name: 'Board', component: Board },

  {path: '/comment/thread/:id',name:'comment-thread',component:CommentThread},
  {path: '/comment/dialog/:id',name:'comment-dialog',component:CommentDialog}

]

export default createRouter
({
  history: createWebHistory(),
  routes
})