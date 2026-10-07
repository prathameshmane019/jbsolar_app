import { zodResolver } from '@hookform/resolvers/zod';
import {
  Button,
  ButtonText,
  Card,
  Heading,
  HStack,
  Input,
  InputField,
  Text,
  VStack,
} from '@gluestack-ui/themed';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { z } from 'zod';

import {
  AlertCircleIcon,
  EyeIcon,
  EyeOffIcon,
  LockIcon,
  PhoneIcon,
  SunIcon,
  ZapIcon,
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
      <VStack style={styles.container} space="xl">
        {/* Brand Header */}
        <VStack space="md" style={styles.headerBlock}>
          <HStack alignItems="center" space="sm" style={styles.brandRow}>
            <View style={styles.logoBadge}>
              <SunIcon size={24} color="#f59e0b" strokeWidth={2.4} />
            </View>
            <VStack space="xs">
              <HStack alignItems="center" space="xs">
                <Text style={styles.brandTitle}>JB SOLAR</Text>
              
              </HStack>
              <Text style={styles.brandSub}>Solar System Services and Maintenance</Text>
            </VStack>
          </HStack>

          <VStack space="xs" style={styles.titleSpacing}>
            <Heading size="xl" style={styles.heading}>
              Agent Sign In
            </Heading>
            <Text style={styles.subtitle}>
              Manage farmer registrations, capture pump installations, and issue policy agreements.
            </Text>
          </VStack>
        </VStack>

        {/* Login Form Card */}
        <Card style={styles.card}>
          <VStack space="lg">
            {/* Mobile Input */}
            <VStack space="xs">
              <Text style={styles.label}>Mobile Number</Text>
              <Controller
                control={control}
                name="mobile"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View style={styles.inputWrapper}>
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

            {/* Password Input */}
            <VStack space="xs">
              <Text style={styles.label}>Password</Text>
              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View style={styles.inputWrapper}>
                    <View style={styles.inputLeadingIcon}>
                      <LockIcon size={18} color={AppColors.textMuted} strokeWidth={2} />
                    </View>
                    <Input variant="outline" style={styles.inputInner}>
                      <InputField
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        placeholder="Enter your agent password"
                        placeholderTextColor={AppColors.textSubtle}
                        secureTextEntry={!showPassword}
                        autoComplete="current-password"
                        textContentType="password"
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

            {/* Root Server Error */}
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

            {/* Submit Button */}
            <Button
              onPress={submit}
              isDisabled={loginMutation.isPending}
              style={styles.primaryButton}
            >
              <HStack alignItems="center" space="xs">
                <ButtonText style={styles.primaryButtonText}>
                  {loginMutation.isPending ? 'Verifying agent credentials…' : 'Sign in securely'}
                </ButtonText>
              </HStack>
            </Button>
          </VStack>
        </Card>

       
 
      </VStack>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: AppColors.bg,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 22,
    paddingVertical: 24,
  },
  headerBlock: {
    marginBottom: 4,
  },
  brandRow: {
    alignItems: 'center',
  },
  logoBadge: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#fffbeb',
    borderWidth: 1.5,
    borderColor: '#fde68a',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#d97706',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
  },
  brandTitle: {
    color: AppColors.brand,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  tagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: AppColors.accentLight,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tagText: {
    color: AppColors.brand,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  brandSub: {
    color: AppColors.textMuted,
    fontSize: 12,
    fontWeight: '500',
  },
  titleSpacing: {
    marginTop: 6,
  },
  heading: {
    color: AppColors.brand,
    fontSize: 26,
    fontWeight: '800',
  },
  subtitle: {
    color: AppColors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    maxWidth: 360,
  },
  card: {
    borderRadius: 22,
    padding: 22,
    backgroundColor: AppColors.surface,
    borderWidth: 1,
    borderColor: AppColors.border,
    shadowColor: AppColors.brand,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  label: {
    fontSize: 13,
    color: AppColors.brand,
    fontWeight: '700',
    marginBottom: 2,
  },
  inputWrapper: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: AppColors.border,
    backgroundColor: '#fafcfa',
    overflow: 'hidden',
  },
  inputLeadingIcon: {
    paddingLeft: 14,
    paddingRight: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputInner: {
    flex: 1,
    minHeight: 50,
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
    minHeight: 52,
    marginTop: 8,
    backgroundColor: AppColors.brand,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  connectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  connectionTitle: {
    color: AppColors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
  },
  connectionStatusText: {
    color: '#10b981',
    fontSize: 11,
    fontWeight: '700',
  },
  connectionUrl: {
    color: AppColors.primaryLight,
    fontSize: 12,
    fontWeight: '600',
  },
  connectionHelp: {
    color: AppColors.textSubtle,
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
  },
  securityNote: {
    color: AppColors.textMuted,
    fontSize: 11,
    textAlign: 'center',
    fontWeight: '500',
  },
});
