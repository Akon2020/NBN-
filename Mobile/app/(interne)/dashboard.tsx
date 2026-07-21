import { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getDashboardStats, type DashboardStats, type RecentActivityEntry } from '@/lib/dashboard';
import { getAllProperties, PROPERTY_TYPE_LABELS, type Property } from '@/lib/properties';
import { getAllClients, CLIENT_TYPE_LABELS, type Client } from '@/lib/clients';
import { getAllMissions, SERVER_MISSION_TYPE_LABELS, SERVER_MISSION_STATUT_LABELS, type ServerMission } from '@/lib/missionsAdmin';
import { getAllRequisitions, REQUISITION_STATUT_LABELS, type Requisition } from '@/lib/requisitions';
import { getAllCaisses, CAISSE_STATUT_LABELS, type Caisse } from '@/lib/caisses';
import { getAllCommissions, COMMISSION_STATUT_LABELS, type Commission } from '@/lib/commissions';
import { getUsersDirectory, type UserDirectoryEntry } from '@/lib/directory';
import { logout } from '@/lib/auth';
import { StatDetailModal, DetailRow } from '@/components/stat-detail-modal';
import { APP_COLORS, APP_RADIUS } from '@/constants/theme-app';

// GOAL 21 (post-mission) — refonte visuelle inspirée d'un dashboard santé/
// projet à cartes colorées (plutôt que des cartes monochromes identiques),
// et chaque carte ouvre désormais une vraie feuille de détail listant les
// données exactes qu'elle résume (biens, clients, missions, réquisitions,
// caisses, commissions, utilisateurs) — jamais un simple compteur muet.
const ACTIVITY_ICON: Record<RecentActivityEntry['type'], keyof typeof MaterialIcons.glyphMap> = {
  PROPERTY: 'home',
  CLIENT: 'person',
  MISSION: 'assignment-turned-in',
  REQUISITION: 'description',
};

const timeAgo = (dateStr: string) => {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  return `il y a ${days} j`;
};

type StatKey =
  | 'rentals'
  | 'sales'
  | 'clients'
  | 'missions'
  | 'requisitions'
  | 'caisses'
  | 'commissions'
  | 'users';

const STAT_COLORS: Record<StatKey, string> = {
  rentals: '#3B82F6',
  sales: '#F97316',
  clients: '#8B5CF6',
  missions: '#10B981',
  requisitions: '#F59E0B',
  caisses: '#0EA5E9',
  commissions: '#EC4899',
  users: '#6366F1',
};

function StatCard({
  label,
  value,
  icon,
  color,
  onPress,
}: {
  label: string;
  value: number;
  icon: keyof typeof MaterialIcons.glyphMap;
  color: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={{
        flexBasis: '48%',
        borderRadius: APP_RADIUS.lg,
        backgroundColor: color,
        padding: 16,
        gap: 10,
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          height: 34,
          width: 34,
          borderRadius: 999,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(255,255,255,0.25)',
        }}
      >
        <MaterialIcons name={icon} size={17} color="#fff" />
      </View>
      <Text style={{ fontFamily: 'Manrope_700Bold', fontSize: 26, color: '#fff' }}>{value}</Text>
      <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 12.5, color: 'rgba(255,255,255,0.9)' }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export default function DashboardInterneScreen() {
  const insets = useSafeAreaInsets();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeModal, setActiveModal] = useState<StatKey | null>(null);

  const load = useCallback(async () => {
    try {
      setStats(await getDashboardStats());
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleLogout = async () => {
    await logout();
    router.replace('/');
  };

  if (isLoading && !stats) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: APP_COLORS.background }}>
        <ActivityIndicator color={APP_COLORS.primary} />
      </View>
    );
  }

  const cards: { key: StatKey; label: string; value: number; icon: keyof typeof MaterialIcons.glyphMap }[] = [];
  if (stats) {
    cards.push(
      { key: 'rentals', label: 'Biens à louer', value: stats.properties.rentals, icon: 'home' },
      { key: 'sales', label: 'Biens à vendre', value: stats.properties.sales, icon: 'sell' }
    );
    if (stats.clients !== undefined) cards.push({ key: 'clients', label: 'Clients', value: stats.clients, icon: 'people' });
    if (stats.pendingMissions !== undefined)
      cards.push({ key: 'missions', label: 'Missions à valider', value: stats.pendingMissions, icon: 'assignment-turned-in' });
    if (stats.pendingRequisitions !== undefined)
      cards.push({ key: 'requisitions', label: 'Réquisitions à traiter', value: stats.pendingRequisitions, icon: 'description' });
    if (stats.openCaisses !== undefined)
      cards.push({ key: 'caisses', label: 'Caisses ouvertes', value: stats.openCaisses, icon: 'account-balance-wallet' });
    if (stats.pendingCommissions !== undefined)
      cards.push({ key: 'commissions', label: 'Commissions dues', value: stats.pendingCommissions, icon: 'percent' });
    if (stats.activeUsers !== undefined)
      cards.push({ key: 'users', label: 'Utilisateurs actifs', value: stats.activeUsers, icon: 'group' });
  }

  return (
    <>
      <ScrollView
        style={{ flex: 1, backgroundColor: APP_COLORS.background }}
        contentContainerStyle={{ padding: 20, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32, gap: 20 }}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={load} />}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ fontFamily: 'Manrope_700Bold', fontSize: 24, color: APP_COLORS.foreground }}>
            Tableau de bord
          </Text>
          <TouchableOpacity onPress={handleLogout} style={{ padding: 8 }}>
            <MaterialIcons name="logout" size={20} color={APP_COLORS.mutedForeground} />
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {cards.map((card) => (
            <StatCard
              key={card.key}
              label={card.label}
              value={card.value}
              icon={card.icon}
              color={STAT_COLORS[card.key]}
              onPress={() => setActiveModal(card.key)}
            />
          ))}
        </View>

        <View>
          <Text style={{ fontFamily: 'Manrope_600SemiBold', fontSize: 16, color: APP_COLORS.foreground, marginBottom: 12 }}>
            Activité récente
          </Text>
          {stats && stats.recentActivity.length > 0 ? (
            <View
              style={{
                borderRadius: APP_RADIUS.lg,
                backgroundColor: APP_COLORS.card,
                borderWidth: 1,
                borderColor: APP_COLORS.border,
              }}
            >
              {stats.recentActivity.map((entry, index) => (
                <View
                  key={`${entry.type}-${entry.id}`}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    padding: 14,
                    borderTopWidth: index === 0 ? 0 : 1,
                    borderTopColor: APP_COLORS.border,
                  }}
                >
                  <View
                    style={{
                      height: 32,
                      width: 32,
                      borderRadius: 999,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: APP_COLORS.muted,
                    }}
                  >
                    <MaterialIcons name={ACTIVITY_ICON[entry.type]} size={16} color={APP_COLORS.mutedForeground} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: APP_COLORS.foreground }}>
                      {entry.label}
                    </Text>
                    <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: APP_COLORS.mutedForeground }}>
                      {entry.detail ? `${entry.detail} — ` : ''}
                      {timeAgo(entry.date)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: APP_COLORS.mutedForeground }}>
              Aucune activité récente
            </Text>
          )}
        </View>
      </ScrollView>

      <StatDetailModal<Property>
        visible={activeModal === 'rentals'}
        onClose={() => setActiveModal(null)}
        title="Biens à louer"
        icon="home"
        color={STAT_COLORS.rentals}
        load={() => getAllProperties({ category: 'RENT' })}
        keyExtractor={(p) => String(p.idProperty)}
        renderItem={(p) => (
          <DetailRow
            title={p.avenue || PROPERTY_TYPE_LABELS[p.propertyType]}
            subtitle={`${p.quartier || ''} · $${p.price.toLocaleString()}`}
            badge={PROPERTY_TYPE_LABELS[p.propertyType]}
            badgeColor={STAT_COLORS.rentals}
            onPress={() => {
              setActiveModal(null);
              router.push(`/property/${p.idProperty}` as never);
            }}
          />
        )}
      />

      <StatDetailModal<Property>
        visible={activeModal === 'sales'}
        onClose={() => setActiveModal(null)}
        title="Biens à vendre"
        icon="sell"
        color={STAT_COLORS.sales}
        load={() => getAllProperties({ category: 'SALE' })}
        keyExtractor={(p) => String(p.idProperty)}
        renderItem={(p) => (
          <DetailRow
            title={p.avenue || PROPERTY_TYPE_LABELS[p.propertyType]}
            subtitle={`${p.quartier || ''} · $${p.price.toLocaleString()}`}
            badge={PROPERTY_TYPE_LABELS[p.propertyType]}
            badgeColor={STAT_COLORS.sales}
            onPress={() => {
              setActiveModal(null);
              router.push(`/property/${p.idProperty}` as never);
            }}
          />
        )}
      />

      <StatDetailModal<Client>
        visible={activeModal === 'clients'}
        onClose={() => setActiveModal(null)}
        title="Clients"
        icon="people"
        color={STAT_COLORS.clients}
        load={getAllClients}
        keyExtractor={(c) => String(c.idClient)}
        renderItem={(c) => (
          <DetailRow
            title={c.person?.fullName || `Client #${c.idClient}`}
            subtitle={c.person?.phone || c.dossierNumber || undefined}
            badge={CLIENT_TYPE_LABELS[c.type]}
            badgeColor={STAT_COLORS.clients}
          />
        )}
      />

      <StatDetailModal<ServerMission>
        visible={activeModal === 'missions'}
        onClose={() => setActiveModal(null)}
        title="Missions à valider"
        icon="assignment-turned-in"
        color={STAT_COLORS.missions}
        load={async () => (await getAllMissions()).filter((m) => m.statut === 'SOUMISE')}
        keyExtractor={(m) => String(m.idMission)}
        renderItem={(m) => (
          <DetailRow
            title={SERVER_MISSION_TYPE_LABELS[m.type]}
            subtitle={m.commissionnaire?.person?.fullName}
            badge={SERVER_MISSION_STATUT_LABELS[m.statut]}
            badgeColor={STAT_COLORS.missions}
          />
        )}
      />

      <StatDetailModal<Requisition>
        visible={activeModal === 'requisitions'}
        onClose={() => setActiveModal(null)}
        title="Réquisitions à traiter"
        icon="description"
        color={STAT_COLORS.requisitions}
        load={() => getAllRequisitions('SOUMISE')}
        keyExtractor={(r) => String(r.idRequisition)}
        renderItem={(r) => (
          <DetailRow
            title={r.nature}
            subtitle={`${r.coutEstime.toLocaleString()} ${r.currencyCode} · ${r.demandeur?.fullName || ''}`}
            badge={REQUISITION_STATUT_LABELS[r.statut]}
            badgeColor={STAT_COLORS.requisitions}
          />
        )}
      />

      <StatDetailModal<Caisse>
        visible={activeModal === 'caisses'}
        onClose={() => setActiveModal(null)}
        title="Caisses ouvertes"
        icon="account-balance-wallet"
        color={STAT_COLORS.caisses}
        load={async () => (await getAllCaisses()).filter((c) => c.statut === 'OUVERTE')}
        keyExtractor={(c) => String(c.idCaisse)}
        renderItem={(c) => (
          <DetailRow
            title={c.label}
            subtitle={(c.balances || []).map((b) => `${b.balance.toLocaleString()} ${b.currencyCode}`).join(' · ')}
            badge={CAISSE_STATUT_LABELS[c.statut]}
            badgeColor={STAT_COLORS.caisses}
          />
        )}
      />

      <StatDetailModal<Commission>
        visible={activeModal === 'commissions'}
        onClose={() => setActiveModal(null)}
        title="Commissions dues"
        icon="percent"
        color={STAT_COLORS.commissions}
        load={() => getAllCommissions('DUE')}
        keyExtractor={(c) => String(c.idCommission)}
        renderItem={(c) => (
          <DetailRow
            title={`${c.montantCommission.toLocaleString()} ${c.currencyCode}`}
            subtitle={`Transaction : ${c.montantTransaction.toLocaleString()} ${c.currencyCode}`}
            badge={COMMISSION_STATUT_LABELS[c.statut]}
            badgeColor={STAT_COLORS.commissions}
          />
        )}
      />

      <StatDetailModal<UserDirectoryEntry>
        visible={activeModal === 'users'}
        onClose={() => setActiveModal(null)}
        title="Utilisateurs actifs"
        icon="group"
        color={STAT_COLORS.users}
        load={getUsersDirectory}
        keyExtractor={(u) => String(u.idUser)}
        renderItem={(u) => <DetailRow title={u.fullName} badge={u.role} badgeColor={STAT_COLORS.users} />}
      />
    </>
  );
}
