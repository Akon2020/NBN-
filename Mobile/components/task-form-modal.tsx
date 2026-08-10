import { useEffect, useState } from 'react';
import { Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { createTask, updateTask, TASK_PRIORITE_LABELS, type Task, type TaskPriorite } from '@/lib/tasks';
import { UserMultiSelect } from '@/components/user-multi-select';
import { DateField } from '@/components/date-field';
import { APP_COLORS, APP_RADIUS } from '@/constants/theme-app';

const PRIORITES: TaskPriorite[] = ['BASSE', 'NORMALE', 'HAUTE', 'URGENTE'];

// GOAL 21 (post-mission) — création et édition de tâche, avec assignation
// à une ou plusieurs personnes du système (même mécanisme
// `assigneeUserIds` que le Frontend Admin, GOAL 15) — les personnes
// assignées sont notifiées automatiquement côté Backend.
interface TaskFormModalProps {
  visible: boolean;
  onClose: () => void;
  task?: Task | null;
  onSaved: (task: Task) => void;
}

export function TaskFormModal({ visible, onClose, task, onSaved }: TaskFormModalProps) {
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priorite, setPriorite] = useState<TaskPriorite>('NORMALE');
  const [dateEcheance, setDateEcheance] = useState('');
  const [assigneeUserIds, setAssigneeUserIds] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!visible) return;
    setTitle(task?.title || '');
    setDescription(task?.description || '');
    setPriorite(task?.priorite || 'NORMALE');
    setDateEcheance(task?.dateEcheance ? task.dateEcheance.slice(0, 10) : '');
    setAssigneeUserIds(task?.assignees.map((a) => a.idUser) || []);
    setError('');
  }, [visible, task]);

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError('Le titre est obligatoire');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const input = {
        title: title.trim(),
        description: description.trim() || undefined,
        priorite,
        dateEcheance: dateEcheance.trim() || null,
        assigneeUserIds,
      };
      const saved = task ? await updateTask(task.idTask, input) : await createTask(input);
      onSaved(saved);
      onClose();
    } catch {
      setError("Erreur lors de l'enregistrement");
    } finally {
      setSubmitting(false);
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
            maxHeight: '90%',
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 20,
              paddingTop: 20,
              paddingBottom: 16,
              borderBottomWidth: 1,
              borderBottomColor: APP_COLORS.border,
            }}
          >
            <Text style={{ fontFamily: 'Manrope_700Bold', fontSize: 18, color: APP_COLORS.foreground }}>
              {task ? 'Modifier la tâche' : 'Nouvelle tâche'}
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <MaterialIcons name="close" size={22} color={APP_COLORS.mutedForeground} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20, gap: 18 }}>
            <View style={{ gap: 8 }}>
              <Text style={{ fontFamily: 'Manrope_600SemiBold', fontSize: 13, color: APP_COLORS.foreground }}>
                Titre
              </Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="Ex. Relancer le bailleur"
                placeholderTextColor={APP_COLORS.mutedForeground}
                style={{
                  borderWidth: 1,
                  borderColor: APP_COLORS.border,
                  borderRadius: APP_RADIUS.md,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  fontFamily: 'Inter_400Regular',
                  fontSize: 14,
                  color: APP_COLORS.foreground,
                }}
              />
            </View>

            <View style={{ gap: 8 }}>
              <Text style={{ fontFamily: 'Manrope_600SemiBold', fontSize: 13, color: APP_COLORS.foreground }}>
                Description (optionnelle)
              </Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Détails de la tâche..."
                placeholderTextColor={APP_COLORS.mutedForeground}
                multiline
                numberOfLines={3}
                style={{
                  borderWidth: 1,
                  borderColor: APP_COLORS.border,
                  borderRadius: APP_RADIUS.md,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  minHeight: 80,
                  textAlignVertical: 'top',
                  fontFamily: 'Inter_400Regular',
                  fontSize: 14,
                  color: APP_COLORS.foreground,
                }}
              />
            </View>

            <View style={{ gap: 8 }}>
              <Text style={{ fontFamily: 'Manrope_600SemiBold', fontSize: 13, color: APP_COLORS.foreground }}>
                Priorité
              </Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {PRIORITES.map((p) => {
                  const active = priorite === p;
                  return (
                    <TouchableOpacity
                      key={p}
                      onPress={() => setPriorite(p)}
                      style={{
                        flex: 1,
                        alignItems: 'center',
                        paddingVertical: 10,
                        borderRadius: APP_RADIUS.md,
                        borderWidth: 1,
                        borderColor: active ? APP_COLORS.foreground : APP_COLORS.border,
                        backgroundColor: active ? APP_COLORS.foreground : APP_COLORS.background,
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: 'Inter_500Medium',
                          fontSize: 12,
                          color: active ? APP_COLORS.background : APP_COLORS.mutedForeground,
                        }}
                      >
                        {TASK_PRIORITE_LABELS[p]}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={{ gap: 8 }}>
              <Text style={{ fontFamily: 'Manrope_600SemiBold', fontSize: 13, color: APP_COLORS.foreground }}>
                Échéance (optionnelle)
              </Text>
              <DateField value={dateEcheance} onChange={setDateEcheance} />
            </View>

            <View style={{ gap: 8 }}>
              <Text style={{ fontFamily: 'Manrope_600SemiBold', fontSize: 13, color: APP_COLORS.foreground }}>
                Assigner à (une ou plusieurs personnes)
              </Text>
              <UserMultiSelect selectedUserIds={assigneeUserIds} onChange={setAssigneeUserIds} />
            </View>

            {error !== '' && (
              <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 12.5, color: APP_COLORS.destructive }}>
                {error}
              </Text>
            )}
          </ScrollView>

          <View
            style={{
              paddingHorizontal: 20,
              paddingTop: 12,
              paddingBottom: insets.bottom + 16,
              borderTopWidth: 1,
              borderTopColor: APP_COLORS.border,
            }}
          >
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={submitting}
              style={{
                alignItems: 'center',
                paddingVertical: 14,
                borderRadius: APP_RADIUS.md,
                backgroundColor: APP_COLORS.primary,
                opacity: submitting ? 0.7 : 1,
              }}
            >
              <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: APP_COLORS.primaryForeground }}>
                {submitting ? 'Enregistrement...' : task ? 'Enregistrer' : 'Créer la tâche'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
