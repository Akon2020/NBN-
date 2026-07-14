import { useRef, useState } from 'react';
import { Dimensions, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ONBOARDING_SLIDES, type OnboardingSlide } from '@/constants/onboarding';
import { markOnboardingSeen } from '@/lib/onboardingStorage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const AnimatedFlatList = Animated.createAnimatedComponent(
  Animated.FlatList<OnboardingSlide>
);

function Slide({ item }: { item: OnboardingSlide }) {
  return (
    <View style={{ width: SCREEN_WIDTH }} className="flex-1 items-center px-8 pt-6">
      <LinearGradient
        colors={item.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          width: 220,
          height: 220,
          borderRadius: 110,
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: 24,
          marginBottom: 40,
          shadowColor: item.gradient[1],
          shadowOpacity: 0.35,
          shadowRadius: 24,
          shadowOffset: { width: 0, height: 12 },
          elevation: 8,
        }}
      >
        <MaterialIcons name={item.icon} size={92} color="#fff" />
      </LinearGradient>

      <Text
        className="text-center text-neutral-900 dark:text-white"
        style={{ fontFamily: 'Manrope_600SemiBold', fontSize: 28, lineHeight: 36 }}
      >
        {item.title}
      </Text>
      <Text
        className="mt-4 text-center text-neutral-600 dark:text-neutral-300"
        style={{ fontFamily: 'Inter_400Regular', fontSize: 16, lineHeight: 24 }}
      >
        {item.description}
      </Text>
    </View>
  );
}

function Dot({ index, scrollX }: { index: number; scrollX: SharedValue<number> }) {
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
      [0.3, 1, 0.3],
      Extrapolation.CLAMP
    );
    return { width: dotWidth, opacity };
  });

  return (
    <Animated.View
      style={style}
      className="mx-1 h-2 rounded-full bg-primary-900 dark:bg-white"
    />
  );
}

// Onboarding de marque (une seule fois, cf. lib/onboardingStorage.ts) —
// introduit NBN Express avant le login réel (MOBILE-G02).
export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
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
    <View className="flex-1 bg-white dark:bg-neutral-900" style={{ paddingTop: insets.top }}>
      {!isLastSlide && (
        <TouchableOpacity
          onPress={finishOnboarding}
          className="absolute right-6 z-10"
          style={{ top: insets.top + 12 }}
        >
          <Text
            className="text-neutral-600 dark:text-neutral-300"
            style={{ fontFamily: 'Inter_500Medium', fontSize: 15 }}
          >
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

      <View className="flex-row justify-center py-6">
        {ONBOARDING_SLIDES.map((slide, index) => (
          <Dot key={slide.key} index={index} scrollX={scrollX} />
        ))}
      </View>

      <View className="px-8" style={{ paddingBottom: insets.bottom + 20 }}>
        <TouchableOpacity
          onPress={goNext}
          className="items-center rounded-2xl bg-primary-900 py-4"
        >
          <Text
            className="text-white"
            style={{ fontFamily: 'Inter_600SemiBold', fontSize: 16 }}
          >
            {isLastSlide ? 'Commencer' : 'Suivant'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
