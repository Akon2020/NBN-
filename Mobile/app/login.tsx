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
import { LinearGradient } from 'expo-linear-gradient';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { login, roleToHomeRoute } from '@/lib/auth';
import { ROLES } from '@/constants/roles';

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
      className="flex-1 bg-white dark:bg-neutral-900"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <LinearGradient
          colors={['#14294A', '#1E3A63']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            paddingTop: insets.top + 32,
            paddingBottom: 40,
            borderBottomLeftRadius: 32,
            borderBottomRightRadius: 32,
            alignItems: 'center',
          }}
        >
          <View className="h-16 w-16 items-center justify-center rounded-2xl bg-white/15">
            <MaterialIcons name="home" size={34} color="#fff" />
          </View>
          <Text
            className="mt-4 text-white"
            style={{ fontFamily: 'Manrope_600SemiBold', fontSize: 24 }}
          >
            NBN Express
          </Text>
          <Text
            className="mt-1 text-white/70"
            style={{ fontFamily: 'Inter_400Regular', fontSize: 14 }}
          >
            Connexion — agents et commissionnaires
          </Text>
        </LinearGradient>

        <View className="flex-1 justify-center gap-4 px-8 pt-10">
          {error && (
            <View className="rounded-xl bg-error-500/10 px-4 py-3">
              <Text style={{ fontFamily: 'Inter_500Medium', color: '#D92D20' }}>{error}</Text>
            </View>
          )}

          <View className="gap-2">
            <Text
              className="text-neutral-600 dark:text-neutral-300"
              style={{ fontFamily: 'Inter_500Medium', fontSize: 13 }}
            >
              Email
            </Text>
            <TextInput
              placeholder="vous@nyumbaniexpress.com"
              placeholderTextColor="#9AA1AC"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              className="rounded-xl border border-neutral-300 px-4 py-3 text-neutral-900 dark:border-neutral-700 dark:text-white"
              style={{ fontFamily: 'Inter_400Regular', fontSize: 15 }}
            />
          </View>

          <View className="gap-2">
            <Text
              className="text-neutral-600 dark:text-neutral-300"
              style={{ fontFamily: 'Inter_500Medium', fontSize: 13 }}
            >
              Mot de passe
            </Text>
            <TextInput
              placeholder="••••••••"
              placeholderTextColor="#9AA1AC"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              className="rounded-xl border border-neutral-300 px-4 py-3 text-neutral-900 dark:border-neutral-700 dark:text-white"
              style={{ fontFamily: 'Inter_400Regular', fontSize: 15 }}
            />
          </View>

          <TouchableOpacity
            onPress={handleLogin}
            disabled={submitting || !email || !password}
            className="mt-2 items-center rounded-xl bg-accent-600 py-4"
            style={{ opacity: submitting || !email || !password ? 0.6 : 1 }}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 16, color: '#fff' }}>
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
                style={{ fontFamily: 'Inter_500Medium', fontSize: 14, color: '#C13F0B' }}
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
