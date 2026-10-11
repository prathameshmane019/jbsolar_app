import { Button, ButtonText, Card, Heading, HStack, Text, VStack } from '@gluestack-ui/themed';
import { ActivityIndicator, View } from 'react-native';

import { CheckIcon, DownloadIcon, ShareIcon } from '@/components/ui/icons';
import { AppColors } from '@/constants/theme';
import { getApiErrorMessage } from '@/lib/api';

import { ErrorMessage, Section } from '../components/shared';
import type { WorkflowController } from '../useWorkflow';
import { styles } from '../workflow.styles';

export function CompleteStep({ w }: { w: WorkflowController }) {
  const { router, currentPolicy, policyQuery, invoiceQuery, invoiceAction, handleInvoiceAction } = w;
  const invoice = invoiceQuery.data;

  return (
    <Section
      title="5. Enrollment Complete"
      subtitle="The policy has been verified and activated. You can download or share the official tax invoice PDF."
    >
      <VStack space="md">
        <Card style={styles.successBannerCard}>
          <VStack alignItems="center" space="xs">
            <View style={styles.successCheckCircle}>
              <CheckIcon size={28} color="#166534" strokeWidth={3} />
            </View>
            <Heading size="md" style={styles.successTitle}>Policy Activated Successfully!</Heading>
            <Text style={styles.successSub}>
              {policyQuery.data?.policyNumber ?? currentPolicy?.policyNumber}
            </Text>
            <Text style={styles.successFarmer}>
              Coverage active for {policyQuery.data?.farmerName ?? currentPolicy?.farmerName}
            </Text>
          </VStack>
        </Card>

        {invoiceQuery.isPending ? (
          <Card style={styles.resultCard}>
            <HStack alignItems="center" space="sm" justifyContent="center">
              <ActivityIndicator color={AppColors.brand} size="small" />
              <Text style={styles.mutedText}>Retrieving official tax invoice…</Text>
            </HStack>
          </Card>
        ) : null}

        {invoiceQuery.isError ? (
          <VStack space="sm">
            <ErrorMessage message={getApiErrorMessage(invoiceQuery.error)} />
            <Button variant="outline" onPress={() => void invoiceQuery.refetch()}>
              <ButtonText>Retry Invoice Retrieval</ButtonText>
            </Button>
          </VStack>
        ) : null}

        {invoice ? (
          <Card style={styles.invoiceCard}>
            <VStack space="md">
              <HStack alignItems="center" justifyContent="space-between">
                <VStack space="xs">
                  <Text style={styles.resultKicker}>OFFICIAL TAX INVOICE</Text>
                  <Heading size="sm" style={styles.invoiceNum}>{invoice.invoiceNumber}</Heading>
                </VStack>
                <Text style={styles.invoiceDate}>{invoice.invoiceDate}</Text>
              </HStack>

              <HStack alignItems="center" justifyContent="space-between">
                <Text style={styles.priceLabel}>Paid in Full</Text>
                <Text style={styles.invoiceAmount}>
                  ₹{invoice.totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </Text>
              </HStack>

              <View style={styles.planDivider} />

              <HStack space="sm">
                <Button
                  isDisabled={invoiceAction !== null}
                  onPress={() => void handleInvoiceAction(invoice, 'download')}
                  style={styles.downloadBtn}
                >
                  <HStack alignItems="center" space="xs">
                    <DownloadIcon size={16} color="#ffffff" strokeWidth={2.4} />
                    <ButtonText style={styles.btnTextWhite}>
                      {invoiceAction === 'download' ? 'Saving…' : 'Download'}
                    </ButtonText>
                  </HStack>
                </Button>

                <Button
                  variant="outline"
                  isDisabled={invoiceAction !== null}
                  onPress={() => void handleInvoiceAction(invoice, 'share')}
                  style={styles.shareBtn}
                >
                  <HStack alignItems="center" space="xs">
                    <ShareIcon size={16} color={AppColors.brand} strokeWidth={2.4} />
                    <ButtonText style={styles.btnTextDark}>
                      {invoiceAction === 'share' ? 'Preparing…' : 'Share PDF'}
                    </ButtonText>
                  </HStack>
                </Button>
              </HStack>
            </VStack>
          </Card>
        ) : null}

        <Button onPress={() => router.replace('/dashboard')} style={styles.primaryButton}>
          <ButtonText>Return to Dashboard</ButtonText>
        </Button>
      </VStack>
    </Section>
  );
}
