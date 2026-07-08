import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import Dashboard from '@/views/DashboardView.vue'
import Users from '@/views/UsersView.vue'
import LoginView from '@/views/LoginView.vue'
import NotFoundView from '@/views/NotFoundView.vue'
import AddUserView from '@/views/AddUserView.vue'
import SettingsView from '@/views/SettingsView.vue'
import { SETTINGS_ROLES, type RoleName } from '@/constants/roles'

const routes = [
  {
    path: '/',
    redirect: '/dashboard', // Redirect base URL to Dashboard
  },
  {
    path: '/login',
    name: 'Login',
    component: LoginView,
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: Dashboard,
    meta: { requiresAuth: true },
  },
  {
    path: '/users',
    name: 'Users',
    component: Users,
    meta: { requiresAuth: true },
  },
  {
    path: '/adduser/:system',
    name: 'AddUser',
    component: AddUserView,
    meta: { requiresAuth: true },
    props: true, // Pass route params as props to the component
  },
  {
    path: '/settings',
    name: 'Settings',
    component: SettingsView,
    meta: { requiresAuth: true, roles: SETTINGS_ROLES as RoleName[] },
  },
  { path: '/:pathMatch(.*)*', name: 'NotFound', component: NotFoundView }, // Catch-all 404 route
]

const router = createRouter({
  history: createWebHistory('/manager/'),
  routes,
})

// Navigation Guard for Authentication & role-based routes
router.beforeEach(async (to, from, next) => {
  const auth = useAuthStore()

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    next('/login')
    return
  }

  if (to.meta.requiresAuth && auth.isAuthenticated && !auth.user) {
    await auth.fetchProfile()
  }

  const allowedRoles = to.meta.roles as RoleName[] | undefined
  if (allowedRoles?.length) {
    if (!auth.userRole || !allowedRoles.includes(auth.userRole as RoleName)) {
      next('/dashboard')
      return
    }
  }

  next()
})

export default router
