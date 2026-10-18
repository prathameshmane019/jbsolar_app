import { Card, Heading, HStack, Text, VStack } from '@gluestack-ui/themed';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import {
  CameraIcon,
  CheckCircleIcon,
  SearchIcon,
  ZapIcon,
} from '@/components/ui/icons';
import { AppColors } from '@/constants/theme';

const steps = [
  {
    title: 'Farmer details',
    description: 'Find an existing farmer or register a new profile.',
    icon: SearchIcon,
    color: '#0369a1',
    background: '#e0f2fe',
  },
  {
    title: 'Pump set & plan',
    description: 'Add pump capacity and motor head, then select a policy plan.',
    icon: ZapIcon,
    color: '#b45309',
    background: '#fef3c7',
  },
  {
    title: 'Evidence',
    description: 'Capture the customer signature and pump installation photo.',
    icon: CameraIcon,
    color: '#4338ca',
    background: '#e0e7ff',
  },
  {
    title: 'Payment & policy',
    description: 'Complete payment verification to activate the policy and generate its invoice.',
    icon: CheckCircleIcon,
    color: '#15803d',
    background: '#dcfce7',
  },
];

export function WorkflowOverview() {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card style={styles.card}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={expanded ? 'Hide registration steps' : 'Show registration steps'}
        accessibilityState={{ expanded }}
        onPress={() => setExpanded((current) => !current)}
        style={({ pressed }) => [styles.trigger, pressed && styles.pressed]}
      >
        <View style={styles.titleGroup}>
          <Heading size="sm" style={styles.title}>Registration steps</Heading>
          <Text style={styles.subtitle}>A quick guide to the process</Text>
        </View>
        <Text style={styles.toggle}>{expanded ? 'Hide' : 'View steps'}</Text>
      </Pressable>

      {expanded ? (
        <VStack space="md" style={styles.steps}>
          {steps.map((step, index) => {
            const StepIcon = step.icon;
            return (
              <HStack key={step.title} alignItems="center" space="md" style={styles.row}>
                <View style={[styles.iconWrap, { backgroundColor: step.background }]}>
                  <StepIcon size={17} color={step.color} strokeWidth={2.2} />
                </View>
                <VStack space="xs" style={styles.copy}>
                  <Text style={styles.stepTitle}>{index + 1}. {step.title}</Text>
                  <Text style={styles.description}>{step.description}</Text>
                </VStack>
              </HStack>
            );
          })}
        </VStack>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    backgroundColor: AppColors.surface,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  trigger: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  pressed: { opacity: 0.72 },
  titleGroup: { flex: 1 },
  title: { color: AppColors.brand, fontWeight: '800' },
  subtitle: { color: AppColors.textMuted, fontSize: 11, marginTop: 3 },
  toggle: { color: AppColors.primaryLight, fontSize: 12, fontWeight: '800' },
  steps: { marginTop: 14 },
  row: { alignItems: 'center' },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { flex: 1 },
  stepTitle: { color: AppColors.brand, fontSize: 13, fontWeight: '700' },
  description: { color: AppColors.textMuted, fontSize: 12, lineHeight: 17 },
});
