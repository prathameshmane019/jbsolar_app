import { zodResolver } from '@hookform/resolvers/zod';
import {
  Button,
  ButtonText,
  Heading,
  HStack,
  Input,
  InputField,
  Text,
  VStack,
} from '@gluestack-ui/themed';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { z } from 'zod';

import {
  AlertCircleIcon,
  EyeIcon,
  EyeOffIcon,
  LockIcon,
  PhoneIcon,
  SunIcon,
} from '@/components/ui/icons';
import { AppColors } from '@/constants/theme';
import { getApiErrorMessage, loginAgent } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';

const loginSchema = z.object({
  mobile: z.string().trim().min(1, 'Enter your registered mobile number.'),
  password: z.string().min(1, 'Enter your password.'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const router = useRouter();
  const setSession = useAuthStore((state) => state.setSession);
  const [showPassword, setShowPassword] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const passwordFocused = useRef(false);

  useEffect(() => {
    let scrollTimeout: ReturnType<typeof setTimeout> | undefined;
    const keyboardShown = Keyboard.addListener('keyboardDidShow', () => {
      setKeyboardVisible(true);
      if (passwordFocused.current) {
        scrollTimeout = setTimeout(
          () => scrollViewRef.current?.scrollToEnd({ animated: true }),
          80,
        );
      }
    });
    const keyboardHidden = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardVisible(false);
      passwordFocused.current = false;
      scrollViewRef.current?.scrollTo({ y: 0, animated: false });
    });

    return () => {
      if (scrollTimeout) clearTimeout(scrollTimeout);
      keyboardShown.remove();
      keyboardHidden.remove();
    };
  }, []);

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { mobile: '', password: '' },
  });

  const loginMutation = useMutation({
    mutationFn: loginAgent,
    onSuccess: async (session) => {
      if (session.role !== 'VENDOR_AGENT') {
        setError('root.serverError', {
          type: 'server',
          message: 'This account is not registered as a vendor agent.',
        });
        return;
      }

      try {
        await setSession(session);
        router.replace('/dashboard');
      } catch (error) {
        setError('root.serverError', {
          type: 'server',
          message: getApiErrorMessage(error),
        });
      }
    },
    onError: (error) => {
      setError('root.serverError', {
        type: 'server',
        message: getApiErrorMessage(error),
      });
    },
  });

  const submit = handleSubmit(({ mobile, password }) => {
    loginMutation.mutate({ mobile: mobile.trim(), password });
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.scrollContent}
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.page}>
            <View style={[styles.hero, keyboardVisible && styles.heroCompact]}>
              {!keyboardVisible && <View style={styles.heroOrbLarge} />}
              {!keyboardVisible && <View style={styles.heroOrbSmall} />}
              <View style={styles.heroContent}>
                <Image
                  source={require('@/assets/jb-solar-logo-transparent.png')}
                  contentFit="contain"
                  accessibilityLabel="JB Solar Solutions logo"
                  style={[styles.logo, keyboardVisible && styles.logoCompact]}
                />
                {!keyboardVisible && (
                  <>
                    <View style={styles.portalBadge}>
                      <SunIcon size={14} color={AppColors.accent} strokeWidth={2.2} />
                      <Text style={styles.portalBadgeText}>FIELD AGENT PORTAL</Text>
                    </View>
                    <Heading size="xl" style={styles.heroHeading}>
                      Clean energy,{'\n'}powered by you.
                    </Heading>
                    <Text style={styles.heroDescription}>
                      Your workspace for farmer onboarding and solar pump policies.
                    </Text>
                  </>
                )}
              </View>
              {!keyboardVisible && <View style={styles.heroAccent} />}
            </View>

            <View style={[styles.formSection, keyboardVisible && styles.formSectionCompact]}>
              <View style={[styles.formContainer, keyboardVisible && styles.formContainerCompact]}>
                <View style={styles.card}>
                  <VStack space="lg">
                    <View style={styles.cardHeader}>
                      <View style={styles.cardHeaderCopy}>
                        <Text style={styles.welcomeLabel}>WELCOME BACK</Text>
                        <Heading size="lg" style={styles.formHeading}>
                          Sign in to continue
                        </Heading>
                        <Text style={styles.formHint}>
                          Enter your JB Solar agent account details.
                        </Text>
                      </View>
                      {!keyboardVisible && (
                        <View style={styles.cardMark}>
                          <Image
                            source={require('@/assets/jb-solar-app-icon-1024.png')}
                            contentFit="cover"
                            accessibilityLabel="JB Solar"
                            style={styles.cardMarkImage}
                          />
                        </View>
                      )}
                    </View>

                    <VStack space="xs">
                      <Text style={styles.label}>Mobile number</Text>
                      <Controller
                        control={control}
                        name="mobile"
                        render={({ field: { onChange, onBlur, value } }) => (
                          <View style={[styles.inputWrapper, errors.mobile && styles.inputWrapperError]}>
                            <View style={styles.inputLeadingIcon}>
                              <PhoneIcon size={18} color={AppColors.textMuted} strokeWidth={2} />
                            </View>
                            <Input variant="outline" style={styles.inputInner}>
                              <InputField
                                value={value}
                                onChangeText={onChange}
                                onBlur={onBlur}
                                placeholder="10-digit mobile number"
                                placeholderTextColor={AppColors.textSubtle}
                                keyboardType="phone-pad"
                                autoComplete="tel"
                                textContentType="telephoneNumber"
                                returnKeyType="next"
                                onFocus={() => {
                                  passwordFocused.current = false;
                                }}
                                style={styles.inputText}
                              />
                            </Input>
                          </View>
                        )}
                      />
                      {errors.mobile?.message ? (
                        <HStack alignItems="center" space="xs" style={styles.errorRow}>
                          <AlertCircleIcon size={14} color={AppColors.error} strokeWidth={2} />
                          <Text style={styles.error}>{errors.mobile.message}</Text>
                        </HStack>
                      ) : null}
                    </VStack>

                    <VStack space="xs">
                      <Text style={styles.label}>Password</Text>
                      <Controller
                        control={control}
                        name="password"
                        render={({ field: { onChange, onBlur, value } }) => (
                          <View style={[styles.inputWrapper, errors.password && styles.inputWrapperError]}>
                            <View style={styles.inputLeadingIcon}>
                              <LockIcon size={18} color={AppColors.textMuted} strokeWidth={2} />
                            </View>
                            <Input variant="outline" style={styles.inputInner}>
                              <InputField
                                value={value}
                                onChangeText={onChange}
                                onBlur={onBlur}
                                placeholder="Enter your password"
                                placeholderTextColor={AppColors.textSubtle}
                                secureTextEntry={!showPassword}
                                autoComplete="current-password"
                                textContentType="password"
                                returnKeyType="done"
                                onSubmitEditing={() => submit()}
                                onFocus={() => {
                                  passwordFocused.current = true;
                                  if (keyboardVisible) {
                                    scrollViewRef.current?.scrollToEnd({ animated: true });
                                  }
                                }}
                                style={styles.inputText}
                              />
                            </Input>
                            <Pressable
                              onPress={() => setShowPassword((prev) => !prev)}
                              style={styles.passwordToggle}
                              accessibilityRole="button"
                              accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                            >
                              {showPassword ? (
                                <EyeOffIcon size={20} color={AppColors.textMuted} strokeWidth={2} />
                              ) : (
                                <EyeIcon size={20} color={AppColors.textMuted} strokeWidth={2} />
                              )}
                            </Pressable>
                          </View>
                        )}
                      />
                      {errors.password?.message ? (
                        <HStack alignItems="center" space="xs" style={styles.errorRow}>
                          <AlertCircleIcon size={14} color={AppColors.error} strokeWidth={2} />
                          <Text style={styles.error}>{errors.password.message}</Text>
                        </HStack>
                      ) : null}
                    </VStack>

                    {errors.root?.serverError?.message ? (
                      <View style={styles.serverErrorBox}>
                        <HStack alignItems="flex-start" space="xs">
                          <AlertCircleIcon size={16} color={AppColors.error} strokeWidth={2} />
                          <Text accessibilityRole="alert" style={styles.serverErrorText}>
                            {errors.root.serverError.message}
                          </Text>
                        </HStack>
                      </View>
                    ) : null}

                    <Button
                      onPress={submit}
                      isDisabled={loginMutation.isPending}
                      style={styles.primaryButton}
                    >
                      <HStack alignItems="center" space="sm">
                        {loginMutation.isPending ? (
                          <ActivityIndicator color="#ffffff" size="small" />
                        ) : null}
                        <ButtonText style={styles.primaryButtonText}>
                          {loginMutation.isPending ? 'Signing in…' : 'Sign in securely'}
                        </ButtonText>
                      </HStack>
                    </Button>
                  </VStack>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: AppColors.brand,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    backgroundColor: AppColors.bg,
  },
  page: {
    flexGrow: 1,
  },
  hero: {
    minHeight: 390,
    paddingTop: 28,
    paddingBottom: 66,
    paddingHorizontal: 24,
    backgroundColor: AppColors.brand,
    overflow: 'hidden',
  },
  heroCompact: {
    minHeight: 0,
    paddingTop: 8,
    paddingBottom: 8,
  },
  heroOrbLarge: {
    position: 'absolute',
    top: -118,
    right: -110,
    width: 300,
    height: 300,
    borderRadius: 150,
    borderWidth: 1,
    borderColor: 'rgba(197, 232, 108, 0.16)',
    backgroundColor: 'rgba(197, 232, 108, 0.045)',
  },
  heroOrbSmall: {
    position: 'absolute',
    top: 48,
    right: 42,
    width: 112,
    height: 112,
    borderRadius: 56,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  heroContent: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    zIndex: 1,
  },
  logo: {
    width: 260,
    maxWidth: '100%',
    height: 92,
    marginBottom: 26,
  },
  logoCompact: {
    width: 170,
    height: 58,
    marginBottom: 0,
  },
  portalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 7,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(197, 232, 108, 0.26)',
    backgroundColor: 'rgba(197, 232, 108, 0.1)',
    marginBottom: 18,
  },
  portalBadgeText: {
    color: AppColors.accent,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  heroHeading: {
    color: '#ffffff',
    fontSize: 34,
    fontWeight: '800',
    lineHeight: 40,
    maxWidth: 360,
  },
  heroDescription: {
    color: 'rgba(255, 255, 255, 0.72)',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 10,
    maxWidth: 350,
  },
  heroAccent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: AppColors.accent,
    opacity: 0.9,
  },
  formSection: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 30,
    backgroundColor: AppColors.bg,
  },
  formSectionCompact: {
    paddingTop: 12,
    paddingBottom: 12,
  },
  formContainer: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    marginTop: -38,
    zIndex: 2,
  },
  formContainerCompact: {
    marginTop: 0,
  },
  card: {
    borderRadius: 24,
    padding: 22,
    backgroundColor: AppColors.surface,
    borderWidth: 1,
    borderColor: '#e5ebe2',
    boxShadow: '0px 8px 20px rgba(22, 59, 45, 0.10)',
    elevation: 5,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 2,
  },
  cardHeaderCopy: {
    flex: 1,
  },
  welcomeLabel: {
    color: AppColors.primaryLight,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.4,
    marginBottom: 5,
  },
  formHeading: {
    color: AppColors.brand,
    fontSize: 22,
    fontWeight: '800',
  },
  formHint: {
    color: AppColors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  cardMark: {
    width: 46,
    height: 46,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: AppColors.borderSubtle,
  },
  cardMarkImage: {
    width: '100%',
    height: '100%',
  },
  label: {
    fontSize: 13,
    color: AppColors.brand,
    fontWeight: '700',
    marginBottom: 3,
  },
  inputWrapper: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: AppColors.border,
    backgroundColor: '#fbfcfa',
    overflow: 'hidden',
  },
  inputWrapperError: {
    borderColor: AppColors.errorBorder,
  },
  inputLeadingIcon: {
    paddingLeft: 14,
    paddingRight: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputInner: {
    flex: 1,
    minHeight: 54,
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  inputText: {
    fontSize: 14,
    color: AppColors.brand,
    paddingRight: 10,
  },
  passwordToggle: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorRow: {
    marginTop: 4,
  },
  error: {
    color: AppColors.error,
    fontSize: 12,
    lineHeight: 16,
  },
  serverErrorBox: {
    backgroundColor: AppColors.errorBg,
    borderColor: AppColors.errorBorder,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  serverErrorText: {
    color: AppColors.error,
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
  },
  primaryButton: {
    borderRadius: 14,
    minHeight: 50,
    marginTop: 2,
    backgroundColor: AppColors.brand,
    borderWidth: 0,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
