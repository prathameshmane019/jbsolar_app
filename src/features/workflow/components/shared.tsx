import { Card, Heading, HStack, Text, VStack } from '@gluestack-ui/themed';
import type { PropsWithChildren } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { AlertCircleIcon, CheckIcon, CloseIcon } from '@/components/ui/icons';
import { AppColors } from '@/constants/theme';
import { getApiErrorMessage } from '@/lib/api';

import type { EvidenceState } from '../helpers';
import { styles } from '../workflow.styles';

export function Section({
  title,
  subtitle,
  children,
}: PropsWithChildren<{ title: string; subtitle: string }>) {
  return (
    <Card style={styles.sectionCard}>
      <VStack space="md">
        <VStack space="xs">
          <Heading size="md" style={styles.sectionHeading}>{title}</Heading>
          <Text style={styles.sectionSubtitle}>{subtitle}</Text>
        </VStack>
        {children}
      </VStack>
    </Card>
  );
}

export function ErrorMessage({ message }: { message: string }) {
  return (
    <View style={styles.errorBox}>
      <HStack alignItems="flex-start" space="xs">
        <AlertCircleIcon size={16} color={AppColors.error} strokeWidth={2} />
        <Text accessibilityRole="alert" style={styles.errorText}>{message}</Text>
      </HStack>
    </View>
  );
}

export function MutationError({ error }: { error: unknown }) {
  return error ? <ErrorMessage message={getApiErrorMessage(error)} /> : null;
}

export function AttachmentStatusRow({
  item,
  onRetry,
}: {
  item: NonNullable<EvidenceState>;
  onRetry: () => void;
}) {
  const isUploaded = item.status === 'uploaded';
  const isFailed = item.status === 'failed';

  return (
    <HStack style={styles.attachmentRow} alignItems="center" space="sm">
      <View
        style={[
          styles.statusMiniCircle,
          isUploaded ? styles.statusMiniCircleSuccess : isFailed ? styles.statusMiniCircleError : {},
        ]}
      >
        {isUploaded ? (
          <CheckIcon size={12} color="#166534" strokeWidth={3} />
        ) : isFailed ? (
          <CloseIcon size={12} color="#b42318" strokeWidth={3} />
        ) : (
          <ActivityIndicator color={AppColors.brand} size="small" />
        )}
      </View>
      <VStack style={styles.attachmentCopy} space="xs">
        <Text numberOfLines={1} style={styles.attachmentName}>{item.name}</Text>
        <Text style={[styles.attachmentStatus, isFailed && styles.errorText]}>
          {isUploaded
            ? 'Uploaded securely'
            : item.status === 'uploading'
              ? 'Uploading to cloud…'
              : item.error ?? 'Upload failed'}
        </Text>
      </VStack>
      {isFailed ? (
        <Pressable accessibilityRole="button" onPress={onRetry} style={styles.retryPill}>
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      ) : null}
    </HStack>
  );
}
