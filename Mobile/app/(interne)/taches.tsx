import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, Text, TouchableOpacity, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  getAllTasks,
  updateTaskStatus,
  TASK_PRIORITE_LABELS,
  TASK_STATUT_LABELS,
  TASK_STATUT_ORDER,
  type Task,
  type TaskStatut,
} from '@/lib/tasks';
import { APP_COLORS, APP_RADIUS } from '@/constants/theme-app';

// GOAL 21 — liste réelle des tâches pour l'arborescence "Interne", jusqu'ici
// un `RoleScreenPlaceholder`. Le Kanban glisser-déposer du Frontend Admin
// n'a pas d'équivalent tactile naturel en mobile — remplacé par une liste
// filtrable par statut avec avancement au tap, pattern natif mobile plutôt
// qu'un portage littéral du DnD.
const PRIORITE_COLOR: Record<Task['priorite'], string> = {
  BASSE: APP_COLORS.mutedForeground,
  NORMALE: APP_COLORS.foreground,
  HAUTE: APP_COLORS.warning,
  URGENTE: APP_COLORS.destructive,
};

const STATUT_FILTERS: { key: TaskStatut | 'all'; label: string }[] = [
  { key: 'all', label: 'Toutes' },
  ...TASK_STATUT_ORDER.map((statut) => ({ key: statut, label: TASK_STATUT_LABELS[statut] })),
];

function nextStatut(statut: TaskStatut): TaskStatut | null {
  const index = TASK_STATUT_ORDER.indexOf(statut);
  return index >= 0 && index < TASK_STATUT_ORDER.length - 1 ? TASK_STATUT_ORDER[index + 1] : null;
}

function TaskCard({ task, onAdvance }: { task: Task; onAdvance: (task: Task) => void }) {
  const next = nextStatut(task.statut);
  return (
    <View
      style={{
        marginBottom: 12,
        borderRadius: APP_RADIUS.lg,
        backgroundColor: APP_COLORS.card,
        borderWidth: 1,
        borderColor: APP_COLORS.border,
        padding: 16,
        gap: 6,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text
          style={{
            fontFamily: 'Inter_500Medium',
            fontSize: 11,
            color: PRIORITE_COLOR[task.priorite],
          }}
        >
          {TASK_PRIORITE_LABELS[task.priorite]}
        </Text>
        <View
          style={{
            borderRadius: 999,
            paddingHorizontal: 8,
            paddingVertical: 4,
            backgroundColor: APP_COLORS.muted,
          }}
        >
          <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 11, color: APP_COLORS.mutedForeground }}>
            {TASK_STATUT_LABELS[task.statut]}
          </Text>
        </View>
      </View>
      <Text style={{ fontFamily: 'Manrope_600SemiBold', fontSize: 15, color: APP_COLORS.foreground }}>
        {task.title}
      </Text>
      {task.description && (
        <Text
          numberOfLines={2}
          style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: APP_COLORS.mutedForeground }}
        >
          {task.description}
        </Text>
      )}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
        <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: APP_COLORS.mutedForeground }}>
          {task.assignees.length > 0
            ? task.assignees.map((a) => a.user?.fullName).filter(Boolean).join(', ')
            : 'Non assignée'}
        </Text>
        {next && (
          <TouchableOpacity
            onPress={() => onAdvance(task)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              borderRadius: 999,
              paddingHorizontal: 12,
              paddingVertical: 6,
              backgroundColor: APP_COLORS.primary,
            }}
          >
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: APP_COLORS.primaryForeground }}>
              {TASK_STATUT_LABELS[next]}
            </Text>
            <MaterialIcons name="arrow-forward" size={14} color={APP_COLORS.primaryForeground} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

export default function TachesScreen() {
  const insets = useSafeAreaInsets();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statutFilter, setStatutFilter] = useState<TaskStatut | 'all'>('all');
  const [assignedToMe, setAssignedToMe] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await getAllTasks({
        statut: statutFilter === 'all' ? undefined : statutFilter,
        assignedToMe,
      });
      setTasks(data);
    } catch {
      setTasks([]);
    } finally {
      setIsLoading(false);
    }
  }, [statutFilter, assignedToMe]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleAdvance = async (task: Task) => {
    const next = nextStatut(task.statut);
    if (!next) return;
    setTasks((prev) => prev.map((t) => (t.idTask === task.idTask ? { ...t, statut: next } : t)));
    try {
      await updateTaskStatus(task.idTask, next);
    } catch {
      load();
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: APP_COLORS.background }}>
      <View style={{ gap: 12, paddingHorizontal: 20, paddingTop: insets.top + 16, paddingBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ fontFamily: 'Manrope_600SemiBold', fontSize: 22, color: APP_COLORS.foreground }}>
            Tâches
          </Text>
          <TouchableOpacity
            onPress={() => setAssignedToMe((prev) => !prev)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              borderRadius: 999,
              paddingHorizontal: 12,
              paddingVertical: 8,
              backgroundColor: assignedToMe ? APP_COLORS.primary : APP_COLORS.muted,
            }}
          >
            <MaterialIcons
              name="person"
              size={15}
              color={assignedToMe ? APP_COLORS.primaryForeground : APP_COLORS.mutedForeground}
            />
            <Text
              style={{
                fontFamily: 'Inter_500Medium',
                fontSize: 12,
                color: assignedToMe ? APP_COLORS.primaryForeground : APP_COLORS.mutedForeground,
              }}
            >
              Mes tâches
            </Text>
          </TouchableOpacity>
        </View>

        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={STATUT_FILTERS}
          keyExtractor={(item) => item.key}
          contentContainerStyle={{ gap: 8 }}
          renderItem={({ item }) => {
            const active = statutFilter === item.key;
            return (
              <TouchableOpacity
                onPress={() => setStatutFilter(item.key)}
                style={{
                  borderRadius: 999,
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  backgroundColor: active ? APP_COLORS.foreground : APP_COLORS.muted,
                }}
              >
                <Text
                  style={{
                    fontFamily: 'Inter_500Medium',
                    fontSize: 12.5,
                    color: active ? APP_COLORS.background : APP_COLORS.mutedForeground,
                  }}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {isLoading && tasks.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={APP_COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={tasks}
          keyExtractor={(item) => String(item.idTask)}
          contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 20 }}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={load} />}
          renderItem={({ item }) => <TaskCard task={item} onAdvance={handleAdvance} />}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', gap: 8, paddingVertical: 64 }}>
              <MaterialIcons name="checklist" size={40} color={APP_COLORS.mutedForeground} />
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: APP_COLORS.mutedForeground }}>
                Aucune tâche
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}
