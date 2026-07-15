import { useRef, useState } from 'react';
import { Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ONBOARDING_SLIDES, type OnboardingSlide } from '@/constants/onboarding';
import { markOnboardingSeen } from '@/lib/onboardingStorage';
import { APP_COLORS, APP_RADIUS } from '@/constants/theme-app';

const AnimatedFlatList = Animated.createAnimatedComponent(
  Animated.FlatList<OnboardingSlide>
);

// Traitement "hero photo" (image plein cadre + dégradé + texte en
// surimpression), inspiré des références produit partagées par l'agence —
// un vrai bien à l'écran dès la première seconde, pas une icône abstraite.
function Slide({ item }: { item: OnboardingSlide }) {
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();
  return (
    <View style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT }}>
      <Image
        source={item.image}
        style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT, position: 'absolute' }}
        contentFit="cover"
      />
      <LinearGradient
        colors={['transparent', 'rgba(20,23,22,0.55)', 'rgba(20,23,22,0.92)']}
        locations={[0, 0.55, 1]}
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: SCREEN_HEIGHT * 0.55,
        }}
      />
      <View className="absolute bottom-0 left-0 right-0 px-8" style={{ paddingBottom: 190 }}>
        <Text
          className="text-white"
          style={{ fontFamily: 'Manrope_700Bold', fontSize: 30, lineHeight: 38 }}
        >
          {item.title}
        </Text>
        <Text
          className="mt-3"
          style={{
            fontFamily: 'Inter_400Regular',
            fontSize: 15,
            lineHeight: 22,
            color: 'rgba(255,255,255,0.85)',
          }}
        >
          {item.description}
        </Text>
      </View>
    </View>
  );
}

function Dot({ index, scrollX }: { index: number; scrollX: SharedValue<number> }) {
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const style = useAnimatedStyle(() => {
    const inputRange = [
      (index - 1) * SCREEN_WIDTH,
      index * SCREEN_WIDTH,
      (index + 1) * SCREEN_WIDTH,
    ];
    const dotWidth = interpolate(
      scrollX.value,
      inputRange,
      [8, 28, 8],
      Extrapolation.CLAMP
    );
    const opacity = interpolate(
      scrollX.value,
      inputRange,
      [0.4, 1, 0.4],
      Extrapolation.CLAMP
    );
    return { width: dotWidth, opacity };
  });

  return (
    <Animated.View
      style={[style, { backgroundColor: APP_COLORS.primary }]}
      className="mx-1 h-2 rounded-full"
    />
  );
}

// Onboarding de marque (une seule fois, cf. lib/onboardingStorage.ts) —
// introduit NBN Express avant le login réel (MOBILE-G02).
export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const scrollX = useSharedValue(0);
  const listRef = useRef<Animated.FlatList<OnboardingSlide>>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const isLastSlide = activeIndex === ONBOARDING_SLIDES.length - 1;

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  const finishOnboarding = async () => {
    await markOnboardingSeen();
    router.replace('/login');
  };

  const goNext = () => {
    if (isLastSlide) {
      finishOnboarding();
      return;
    }
    listRef.current?.scrollToOffset({
      offset: (activeIndex + 1) * SCREEN_WIDTH,
      animated: true,
    });
  };

  return (
    <View className="flex-1" style={{ backgroundColor: APP_COLORS.foreground }}>
      {!isLastSlide && (
        <TouchableOpacity
          onPress={finishOnboarding}
          className="absolute right-6 z-10 rounded-full px-4 py-2"
          style={{ top: insets.top + 12, backgroundColor: 'rgba(255,255,255,0.18)' }}
        >
          <Text className="text-white" style={{ fontFamily: 'Inter_500Medium', fontSize: 14 }}>
            Passer
          </Text>
        </TouchableOpacity>
      )}

      <AnimatedFlatList
        ref={listRef}
        data={ONBOARDING_SLIDES}
        keyExtractor={(item) => item.key}
        renderItem={({ item }) => <Slide item={item} />}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(e) => {
          setActiveIndex(Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH));
        }}
      />

      <View
        className="absolute bottom-0 left-0 right-0 px-8"
        style={{ paddingBottom: insets.bottom + 24 }}
      >
        <View className="flex-row justify-center mb-6">
          {ONBOARDING_SLIDES.map((slide, index) => (
            <Dot key={slide.key} index={index} scrollX={scrollX} />
          ))}
        </View>

        <TouchableOpacity
          onPress={goNext}
          className="items-center py-4"
          style={{ backgroundColor: APP_COLORS.primary, borderRadius: APP_RADIUS.xl }}
        >
          <Text
            style={{ fontFamily: 'Inter_600SemiBold', fontSize: 16, color: APP_COLORS.primaryForeground }}
          >
            {isLastSlide ? 'Commencer' : 'Suivant'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
