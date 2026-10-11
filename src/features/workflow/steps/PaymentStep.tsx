import { Button, ButtonText, Card, Heading, HStack, Text, VStack } from '@gluestack-ui/themed';
import { View } from 'react-native';

import { CheckCircleIcon } from '@/components/ui/icons';

import { MutationError, Section } from '../components/shared';
import type { WorkflowController } from '../useWorkflow';
import { styles } from '../workflow.styles';

export function PaymentStep({ w }: { w: WorkflowController }) {
  const {
    currentPolicy, payment, paymentOrder, paymentConfirmation,
    createPayment, confirmPayment, setStep,
  } = w;

  return (
    <Section
      title="4. Policy Payment & Verification"
      subtitle="Complete payment authorization to activate full policy coverage."
    >
      <VStack space="md">
        {currentPolicy ? (
          <Card style={styles.orderSummaryCard}>
            <HStack alignItems="center" justifyContent="space-between" style={{ marginBottom: 6 }}>
              <Text style={styles.resultKicker}>POLICY DETAILS</Text>
              <View style={styles.briefPill}>
                <Text style={styles.briefPillText}>{currentPolicy.status}</Text>
              </View>
            </HStack>
            <Heading size="md" style={styles.orderPolicyNum}>{currentPolicy.policyNumber}</Heading>
            <Text style={styles.orderFarmer}>
              {currentPolicy.farmerName} · {currentPolicy.planName}
            </Text>
            <Text style={styles.mutedText}>
              Pump Capacity: {currentPolicy.pumpPowerHp} HP ({currentPolicy.motorHeadMeters}m head)
            </Text>
            <View style={styles.planDivider} />
            <HStack alignItems="center" justifyContent="space-between">
              <Text style={styles.totalLabel}>Total Payable</Text>
              <Text style={styles.orderTotal}>
                ₹{currentPolicy.totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </Text>
            </HStack>
          </Card>
        ) : null}

        {!payment ? (
          <VStack space="md">
            <MutationError error={paymentOrder.error} />
            <Button isDisabled={paymentOrder.isPending} onPress={createPayment} style={styles.primaryButton}>
              <ButtonText>
                {paymentOrder.isPending ? 'Generating Order…' : 'Generate Payment Order'}
              </ButtonText>
            </Button>
          </VStack>
        ) : (
          <Card style={styles.paymentCard}>
            <VStack space="sm">
              <HStack alignItems="center" justifyContent="space-between">
                <Text style={styles.resultKicker}>GATEWAY STATUS</Text>
                <View
                  style={[
                    styles.briefPill,
                    payment.status === 'SUCCESS' ? styles.briefPillSuccess : styles.briefPillPending,
                  ]}
                >
                  <Text style={styles.briefPillText}>{payment.status}</Text>
                </View>
              </HStack>
              <Heading size="sm" style={styles.paymentOrderNum}>
                Order Reference: {payment.paymentNumber}
              </Heading>
              <Text style={styles.mutedText}>
                Payment Channel: {payment.gateway || 'Digital Gateway'}
              </Text>

              {payment.status === 'SUCCESS' ? (
                <Button onPress={() => setStep('complete')} style={styles.primaryButton}>
                  <ButtonText>View Active Policy & Invoice ›</ButtonText>
                </Button>
              ) : payment.status === 'PENDING' ? (
                <VStack space="sm" style={{ marginTop: 8 }}>
                  <MutationError error={paymentConfirmation.error} />
                  <Button
                    isDisabled={paymentConfirmation.isPending}
                    onPress={confirmPayment}
                    style={styles.primaryButton}
                  >
                    <HStack alignItems="center" space="xs">
                      <CheckCircleIcon size={18} color="#c5e86c" strokeWidth={2.4} />
                      <ButtonText style={styles.primaryButtonText}>
                        {paymentConfirmation.isPending
                          ? 'Verifying Authorization…'
                          : 'Authorize & Complete Payment'}
                      </ButtonText>
                    </HStack>
                  </Button>
                </VStack>
              ) : null}
            </VStack>
          </Card>
        )}
      </VStack>
    </Section>
  );
}
