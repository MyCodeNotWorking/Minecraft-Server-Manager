import { createRouter, createWebHashHistory } from 'vue-router'
import Home from '../views/Home.vue'
import ServerPanel from '../views/ServerPanel.vue'
import ServerGeneral from '../components/ServerPanel/Menus/General/General.vue'
import ServerMods from '../components/ServerPanel/Menus/Mods.vue'
import ServerWorld from '../components/ServerPanel/Menus/World.vue'
import ServerBackups from '../components/ServerPanel/Menus/Backups.vue'

const routes = [
  { path: '/', component: Home },

  {
    path: '/serverpanel',
    component: ServerPanel,
    children: [
      { path: 'general', component: ServerGeneral, name: 'ServerGeneral' },
      { path: 'mods', component: ServerMods, name: 'ServerMods' },
      { path: 'world', component: ServerWorld, name: 'ServerWorld' },
      { path: 'backups', component: ServerBackups, name: 'ServerBackups' },
      { path: '', redirect: { name: 'ServerGeneral' } } // default to General
    ]
  }
]

const router = createRouter({
  history: createWebHashHistory(), // keeps your Electron app safe
  routes
})

export default router
