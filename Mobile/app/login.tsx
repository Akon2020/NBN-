import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { login, roleToHomeRoute } from '@/lib/auth';
import { ROLES } from '@/constants/roles';
import { APP_COLORS, APP_RADIUS } from '@/constants/theme-app';

// MOBILE-G02 — login réel contre l'API, présenté après l'onboarding de
// marque. Un lien de démonstration reste disponible pour le profil
// "Client", qui n'a pas encore de compte back-end (CRM, M2).
export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const user = await login(email.trim(), password);
      router.replace(roleToHomeRoute(user.role) as never);
    } catch (err: any) {
      setError(
        err?.response?.data?.message || 'Échec de la connexion. Vérifiez vos identifiants.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const clientDemo = ROLES.find((role) => role.label === 'Client');

  return (
    <KeyboardAvoidingView
      className="flex-1"
      style={{ backgroundColor: APP_COLORS.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <View
          className="items-center px-8"
          style={{ paddingTop: insets.top + 48, paddingBottom: 24 }}
        >
          <View
            className="h-16 w-16 items-center justify-center"
            style={{ backgroundColor: `${APP_COLORS.primary}1A`, borderRadius: APP_RADIUS.lg }}
          >
            <MaterialIcons name="home" size={32} color={APP_COLORS.primary} />
          </View>
          <Text
            className="mt-4"
            style={{ fontFamily: 'Manrope_700Bold', fontSize: 26, color: APP_COLORS.foreground }}
          >
            NBN Express
          </Text>
          <Text
            className="mt-1"
            style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: APP_COLORS.mutedForeground }}
          >
            Connexion — agents et commissionnaires
          </Text>
        </View>

        <View className="flex-1 gap-4 px-8 pt-6">
          {error && (
            <View
              className="px-4 py-3"
              style={{ backgroundColor: `${APP_COLORS.destructive}14`, borderRadius: APP_RADIUS.md }}
            >
              <Text style={{ fontFamily: 'Inter_500Medium', color: APP_COLORS.destructive }}>
                {error}
              </Text>
            </View>
          )}

          <View className="gap-2">
            <Text
              style={{
                fontFamily: 'Inter_500Medium',
                fontSize: 13,
                color: APP_COLORS.mutedForeground,
              }}
            >
              Email
            </Text>
            <TextInput
              placeholder="vous@nyumbaniexpress.com"
              placeholderTextColor={APP_COLORS.mutedForeground}
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              className="px-4 py-3"
              style={{
                fontFamily: 'Inter_400Regular',
                fontSize: 15,
                borderWidth: 1,
                borderColor: APP_COLORS.border,
                borderRadius: APP_RADIUS.md,
                color: APP_COLORS.foreground,
              }}
            />
          </View>

          <View className="gap-2">
            <Text
              style={{
                fontFamily: 'Inter_500Medium',
                fontSize: 13,
                color: APP_COLORS.mutedForeground,
              }}
            >
              Mot de passe
            </Text>
            <TextInput
              placeholder="••••••••"
              placeholderTextColor={APP_COLORS.mutedForeground}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              className="px-4 py-3"
              style={{
                fontFamily: 'Inter_400Regular',
                fontSize: 15,
                borderWidth: 1,
                borderColor: APP_COLORS.border,
                borderRadius: APP_RADIUS.md,
                color: APP_COLORS.foreground,
              }}
            />
          </View>

          <TouchableOpacity
            onPress={handleLogin}
            disabled={submitting || !email || !password}
            className="mt-2 items-center py-4"
            style={{
              backgroundColor: APP_COLORS.primary,
              borderRadius: APP_RADIUS.xl,
              opacity: submitting || !email || !password ? 0.6 : 1,
            }}
          >
            {submitting ? (
              <ActivityIndicator color={APP_COLORS.primaryForeground} />
            ) : (
              <Text
                style={{
                  fontFamily: 'Inter_600SemiBold',
                  fontSize: 16,
                  color: APP_COLORS.primaryForeground,
                }}
              >
                Se connecter
              </Text>
            )}
          </TouchableOpacity>

          {clientDemo && (
            <TouchableOpacity
              onPress={() => router.push(clientDemo.href as never)}
              className="mt-2 items-center py-2"
            >
              <Text
                style={{ fontFamily: 'Inter_500Medium', fontSize: 14, color: APP_COLORS.secondary }}
              >
                Explorer comme client (démo)
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
