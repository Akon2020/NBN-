import { RoleScreenPlaceholder } from '@/components/role-screen-placeholder';

export default function DashboardInterneScreen() {
  return (
    <RoleScreenPlaceholder
      title="Tableau de bord"
      description="Vue d'ensemble de l'activité pour les agents et l'administration (à venir : Milestone 5)."
      showBrowseClient
      showLogout
    />
  );
}
