import { createRouter, createWebHistory } from 'vue-router'

const Home = () => import('../views/home/Home.vue')
const Login = () => import('../views/auth/Login.vue')
const Register = () => import('../views/auth/Register.vue')
const ForgotPassword = () => import('../views/auth/ForgotPassword.vue')

const PostDetail = () => import('../views/post/PostDetail.vue')
const Publish = () => import('../views/post/Publish.vue')

const Profile = () => import('../views/user/Profile.vue')
const UserProfile = () => import('../views/user/UserProfile.vue')

const MyPosts = () => import('../views/post/MyPosts.vue')
const MyFans = () => import('../views/user/MyFans.vue')
const MyFollowing = () => import('../views/user/MyFollowing.vue')

const Settings = () => import('../views/user/Settings.vue')

const Board = () => import('../views/board/Board.vue')

const CommentThread = () => import('../views/comment/CommentThread.vue')
const CommentDialog = () => import('../views/comment/CommentDialog.vue')

const Messages = () => import('../views/dm/Messages.vue')
const MessagesChat = () => import('../views/dm/MessagesChat.vue')

const routes = [
  { path: '/', name: 'Home', component: Home },
  { path: '/login', name: 'Login', component: Login },
  { path: '/register', name: 'Register', component: Register },
  { path: '/forgot', name: 'ForgotPassword', component: ForgotPassword },
  
  { path: '/post/:id', name: 'PostDetail', component: PostDetail },

  { path: '/profile', name: 'Profile', component: Profile, meta: { requiresAuth: true } },
  { path: '/user/:id', name: 'UserProfile', component: UserProfile },
  { path: '/publish', name: 'Publish', component: Publish, meta: { requiresAuth: true } },

  { path: '/my-posts', name: 'MyPosts', component: MyPosts, meta: { requiresAuth: true } },
  { path: '/me/fans', name: 'MyFans', component: MyFans, meta: { requiresAuth: true } },
  { path: '/me/following', name: 'MyFollowing', component: MyFollowing, meta: { requiresAuth: true } },

  { path: '/settings', name: 'Settings', component: Settings, meta: { requiresAuth: true } },

  { path: '/board/:name', name: 'Board', component: Board },

  { path: '/comment/thread/:id', name: 'comment-thread', component: CommentThread },
  { path: '/comment/dialog/:id', name: 'comment-dialog', component: CommentDialog },

  { path: '/messages', name: 'Messages', component: Messages, meta: { requiresAuth: true } },
  { path: '/messages/:uid', name: 'MessagesChat', component: MessagesChat, meta: { requiresAuth: true } }
]

export default createRouter({
  history: createWebHistory(),
  routes
})