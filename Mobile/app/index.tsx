import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { getAccessToken } from '@/lib/secureStore';
import { getCurrentUser, login, roleToHomeRoute } from '@/lib/auth';
import { ROLES } from '@/constants/roles';

// MOBILE-G02 — remplace le sélecteur de rôle "mock" de MOBILE-G01 par un
// vrai login contre l'API. Un lien de démonstration reste disponible pour
// le profil "Client", qui n'a pas encore de compte back-end (CRM, M2).
export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkExistingSession = async () => {
      const token = await getAccessToken();
      if (!token) {
        setLoading(false);
        return;
      }

      const user = await getCurrentUser();
      if (user) {
        router.replace(roleToHomeRoute(user.role) as never);
        return;
      }

      setLoading(false);
    };

    checkExistingSession();
  }, []);

  const handleLogin = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const user = await login(email.trim(), password);
      router.replace(roleToHomeRoute(user.role) as never);
    } catch (err: any) {
      setError(
        err?.response?.data?.message || "Échec de la connexion. Vérifiez vos identifiants."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const clientDemo = ROLES.find((role) => role.label === 'Client');

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-neutral-900">
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View className="flex-1 justify-center gap-4 bg-white px-6 dark:bg-neutral-900">
      <ThemedText type="title">NBN Express</ThemedText>
      <ThemedText style={{ marginBottom: 8 }}>Connexion — agents et commissionnaires</ThemedText>

      {error && <Text style={{ color: '#D92D20' }}>{error}</Text>}

      <TextInput
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        className="rounded-lg border border-neutral-300 px-4 py-3 dark:border-neutral-700 dark:text-white"
      />
      <TextInput
        placeholder="Mot de passe"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        className="rounded-lg border border-neutral-300 px-4 py-3 dark:border-neutral-700 dark:text-white"
      />

      <TouchableOpacity
        onPress={handleLogin}
        disabled={submitting || !email || !password}
        className="items-center rounded-lg bg-primary-900 px-4 py-3"
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-base font-semibold text-white">Se connecter</Text>
        )}
      </TouchableOpacity>

      {clientDemo && (
        <TouchableOpacity onPress={() => router.push(clientDemo.href as never)}>
          <ThemedText type="link" style={{ textAlign: 'center' }}>
            Explorer comme client (démo)
          </ThemedText>
        </TouchableOpacity>
      )}
    </View>
  );
}
