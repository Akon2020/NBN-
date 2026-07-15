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
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { login, roleToHomeRoute } from '@/lib/auth';
import { APP_COLORS, APP_RADIUS } from '@/constants/theme-app';

const HERO_IMAGE = require('@/assets/images/onboarding/slide-2.jpg');

// MOBILE-G02 — login réel contre l'API. Présenté comme un espace optionnel
// (accessible depuis l'icône profil du catalogue public), pas comme un
// passage obligé — le parcours démarre désormais côté "client".
export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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

  const goBackToClient = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(client)/recherche');
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1"
      style={{ backgroundColor: APP_COLORS.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View style={{ height: 260 }}>
          <Image
            source={HERO_IMAGE}
            style={{ width: '100%', height: '100%', position: 'absolute' }}
            contentFit="cover"
          />
          <LinearGradient
            colors={['transparent', 'rgba(20,23,22,0.85)']}
            style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '75%' }}
          />

          <TouchableOpacity
            onPress={goBackToClient}
            style={{
              position: 'absolute',
              left: 20,
              top: insets.top + 12,
              height: 40,
              width: 40,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 999,
              backgroundColor: 'rgba(255,255,255,0.9)',
            }}
          >
            <MaterialIcons name="arrow-back" size={22} color={APP_COLORS.foreground} />
          </TouchableOpacity>

          <View style={{ position: 'absolute', bottom: 24, left: 24, right: 24 }}>
            <Text style={{ fontFamily: 'Manrope_700Bold', fontSize: 26, color: '#FFFFFF' }}>
              Espace professionnel
            </Text>
            <Text
              style={{
                fontFamily: 'Inter_400Regular',
                fontSize: 14,
                color: 'rgba(255,255,255,0.85)',
                marginTop: 4,
              }}
            >
              Réservé aux agents et commissionnaires NBN Express
            </Text>
          </View>
        </View>

        <View
          style={{
            flex: 1,
            marginTop: -24,
            backgroundColor: APP_COLORS.background,
            borderTopLeftRadius: APP_RADIUS.xl,
            borderTopRightRadius: APP_RADIUS.xl,
            paddingHorizontal: 24,
            paddingTop: 28,
          }}
        >
          <View className="gap-4">
            {error && (
              <View
                className="px-4 py-3"
                style={{ backgroundColor: `${APP_COLORS.destructive}14`, borderRadius: APP_RADIUS.md }}
              >
                <Text style={{ fontFamily: 'Inter_500Medium', color: APP_COLORS.destructive, fontSize: 13 }}>
                  {error}
                </Text>
              </View>
            )}

            <View
              className="flex-row items-center px-4"
              style={{
                borderWidth: 1,
                borderColor: APP_COLORS.border,
                borderRadius: APP_RADIUS.md,
                backgroundColor: APP_COLORS.muted,
              }}
            >
              <MaterialIcons name="mail-outline" size={20} color={APP_COLORS.mutedForeground} />
              <TextInput
                placeholder="Adresse email"
                placeholderTextColor={APP_COLORS.mutedForeground}
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
                className="flex-1 py-4 px-3"
                style={{ fontFamily: 'Inter_400Regular', fontSize: 15, color: APP_COLORS.foreground }}
              />
            </View>

            <View
              className="flex-row items-center px-4"
              style={{
                borderWidth: 1,
                borderColor: APP_COLORS.border,
                borderRadius: APP_RADIUS.md,
                backgroundColor: APP_COLORS.muted,
              }}
            >
              <MaterialIcons name="lock-outline" size={20} color={APP_COLORS.mutedForeground} />
              <TextInput
                placeholder="Mot de passe"
                placeholderTextColor={APP_COLORS.mutedForeground}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                className="flex-1 py-4 px-3"
                style={{ fontFamily: 'Inter_400Regular', fontSize: 15, color: APP_COLORS.foreground }}
              />
              <TouchableOpacity onPress={() => setShowPassword((v) => !v)} hitSlop={8}>
                <MaterialIcons
                  name={showPassword ? 'visibility-off' : 'visibility'}
                  size={20}
                  color={APP_COLORS.mutedForeground}
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={handleLogin}
              disabled={submitting || !email || !password}
              className="mt-2 items-center py-4"
              style={{
                backgroundColor: APP_COLORS.primary,
                borderRadius: APP_RADIUS.xl,
                opacity: submitting || !email || !password ? 0.6 : 1,
                shadowColor: APP_COLORS.primary,
                shadowOpacity: 0.3,
                shadowRadius: 16,
                shadowOffset: { width: 0, height: 8 },
                elevation: 4,
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

            <TouchableOpacity onPress={goBackToClient} className="items-center py-2">
              <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 14, color: APP_COLORS.mutedForeground }}>
                Retour au catalogue public
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
