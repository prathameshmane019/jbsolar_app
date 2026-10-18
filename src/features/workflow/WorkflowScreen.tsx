/**
 * Route file: re-export from app/workflow.tsx:
 *   export { default } from '@/features/workflow/WorkflowScreen';
 */
import { Button, ButtonText, Card, Heading, HStack, ScrollView, Text, VStack } from '@gluestack-ui/themed';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CheckIcon, CloseIcon, SunIcon } from '@/components/ui/icons';
import { AppColors } from '@/constants/theme';

import { workflowSteps } from './helpers';
import { CompleteStep } from './steps/CompleteStep';
import { EvidenceStep } from './steps/EvidenceStep';
import { FarmerStep } from './steps/FarmerStep';
import { PaymentStep } from './steps/PaymentStep';
import { SystemStep } from './steps/SystemStep';
import { WorkflowOverview } from './components/WorkflowOverview';
import { useWorkflow } from './useWorkflow';
import { styles } from './workflow.styles';

export default function WorkflowScreen() {
  const w = useWorkflow();
  const { step, stepIndex, loadingResumePolicy } = w;

  return (
    <SafeAreaView style={styles.safeArea}>
      <VStack style={styles.screen} space="md">
        <WorkflowHeader onClose={() => w.router.back()} />

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          scrollEnabled={w.scrollEnabled}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
        >
          <VStack space="md">
            <StepProgress stepIndex={stepIndex} />
            <WorkflowOverview />

            {loadingResumePolicy ? (
              <Card style={styles.resultCard}>
                <HStack alignItems="center" space="sm" justifyContent="center">
                  <ActivityIndicator color={AppColors.brand} size="small" />
                  <Text style={styles.mutedText}>Loading policy details…</Text>
                </HStack>
              </Card>
            ) : (
              <>
                {step === 'farmer' && <FarmerStep w={w} />}
                {step === 'system' && <SystemStep w={w} />}
                {step === 'evidence' && <EvidenceStep w={w} />}
                {step === 'payment' && <PaymentStep w={w} />}
                {step === 'complete' && <CompleteStep w={w} />}

                {step !== 'payment' && step !== 'complete' && (
                  <StepNav
                    stepIndex={stepIndex}
                    disabled={w.policyCreation.isPending || w.policyUpdate.isPending}
                    onBack={w.goBack}
                  />
                )}
              </>
            )}
          </VStack>
        </ScrollView>
      </VStack>
    </SafeAreaView>
  );
}

function WorkflowHeader({ onClose }: { onClose: () => void }) {
  return (
    <HStack style={styles.topbar} alignItems="center" justifyContent="space-between">
      <HStack alignItems="center" space="sm">
        <View style={styles.topLogo}>
          <SunIcon size={20} color="#f59e0b" strokeWidth={2.4} />
        </View>
        <VStack space="xs">
          <Text style={styles.eyebrow}>FIELD REGISTRATION</Text>
          <Heading size="md" style={styles.heading}>Solar Pump Policy</Heading>
        </VStack>
      </HStack>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close workflow"
        onPress={onClose}
        style={styles.closeButton}
      >
        <CloseIcon size={18} color={AppColors.brand} strokeWidth={2.4} />
      </Pressable>
    </HStack>
  );
}

function StepProgress({ stepIndex }: { stepIndex: number }) {
  return (
    <Card style={styles.progressCard}>
      <HStack style={styles.progressTrack} alignItems="center" justifyContent="space-between">
        {workflowSteps.map((item, index) => {
          const isDone = index < stepIndex;
          const isCurrent = index === stepIndex;
          return (
            <View key={item.id} style={styles.progressStepWrap}>
              <View
                style={[
                  styles.progressCircle,
                  isDone && styles.progressCircleDone,
                  isCurrent && styles.progressCircleCurrent,
                ]}
              >
                {isDone ? (
                  <CheckIcon size={12} color="#ffffff" strokeWidth={3} />
                ) : (
                  <Text style={[styles.progressNum, isCurrent && styles.progressNumCurrent]}>
                    {index + 1}
                  </Text>
                )}
              </View>
              <Text
                style={[styles.progressTitle, isCurrent && styles.progressTitleCurrent]}
                numberOfLines={1}
              >
                {item.title}
              </Text>
            </View>
          );
        })}
      </HStack>
    </Card>
  );
}

function StepNav({
  stepIndex,
  disabled,
  onBack,
}: {
  stepIndex: number;
  disabled?: boolean;
  onBack: () => void;
}) {
  return (
    <HStack style={styles.navRow} alignItems="center" justifyContent="space-between">
      <Button
        variant="outline"
        isDisabled={stepIndex === 0 || disabled}
        onPress={onBack}
        style={styles.navButton}
      >
        <ButtonText style={{ color: AppColors.textMuted }}>‹ Previous Step</ButtonText>
      </Button>
      <Text style={styles.navHint}>Step {stepIndex + 1} of 5</Text>
    </HStack>
  );
}
