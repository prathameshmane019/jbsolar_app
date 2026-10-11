import { Button, ButtonText, Card, Heading, HStack, Image, Text, VStack } from '@gluestack-ui/themed';
import { View } from 'react-native';

import { SignatureCanvas } from '@/components/signature-canvas';
import { CameraIcon, CheckIcon } from '@/components/ui/icons';
import { AppColors } from '@/constants/theme';

import { AttachmentStatusRow, ErrorMessage, Section } from '../components/shared';
import type { WorkflowController } from '../useWorkflow';
import { styles } from '../workflow.styles';

function UploadedTag() {
  return (
    <View style={styles.verifiedTag}>
      <CheckIcon size={12} color="#166534" strokeWidth={3} />
      <Text style={styles.verifiedTagText}>UPLOADED</Text>
    </View>
  );
}

export function EvidenceStep({ w }: { w: WorkflowController }) {
  const {
    currentPolicy, evidence, evidenceError, haveBothImages, paymentOrder,
    uploadEvidenceImage, capturePumpSetImage, proceedToPayment, setScrollEnabled,
  } = w;

  const signature = evidence.CUSTOMER_SIGNATURE;
  const pump = evidence.PUMP_SET_IMAGE;
  const signatureLocked = signature?.status === 'uploaded' || signature?.status === 'uploading';
  const pumpLocked = pump?.status === 'uploaded' || pump?.status === 'uploading';

  return (
    <Section
      title="3. Field Evidence & Customer Consent"
      subtitle="Capture customer signature and take photo of the solar pump set."
    >
      <VStack space="md">
        {currentPolicy ? (
          <Card style={styles.policyBriefCard}>
            <HStack alignItems="center" justifyContent="space-between">
              <VStack space="xs">
                <Text style={styles.resultKicker}>POLICY IN DRAFT</Text>
                <Heading size="sm" style={styles.policyBriefNum}>{currentPolicy.policyNumber}</Heading>
                <Text style={styles.mutedText}>
                  {currentPolicy.pumpPowerHp} HP · {currentPolicy.motorHeadMeters}m head
                </Text>
              </VStack>
              <View style={styles.briefPill}>
                <Text style={styles.briefPillText}>READY FOR EVIDENCE</Text>
              </View>
            </HStack>
          </Card>
        ) : null}

        {/* Evidence 1: signature */}
        <Card style={styles.evidenceSectionCard}>
          <VStack space="xs">
            <HStack alignItems="center" space="xs">
              <Text style={styles.resultKicker}>REQUIRED EVIDENCE 1</Text>
              {signature?.status === 'uploaded' ? <UploadedTag /> : null}
            </HStack>
            <Heading size="sm" style={styles.evidenceTitle}>Customer Touch Signature</Heading>
            <Text style={styles.mutedText}>
              Have the farmer sign with their finger inside the canvas to consent to the policy terms.
            </Text>
          </VStack>

          <SignatureCanvas
            disabled={signatureLocked}
            onDrawStart={() => setScrollEnabled(false)}
            onDrawEnd={() => setScrollEnabled(true)}
            onSave={(att) => void uploadEvidenceImage('CUSTOMER_SIGNATURE', att)}
          />

          {signature ? (
            <AttachmentStatusRow
              item={signature}
              onRetry={() => void uploadEvidenceImage('CUSTOMER_SIGNATURE', signature)}
            />
          ) : null}
        </Card>

        {/* Evidence 2: pump photo */}
        <Card style={styles.evidenceSectionCard}>
          <VStack space="xs">
            <HStack alignItems="center" space="xs">
              <Text style={styles.resultKicker}>REQUIRED EVIDENCE 2</Text>
              {pump?.status === 'uploaded' ? <UploadedTag /> : null}
            </HStack>
            <Heading size="sm" style={styles.evidenceTitle}>Installed Solar Pump Set Photo</Heading>
            <Text style={styles.mutedText}>
              Capture clear photo of the pump set, panels, and motor installed at the farmer site.
            </Text>
          </VStack>

          {pump?.uri ? (
            <View style={styles.imagePreviewWrap}>
              <Image source={{ uri: pump.uri }} alt="Pump set" style={styles.imagePreview} />
            </View>
          ) : null}

          {pump ? (
            <AttachmentStatusRow
              item={pump}
              onRetry={() => void uploadEvidenceImage('PUMP_SET_IMAGE', pump)}
            />
          ) : null}

          <Button
            variant="outline"
            isDisabled={pumpLocked}
            onPress={() => void capturePumpSetImage()}
            style={styles.cameraBtn}
          >
            <HStack alignItems="center" space="xs">
              <CameraIcon size={18} color={AppColors.brand} strokeWidth={2.2} />
              <ButtonText style={styles.cameraBtnText}>
                {pump ? 'Retake Photo' : 'Open Camera to Capture'}
              </ButtonText>
            </HStack>
          </Button>
        </Card>

        {evidenceError ? <ErrorMessage message={evidenceError} /> : null}

        <Button
          isDisabled={!haveBothImages || paymentOrder.isPending}
          onPress={proceedToPayment}
          style={styles.primaryButton}
        >
          <ButtonText>
            {paymentOrder.isPending
              ? 'Preparing Payment '
              : 'Proceed to Payment›'}
          </ButtonText>
        </Button>
      </VStack>
    </Section>
  );
}
