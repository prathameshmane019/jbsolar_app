import { Button, ButtonText, Card, Heading, HStack, Text, VStack } from '@gluestack-ui/themed';
import { View } from 'react-native';

import { Field } from '@/components/form-field';
import { MapPinIcon, SearchIcon, UserIcon } from '@/components/ui/icons';
import { AppColors } from '@/constants/theme';
import { getApiErrorMessage } from '@/lib/api';

import { ErrorMessage, MutationError, Section } from '../components/shared';
import type { WorkflowController } from '../useWorkflow';
import { styles } from '../workflow.styles';

export function FarmerStep({ w }: { w: WorkflowController }) {
  const {
    searchValue, setSearchValue, farmerSearch, farmerForm, setFarmerForm,
    farmerRegistration, canRegisterFarmer, chooseFarmer, registerFarmer,
  } = w;

  return (
    <Section
      title="1. Locate or Register Farmer"
      subtitle="Search by 12-digit Aadhaar number to link the existing record or register a new farmer."
    >
      <VStack space="md">
        <VStack space="xs">
          <Field
            label="Farmer Aadhaar Number"
            placeholder="Enter 12 digits (e.g. 123456789012)"
            value={searchValue}
            onChangeText={(v) => setSearchValue(v.replace(/\D/g, '').slice(0, 12))}
            keyboardType="numeric"
            helperText={
              searchValue.length > 0 && searchValue.length < 12
                ? `${12 - searchValue.length} more digits needed`
                : searchValue.length === 12
                  ? '12 digits entered'
                  : undefined
            }
          />
          <Button
            variant="outline"
            isDisabled={!/^\d{12}$/.test(searchValue) || farmerSearch.isPending}
            onPress={() => farmerSearch.mutate(searchValue.trim())}
            style={styles.searchButton}
          >
            <HStack alignItems="center" space="xs">
              <SearchIcon size={16} color={AppColors.brand} strokeWidth={2.2} />
              <ButtonText style={styles.searchButtonText}>
                {farmerSearch.isPending ? 'Searching Records…' : 'Search Aadhaar Records'}
              </ButtonText>
            </HStack>
          </Button>
        </VStack>

        {farmerSearch.isError ? (
          <ErrorMessage message={getApiErrorMessage(farmerSearch.error)} />
        ) : null}

        {farmerSearch.isSuccess && farmerSearch.data.length > 0 ? (
          <VStack space="sm">
            <Text style={styles.resultKicker}>MATCHING FARMER RECORD FOUND</Text>
            {farmerSearch.data.map((record) => (
              <Card key={record.id} style={styles.farmerMatchCard}>
                <HStack alignItems="center" space="sm" style={{ marginBottom: 8 }}>
                  <View style={styles.farmerAvatar}>
                    <UserIcon size={18} color={AppColors.brand} strokeWidth={2.2} />
                  </View>
                  <VStack space="xs" style={{ flex: 1 }}>
                    <Heading size="sm" style={styles.farmerNameHeading}>{record.fullName}</Heading>
                    <Text style={styles.farmerMeta}>{record.customerCode} · {record.mobile}</Text>
                  </VStack>
                </HStack>
                <HStack alignItems="center" space="xs" style={{ marginBottom: 12 }}>
                  <MapPinIcon size={14} color={AppColors.textMuted} strokeWidth={2} />
                  <Text style={styles.farmerAddress}>
                    {record.village}, {record.taluka}, {record.district}
                  </Text>
                </HStack>
                <Button onPress={() => chooseFarmer(record)} style={styles.primaryButton}>
                  <ButtonText>Continue with this Farmer ›</ButtonText>
                </Button>
              </Card>
            ))}
          </VStack>
        ) : null}

        {farmerSearch.isSuccess && farmerSearch.data.length === 0 ? (
          <VStack space="md" style={styles.newFarmerFormBox}>
            <View style={styles.newFarmerNotice}>
              <Text style={styles.newFarmerNoticeTitle}>Farmer not found with this Aadhaar</Text>
              <Text style={styles.newFarmerNoticeSub}>
                Complete the registration details below to create a new farmer profile in JB Solar.
              </Text>
            </View>

            <Text style={styles.formSectionHeader}>PERSONAL INFORMATION</Text>
            <Field
              label="Full Name"
              placeholder="Farmer full legal name"
              value={farmerForm.fullName}
              onChangeText={(v) => setFarmerForm((f) => ({ ...f, fullName: v }))}
            />
            <Field
              label="Mobile Number"
              placeholder="10-digit mobile number"
              prefix="+91 "
              value={farmerForm.mobile}
              onChangeText={(v) =>
                setFarmerForm((f) => ({ ...f, mobile: v.replace(/\D/g, '').slice(0, 10) }))
              }
              keyboardType="numeric"
            />
            <Field
              label="Aadhaar Number"
              placeholder="12 digits"
              value={farmerForm.aadhaarNumber ?? ''}
              onChangeText={(v) =>
                setFarmerForm((f) => ({ ...f, aadhaarNumber: v.replace(/\D/g, '').slice(0, 12) }))
              }
              keyboardType="numeric"
            />

            <Text style={[styles.formSectionHeader, { marginTop: 8 }]}>FARM / RESIDENCE LOCATION</Text>
            <Field
              label="Village"
              placeholder="Village name"
              value={farmerForm.village}
              onChangeText={(v) => setFarmerForm((f) => ({ ...f, village: v }))}
            />
            <Field
              label="Taluka"
              placeholder="Taluka / Tehsil"
              value={farmerForm.taluka}
              onChangeText={(v) => setFarmerForm((f) => ({ ...f, taluka: v }))}
            />
            <Field
              label="District"
              placeholder="District"
              value={farmerForm.district}
              onChangeText={(v) => setFarmerForm((f) => ({ ...f, district: v }))}
            />
            <Field
              label="Address / Street"
              placeholder="Plot / Survey number / Address"
              value={farmerForm.address}
              onChangeText={(v) => setFarmerForm((f) => ({ ...f, address: v }))}
            />

            <MutationError error={farmerRegistration.error} />

            <Button
              isDisabled={!canRegisterFarmer || farmerRegistration.isPending}
              onPress={registerFarmer}
              style={styles.primaryButton}
            >
              <ButtonText>
                {farmerRegistration.isPending ? 'Registering Farmer…' : 'Register Farmer & Proceed ›'}
              </ButtonText>
            </Button>
          </VStack>
        ) : null}
      </VStack>
    </Section>
  );
}
