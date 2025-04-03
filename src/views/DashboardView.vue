<!-- src/views/DashboardView.vue -->
<template>
  <PageTitle heading="Dashboard" subtext="User Management Dashboard" />
  <div id="dash-top" class="lg:flex lg:flex-row md:flex md:flex-col md:mt-4 sm:grid sm:grid-cols-1 lg:gap-0 sm:gap-2">
    <div id="left-cards"
      class="mt-5 box-border flex flex-col gap-5 lg:grid lg:grid-cols-2 lg:w-1/2 lg:pr-2 lg:mt-0 lg:gap-4 md:grid md:grid-cols-2 md:w-full md:mt-0 md:gap-4 sm:mt-5 sm:w-1">
      <InfoCard color="green">
        <template #heading>OpenMRS Users</template>
        <template #big-number>{{ dashboardData ? formatNumber(dashboardData.openMRSUsers) : 'Loading...'
          }}</template>
        <template #percent>{{ openMRSUsersRatio ? Math.floor(openMRSUsersRatio) + '%' : 'Loading...' }}</template>
        <template #subtext>Last Sync: Mar 02, 2025</template>
        <template #icon>
          <IconUsers class="h-8 w-8 fill-gray-500 dark:fill-gray-200" />
        </template>
      </InfoCard>
      <InfoCard color="red">
        <template #heading>DHIS2 Users</template>
        <template #big-number>{{ dashboardData ? formatNumber(dashboardData.dhis2Users) : 'Loading...'
        }}</template>
        <template #percent>{{ openMRSUsersRatio ? Math.ceil(100 - openMRSUsersRatio) + '%' : 'Loading...' }}</template>
        <template #subtext>Last Sync: Mar 02, 2025</template>
        <template #icon>
          <IconUserGear class="h-8 w-8 fill-gray-500 dark:fill-gray-200" />
        </template>
      </InfoCard>
      <InfoCard color="green">
        <template #heading>All Villages</template>
        <template #big-number>{{ dashboardData ? formatNumber(dashboardData.villages) : 'Loading...' }}</template>
        <template #percent>-32</template>
        <template #subtext>Last Sync: Mar 01, 2025</template>
        <template #icon>
          <IconVillage class="h-8 w-8 fill-gray-500 dark:fill-gray-200" />
        </template>
      </InfoCard>
      <InfoCard color="red">
        <template #heading>Registered Facilities</template>
        <template #big-number>{{ dashboardData ? formatNumber(dashboardData.facilities) : 'Loading...' }}</template>
        <template #percent>+12</template>
        <template #subtext>Last Sync: Mar 03, 2025</template>
        <template #icon>
          <IconHospital class="h-8 w-8 fill-gray-500 dark:fill-gray-200" />
        </template>
      </InfoCard>
    </div>
    <div id="right-cards" class="lg:w-1/2 lg:pl-2 md:w-full">
      <div
        class="grid mt-4 lg:grid-cols-2 gap-4 md:gap-4 lg:gap-4 lg:mt-0 md:w-full md:grid-cols-2 md:mt-0 sm:grid-cols-1">
        <BigCard>
          <template #heading>UCS Teams</template>
          <template #big-number>{{ dashboardData ? formatNumber(dashboardData.ucsTeams) : 'Loading...'
          }}</template>
          <template #subtext>Active UCS Teams</template>
          <template #chart>
            <DonutChart :data-values="teamCounts" :data-labels="teamSizeCategories"
              :colors="['#64afd6', '#1a709e', '#d3e8f3']" />
          </template>
        </BigCard>

        <BigCard>
          <template #heading>Team Members</template>
          <template #big-number>{{ totalTeamMembers ? formatNumber(totalTeamMembers) : 'Loading...' }}</template>
          <template #subtext>Comprehensive Community Users</template>
          <template #chart>
            <DonutChart :data-values="teamMembersPerZone" :data-labels="zoneNames" :colors="orangeHues" />
          </template>
        </BigCard>
      </div>
    </div>
  </div>
  <div id="dash-bottom" class="flex flex-col lg:flex-row grid-cols-1 lg:grid-cols-2 gap-4 pt-4">
    <!-- <BarchartYear :userRegistrations="computedUserRegistrations" /> -->
    <BoxInfograms :user-registrations="computedUserRegistrations" />
    <LastUsersTable :last7Users="dashboardData ? dashboardData.last7Users : []" />
  </div>
</template>

<script setup lang="ts">
import InfoCard from '@/components/layout/InfoCard.vue'
import BigCard from '@/components/layout/BigCard.vue'
import IconUsers from '@/components/icons/IconUsers.vue'
import IconUserGear from '@/components/icons/IconUserGear.vue'
import IconVillage from '@/components/icons/IconVillage.vue'
import IconHospital from '@/components/icons/IconHospital.vue'
// import BarchartYear from '@/components/charts/BarchartYear.vue'
import DonutChart from '@/components/charts/DonutChart.vue'
import LastUsersTable from '@/components/tables/LastusersTable.vue'
import PageTitle from '@/components/layout/PageTitle.vue'
import { onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import ApiClient from '@/utilities/ApiClient'

import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useToast } from 'primevue/usetoast'
import BoxInfograms from '@/components/charts/BoxInfograms.vue'

interface DashboardData {
  openMRSUsers: number;
  dhis2Users: number;
  ucsTeams: number;
  villages: number;
  facilities: number;
  teamMembers: number;
  teamMembersByZone: {
    zone_name: string;
    members_count: number;
  }[];
  openMRSUsersRatio: number;
  teamSizeDistribution: {
    team_size_category: string;
    team_count: number;
  }[];
  userRegistrations: { registrations: number }[];
  last7Users: {
    id: string;
    firstName: string;
    middleName: string;
    lastName: string;
    teamName: string;
    locationName: string;
    username: string;
  }[];
  data: any
}

const dashboardData = ref<DashboardData | null>(null)
const totalTeamMembers = ref<number | null>(null)
const router = useRouter()
const toast = useToast()

onMounted(async () => {
  const authStore = useAuthStore()
  try {
    const accessToken = authStore.accessToken

    const apiClient = new ApiClient(accessToken);
    const response = await apiClient.get<DashboardData>("/dashboard/stats");

    dashboardData.value = response.data.data
    const computedTotalTeamMembers = computed<number>(() => {
      if (!dashboardData.value?.teamMembersByZone) return 0
      return dashboardData.value.teamMembersByZone.reduce((sum: number, zone_name: { members_count: number }) => sum + zone_name.members_count, 0)
    })
    totalTeamMembers.value = computedTotalTeamMembers.value

  } catch (error) {
    if ((error as any).response && (error as any).response.status === 401) {
      authStore.logout(router, toast)
      router.push({ name: 'Login' })
    } else {
      console.error('Error fetching dashboard data:', error)
    }
  }
})

function formatNumber(number: number): string {
  return new Intl.NumberFormat().format(number)
}

// Compute the ratio of OpenMRS users to DHIS2 users
const openMRSUsersRatio = computed(() => {
  if (!dashboardData.value) return 0
  return (dashboardData.value.openMRSUsers / (dashboardData.value.openMRSUsers + dashboardData.value.dhis2Users)) * 100
})

// Get team size categories
const teamSizeCategories = computed(() => {
  if (!dashboardData.value) return []
  return dashboardData.value.teamSizeDistribution.map(item => item.team_size_category)
})

// Get team size counts
const teamCounts = computed(() => {
  if (!dashboardData.value) return []
  return dashboardData.value.teamSizeDistribution.map(item => item.team_count)
})

// Get team members per zone
const teamMembersPerZone = computed(() => {
  if (!dashboardData.value) return []
  return dashboardData.value.teamMembersByZone
    .sort((a, b) => b.members_count - a.members_count)
    .map(zone => zone.members_count)
})

// Get zone names
const zoneNames = computed(() => {
  if (!dashboardData.value) return []
  return dashboardData.value.teamMembersByZone.map(zone => zone.zone_name)
})

// Make dynamic color array
const orangeHues = [
  '#FFA500', // Orange
  '#FF8C00', // Dark Orange
  '#FFD700', // Gold
  '#DAA520', // Goldenrod
  '#D2691E', // Chocolate
  '#CD853F', // Peru
  '#F4A460'  // Sandy Brown
]

// Get user registration numbers
const computedUserRegistrations = computed(() => {
  if (!dashboardData.value) return []
  return dashboardData.value.userRegistrations?.map((item) => item.registrations) || []
})

</script>
