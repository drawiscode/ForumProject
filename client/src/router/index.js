import { createRouter, createWebHistory } from 'vue-router'
import { apiFetch } from '../api/http'

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

const Search = () => import('../views/search/Search.vue')

const CommentThread = () => import('../views/comment/CommentThread.vue')
const CommentDialog = () => import('../views/comment/CommentDialog.vue')

const Messages = () => import('../views/dm/Messages.vue')
const MessagesChat = () => import('../views/dm/MessagesChat.vue')

const AdminLayout = () => import('../views/admin/AdminLayout.vue')
const AdminUsers = () => import('../views/admin/AdminUsers.vue')
const AdminPosts = () => import('../views/admin/AdminPosts.vue')
const AdminComments = () => import('../views/admin/AdminComments.vue')
const AdminBoards = () => import('../views/admin/AdminBoards.vue')
const AdminReview = () => import('../views/admin/AdminReview.vue')
const AdminAdmins = () => import('../views/admin/AdminAdmins.vue')
const AdminLogs = () => import('../views/admin/AdminLogs.vue')
const AdminProfile = () => import('../views/admin/AdminProfile.vue')

const routes = [
  { path: '/', name: 'Home', component: Home },
  { path: '/login', name: 'Login', component: Login, meta: { requiresGuest: true } },
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

  { path: '/search', name: 'Search', component: Search },

  { path: '/comment/thread/:id', name: 'comment-thread', component: CommentThread },
  { path: '/comment/dialog/:id', name: 'comment-dialog', component: CommentDialog },

  { path: '/messages', name: 'Messages', component: Messages, meta: { requiresAuth: true } },
  { path: '/messages/:uid', name: 'MessagesChat', component: MessagesChat, meta: { requiresAuth: true } },

  {
    path: '/admin',
    component: AdminLayout,
    meta: { requiresAuth: true, requiresAdmin: true },
    children: [
      { path: '', redirect: '/admin/users' },
      { path: 'users', component: AdminUsers },
      { path: 'posts', component: AdminPosts },
      { path: 'comments', component: AdminComments },
      { path: 'boards', component: AdminBoards },
      { path: 'review', component: AdminReview },
      { path: 'admins', component: AdminAdmins },
      { path: 'logs', component: AdminLogs },
      { path: 'profile', component: AdminProfile }
    ]
  }
]

function getStoredUser() {
  const raw = localStorage.getItem('af_user')
  if (!raw) return null
  try { return JSON.parse(raw) } catch { return null }
}

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach(async (to, from, next) => {
  const user = getStoredUser()

  if (to.meta?.requiresAuth && !user) {
    return next('/login')
  }

  if (to.meta?.requiresAdmin) {
    if (!user || user.role !== 'admin') return next('/')
  }

  if (to.meta?.requiresGuest && user) {
    return next('/')
  }

  if (to.path === '/admin/admins') {
    if (!user) return next('/login')
    try {
      const data = await apiFetch('/api/admin/me')
      if (!data?.admin?.is_super) {
        return next({ path: '/admin', query: { denied: 'super' } })
      }
    } catch (err) {
      return next('/login')
    }
  }

  next()
})

export default router