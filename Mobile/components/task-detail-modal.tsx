import { Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  updateTaskStatus,
  TASK_PRIORITE_LABELS,
  TASK_STATUT_LABELS,
  TASK_STATUT_ORDER,
  type Task,
  type TaskStatut,
} from '@/lib/tasks';
import { APP_COLORS, APP_RADIUS } from '@/constants/theme-app';

const PRIORITE_COLOR: Record<Task['priorite'], string> = {
  BASSE: APP_COLORS.mutedForeground,
  NORMALE: APP_COLORS.foreground,
  HAUTE: APP_COLORS.warning,
  URGENTE: APP_COLORS.destructive,
};

// GOAL 21 (post-mission) — détail complet d'une tâche : description,
// priorité, échéance, personnes assignées, et changement de statut vers
// n'importe quelle valeur (pas seulement "suivant", contrairement à la
// liste qui ne propose que l'avancement séquentiel) — même liberté que le
// Frontend Admin.
interface TaskDetailModalProps {
  visible: boolean;
  onClose: () => void;
  task: Task | null;
  onUpdated: (task: Task) => void;
  onEdit: () => void;
}

export function TaskDetailModal({ visible, onClose, task, onUpdated, onEdit }: TaskDetailModalProps) {
  const insets = useSafeAreaInsets();

  if (!task) return null;

  const handleStatutChange = async (statut: TaskStatut) => {
    if (statut === task.statut) return;
    try {
      const updated = await updateTaskStatus(task.idTask, statut);
      onUpdated(updated);
    } catch {
      // Silencieux : la liste reprendra l'état serveur au prochain focus.
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent>
      <View style={{ flex: 1, backgroundColor: 'rgba(20,23,22,0.4)', justifyContent: 'flex-end' }}>
        <View
          style={{
            backgroundColor: APP_COLORS.background,
            borderTopLeftRadius: APP_RADIUS.xl,
            borderTopRightRadius: APP_RADIUS.xl,
            maxHeight: '85%',
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 12,
              paddingHorizontal: 20,
              paddingTop: 20,
              paddingBottom: 16,
              borderBottomWidth: 1,
              borderBottomColor: APP_COLORS.border,
            }}
          >
            <Text
              style={{ flex: 1, fontFamily: 'Manrope_700Bold', fontSize: 18, color: APP_COLORS.foreground }}
            >
              {task.title}
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <MaterialIcons name="close" size={22} color={APP_COLORS.mutedForeground} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 20, gap: 20 }}>
            {task.description && (
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: APP_COLORS.mutedForeground }}>
                {task.description}
              </Text>
            )}

            <View style={{ flexDirection: 'row', gap: 20 }}>
              <View style={{ gap: 4 }}>
                <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11.5, color: APP_COLORS.mutedForeground }}>
                  Priorité
                </Text>
                <Text
                  style={{
                    fontFamily: 'Manrope_600SemiBold',
                    fontSize: 13,
                    color: PRIORITE_COLOR[task.priorite],
                  }}
                >
                  {TASK_PRIORITE_LABELS[task.priorite]}
                </Text>
              </View>
              {task.dateEcheance && (
                <View style={{ gap: 4 }}>
                  <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11.5, color: APP_COLORS.mutedForeground }}>
                    Échéance
                  </Text>
                  <Text style={{ fontFamily: 'Manrope_600SemiBold', fontSize: 13, color: APP_COLORS.foreground }}>
                    {new Date(task.dateEcheance).toLocaleDateString('fr-FR')}
                  </Text>
                </View>
              )}
            </View>

            <View style={{ gap: 8 }}>
              <Text style={{ fontFamily: 'Manrope_600SemiBold', fontSize: 13, color: APP_COLORS.foreground }}>
                Assignés
              </Text>
              {task.assignees.length > 0 ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {task.assignees.map((a) => (
                    <View
                      key={a.idUser}
                      style={{
                        borderRadius: 999,
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        backgroundColor: APP_COLORS.muted,
                      }}
                    >
                      <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 12.5, color: APP_COLORS.foreground }}>
                        {a.user?.fullName || `Utilisateur #${a.idUser}`}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: APP_COLORS.mutedForeground }}>
                  Non assignée
                </Text>
              )}
            </View>

            <View style={{ gap: 8 }}>
              <Text style={{ fontFamily: 'Manrope_600SemiBold', fontSize: 13, color: APP_COLORS.foreground }}>
                Statut
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {TASK_STATUT_ORDER.map((statut) => {
                  const active = task.statut === statut;
                  return (
                    <TouchableOpacity
                      key={statut}
                      onPress={() => handleStatutChange(statut)}
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 9,
                        borderRadius: 999,
                        backgroundColor: active ? APP_COLORS.primary : APP_COLORS.muted,
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: 'Inter_500Medium',
                          fontSize: 12.5,
                          color: active ? APP_COLORS.primaryForeground : APP_COLORS.mutedForeground,
                        }}
                      >
                        {TASK_STATUT_LABELS[statut]}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {task.creator && (
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: APP_COLORS.mutedForeground }}>
                Créée par {task.creator.fullName} le {new Date(task.createdAt).toLocaleDateString('fr-FR')}
              </Text>
            )}

            <TouchableOpacity
              onPress={onEdit}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                paddingVertical: 13,
                borderRadius: APP_RADIUS.md,
                borderWidth: 1,
                borderColor: APP_COLORS.border,
              }}
            >
              <MaterialIcons name="edit" size={16} color={APP_COLORS.foreground} />
              <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13.5, color: APP_COLORS.foreground }}>
                Modifier la tâche
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
