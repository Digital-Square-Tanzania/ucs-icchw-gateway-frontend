import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import Dashboard from '@/views/DashboardView.vue'
import Users from '@/views/UsersView.vue'
import LoginView from '@/views/LoginView.vue'
import NotFoundView from '@/views/NotFoundView.vue'
import PrimeUsersView from '@/views/UsersView.vue'
import AddUserView from '@/views/AddUserView.vue'

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
  { path: '/:pathMatch(.*)*', name: 'NotFound', component: NotFoundView }, // Catch-all 404 route
]

const router = createRouter({
  history: createWebHistory('/manager/'),
  routes,
})

// Navigation Guard for Authentication
router.beforeEach((to, from, next) => {
  const auth = useAuthStore()

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    next('/login') // Redirect to login if not authenticated
  } else {
    next() // Continue to route
  }
})

export default router
