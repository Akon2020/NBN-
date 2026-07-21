import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, Text, TouchableOpacity, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  getAllTasks,
  updateTaskStatus,
  TASK_STATUT_LABELS,
  TASK_STATUT_ORDER,
  type Task,
  type TaskStatut,
} from '@/lib/tasks';
import { TaskFormModal } from '@/components/task-form-modal';
import { TaskDetailModal } from '@/components/task-detail-modal';
import { APP_COLORS } from '@/constants/theme-app';

// GOAL 21 (post-mission) — refonte façon Microsoft To Do : ligne minimale
// avec case à cocher (bascule rapide terminée/à faire), titre barré une
// fois terminée, plutôt que les cartes lourdes de la première version.
// Le détail complet (priorité, échéance, assignés, tous les statuts
// intermédiaires) reste accessible au tap sur la ligne, via TaskDetailModal.
const PRIORITE_DOT: Record<Task['priorite'], string> = {
  BASSE: APP_COLORS.mutedForeground,
  NORMALE: APP_COLORS.primary,
  HAUTE: APP_COLORS.warning,
  URGENTE: APP_COLORS.destructive,
};

const STATUT_FILTERS: { key: TaskStatut | 'all'; label: string }[] = [
  { key: 'all', label: 'Toutes' },
  ...TASK_STATUT_ORDER.map((statut) => ({ key: statut, label: TASK_STATUT_LABELS[statut] })),
];

function TaskRow({
  task,
  onToggleDone,
  onPress,
}: {
  task: Task;
  onToggleDone: () => void;
  onPress: () => void;
}) {
  const done = task.statut === 'TERMINEE';
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 14,
        paddingHorizontal: 4,
        borderBottomWidth: 1,
        borderBottomColor: APP_COLORS.border,
      }}
    >
      <TouchableOpacity onPress={onToggleDone} hitSlop={10}>
        <MaterialIcons
          name={done ? 'check-circle' : 'radio-button-unchecked'}
          size={24}
          color={done ? APP_COLORS.success : PRIORITE_DOT[task.priorite]}
        />
      </TouchableOpacity>

      <View style={{ flex: 1 }}>
        <Text
          numberOfLines={1}
          style={{
            fontFamily: 'Inter_500Medium',
            fontSize: 14.5,
            color: done ? APP_COLORS.mutedForeground : APP_COLORS.foreground,
            textDecorationLine: done ? 'line-through' : 'none',
          }}
        >
          {task.title}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3 }}>
          {!done && (
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11.5, color: APP_COLORS.mutedForeground }}>
              {TASK_STATUT_LABELS[task.statut]}
            </Text>
          )}
          {task.dateEcheance && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              <MaterialIcons name="event" size={11} color={APP_COLORS.mutedForeground} />
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11.5, color: APP_COLORS.mutedForeground }}>
                {new Date(task.dateEcheance).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
              </Text>
            </View>
          )}
        </View>
      </View>

      {task.assignees.length > 0 && (
        <View style={{ flexDirection: 'row' }}>
          {task.assignees.slice(0, 3).map((a, index) => (
            <View
              key={a.idUser}
              style={{
                height: 26,
                width: 26,
                borderRadius: 999,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: APP_COLORS.muted,
                borderWidth: 2,
                borderColor: APP_COLORS.background,
                marginLeft: index === 0 ? 0 : -8,
              }}
            >
              <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 10, color: APP_COLORS.foreground }}>
                {(a.user?.fullName || '?').charAt(0).toUpperCase()}
              </Text>
            </View>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function TachesScreen() {
  const insets = useSafeAreaInsets();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statutFilter, setStatutFilter] = useState<TaskStatut | 'all'>('all');
  const [assignedToMe, setAssignedToMe] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [detailTask, setDetailTask] = useState<Task | null>(null);

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

  const applyUpdate = (updated: Task) => {
    setTasks((prev) => {
      const exists = prev.some((t) => t.idTask === updated.idTask);
      if (!exists) return [updated, ...prev];
      return prev.map((t) => (t.idTask === updated.idTask ? updated : t));
    });
    setDetailTask((prev) => (prev && prev.idTask === updated.idTask ? updated : prev));
  };

  const handleToggleDone = async (task: Task) => {
    const nextStatut: TaskStatut = task.statut === 'TERMINEE' ? 'A_FAIRE' : 'TERMINEE';
    setTasks((prev) => prev.map((t) => (t.idTask === task.idTask ? { ...t, statut: nextStatut } : t)));
    try {
      const updated = await updateTaskStatus(task.idTask, nextStatut);
      applyUpdate(updated);
    } catch {
      load();
    }
  };

  const openCreate = () => {
    setEditingTask(null);
    setShowForm(true);
  };

  const openEditFromDetail = () => {
    if (!detailTask) return;
    setEditingTask(detailTask);
    setDetailTask(null);
    setShowForm(true);
  };

  return (
    <View style={{ flex: 1, backgroundColor: APP_COLORS.background }}>
      <View style={{ gap: 12, paddingHorizontal: 20, paddingTop: insets.top + 16, paddingBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ fontFamily: 'Manrope_700Bold', fontSize: 24, color: APP_COLORS.foreground }}>
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
                  borderWidth: 1,
                  borderColor: active ? APP_COLORS.foreground : APP_COLORS.border,
                  backgroundColor: active ? APP_COLORS.foreground : 'transparent',
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
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 100 }}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={load} />}
          renderItem={({ item }) => (
            <TaskRow
              task={item}
              onToggleDone={() => handleToggleDone(item)}
              onPress={() => setDetailTask(item)}
            />
          )}
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

      <TouchableOpacity
        onPress={openCreate}
        style={{
          position: 'absolute',
          bottom: insets.bottom + 20,
          right: 24,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingHorizontal: 20,
          paddingVertical: 14,
          borderRadius: 999,
          backgroundColor: APP_COLORS.primary,
          shadowColor: '#000',
          shadowOpacity: 0.25,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 4 },
          elevation: 5,
        }}
      >
        <MaterialIcons name="add" size={20} color={APP_COLORS.primaryForeground} />
        <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: APP_COLORS.primaryForeground }}>
          Nouvelle tâche
        </Text>
      </TouchableOpacity>

      <TaskFormModal
        visible={showForm}
        onClose={() => setShowForm(false)}
        task={editingTask}
        onSaved={applyUpdate}
      />

      <TaskDetailModal
        visible={detailTask !== null}
        onClose={() => setDetailTask(null)}
        task={detailTask}
        onUpdated={applyUpdate}
        onEdit={openEditFromDetail}
      />
    </View>
  );
}
