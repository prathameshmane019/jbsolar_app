import { Button, ButtonText, Card, Heading, HStack, Text, VStack } from '@gluestack-ui/themed';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { Field } from '@/components/form-field';
import { CheckIcon, UserIcon } from '@/components/ui/icons';
import { AppColors } from '@/constants/theme';
import { getApiErrorMessage } from '@/lib/api';

import type { PolicyPlan } from '@/types';

import { ErrorMessage, MutationError, Section } from '../components/shared';
import { HEAD_PRESETS, HP_PRESETS } from '../helpers';
import type { WorkflowController } from '../useWorkflow';
import { styles } from '../workflow.styles';

export function SystemStep({ w }: { w: WorkflowController }) {
  const {
    farmer, currentPolicy, pendingFarmerPolicies, resumePendingPolicy,
    powerHp, setPowerHp, headMeters, setHeadMeters,
    plansQuery, selectedPlan, setSelectedPlan,
    policyCreation, policyUpdate, canCreatePolicy, isCompletingExisting, startPolicy,
  } = w;

  const farmerName = farmer?.fullName ?? currentPolicy?.farmerName ?? 'farmer';
  const isSaving = policyCreation.isPending || policyUpdate.isPending;

  return (
    <Section
      title="2. Pump Set & Policy Plan"
      subtitle={`Assign solar pump specifications${
        isCompletingExisting ? '' : ' and select a coverage plan'
      } for ${farmerName}.`}
    >
      <VStack space="md">
        {farmer ? (
          <Card style={styles.selectedFarmerBadge}>
            <HStack alignItems="center" space="sm">
              <UserIcon size={16} color={AppColors.brand} strokeWidth={2.2} />
              <VStack space="xs" style={{ flex: 1 }}>
                <Text style={styles.selectedFarmerName}>{farmer.fullName}</Text>
                <Text style={styles.selectedFarmerSub}>
                  {farmer.village}, {farmer.district} · {farmer.mobile}
                </Text>
              </VStack>
            </HStack>
          </Card>
        ) : null}

        {pendingFarmerPolicies.length ? (
          <Card style={styles.pendingPoliciesCard}>
            <VStack space="xs">
              <Heading size="sm" style={styles.pendingCardHeading}>
                Existing Pending Policy Found
              </Heading>
              <Text style={styles.pendingCardSub}>
                This farmer already has a pending policy. You can resume it instead of creating a duplicate.
              </Text>
              {pendingFarmerPolicies.map((p) => (
                <Button key={p.id} onPress={() => resumePendingPolicy(p)} style={styles.resumePendingBtn}>
                  <ButtonText style={styles.resumePendingBtnText}>
                    Resume {p.policyNumber} (₹{p.totalAmount.toLocaleString('en-IN')})
                  </ButtonText>
                </Button>
              ))}
            </VStack>
          </Card>
        ) : null}

        <PresetField
          label="Pump Motor Power (HP)"
          placeholder="Enter HP (e.g. 5)"
          suffix="HP"
          value={powerHp}
          onChange={setPowerHp}
          presets={HP_PRESETS}
          presetSuffix="HP"
        />
        <PresetField
          label="Operational Head (Meters)"
          placeholder="Enter meters (e.g. 50)"
          suffix="meters"
          value={headMeters}
          onChange={setHeadMeters}
          presets={HEAD_PRESETS}
          presetSuffix="m"
        />

        {/* Plans are only needed when creating a brand-new policy */}
        {!isCompletingExisting ? (
          <VStack space="xs" style={{ marginTop: 6 }}>
            <Text style={styles.formSectionHeader}>SELECT POLICY COVERAGE PLAN</Text>
            {plansQuery.isPending ? (
              <HStack alignItems="center" space="sm" style={{ paddingVertical: 12 }}>
                <ActivityIndicator color={AppColors.brand} size="small" />
                <Text style={styles.mutedText}>Loading plans…</Text>
              </HStack>
            ) : plansQuery.isError ? (
              <VStack space="sm">
                <ErrorMessage message={getApiErrorMessage(plansQuery.error)} />
                <Button variant="outline" onPress={() => plansQuery.refetch()}>
                  <ButtonText>Retry Plans</ButtonText>
                </Button>
              </VStack>
            ) : plansQuery.data?.length ? (
              plansQuery.data.map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  isSelected={selectedPlan?.id === plan.id}
                  onSelect={() => setSelectedPlan(plan)}
                />
              ))
            ) : (
              <Text style={styles.mutedText}>No active policy plans found.</Text>
            )}
          </VStack>
        ) : null}

        <MutationError error={policyCreation.error} />
        <MutationError error={policyUpdate.error} />

        <Button
          isDisabled={!canCreatePolicy || isSaving}
          onPress={startPolicy}
          style={styles.primaryButton}
        >
          <ButtonText>
            {isSaving
              ? 'Saving Policy…'
              : isCompletingExisting
                ? 'Save Pump Details & Continue ›'
                : 'Generate Policy & Continue ›'}
          </ButtonText>
        </Button>
      </VStack>
    </Section>
  );
}

type Props = {
  label: string;
  placeholder: string;
  suffix: string;
  value: string;
  onChange: (value: string) => void;
  presets: string[];
  presetSuffix: string;
};

/** Numeric input with "Quick Select" chips underneath. Used for HP and head. */
function PresetField({ label, placeholder, suffix, value, onChange, presets, presetSuffix }: Props) {
  return (
    <VStack space="xs">
      <Field
        label={label}
        placeholder={placeholder}
        value={value}
        onChangeText={onChange}
        keyboardType="numeric"
        suffix={suffix}
      />
      <HStack space="xs" style={styles.presetRow}>
        <Text style={styles.presetLabel}>Quick Select:</Text>
        {presets.map((preset) => (
          <Pressable
            key={preset}
            onPress={() => onChange(preset)}
            style={[styles.presetChip, value === preset && styles.presetChipActive]}
          >
            <Text style={[styles.presetChipText, value === preset && styles.presetChipTextActive]}>
              {preset} {presetSuffix}
            </Text>
          </Pressable>
        ))}
      </HStack>
    </VStack>
  );
}

function PlanCard({
  plan,
  isSelected,
  onSelect,
}: {
  plan: PolicyPlan;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const total = plan.price * (1 + plan.gstPercentage / 100);

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: isSelected }}
      onPress={onSelect}
      style={styles.planCardWrapper}
    >
      <Card style={[styles.planCard, isSelected && styles.planCardSelected]}>
        <HStack alignItems="flex-start" justifyContent="space-between">
          <VStack space="xs" style={{ flex: 1, marginRight: 10 }}>
            <HStack alignItems="center" space="xs">
              <Heading size="sm" style={styles.planName}>{plan.name}</Heading>
              <View style={styles.durationPill}>
                <Text style={styles.durationPillText}>{plan.durationMonths} Mos</Text>
              </View>
            </HStack>
            <Text style={styles.planDesc}>{plan.description}</Text>
          </VStack>
          <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
            {isSelected ? <CheckIcon size={12} color="#ffffff" strokeWidth={3} /> : null}
          </View>
        </HStack>

        <View style={styles.planDivider} />

        <HStack alignItems="center" justifyContent="space-between">
          <VStack>
            <Text style={styles.planPriceLabel}>Total Amount</Text>
            <Text style={styles.planPrice}>
              ₹{total.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </Text>
          </VStack>
          <Text style={styles.gstTag}>Includes {plan.gstPercentage}% GST</Text>
        </HStack>
      </Card>
    </Pressable>
  );
}
