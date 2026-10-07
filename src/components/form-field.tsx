import { Input, InputField, Text, VStack } from '@gluestack-ui/themed';
import { StyleSheet, View } from 'react-native';

import { AppColors } from '@/constants/theme';

export function Field({
  label,
  placeholder,
  value,
  onChangeText,
  keyboardType,
  suffix,
  prefix,
  helperText,
  autoCapitalize,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: 'default' | 'numeric' | 'email-address' | 'phone-pad';
  suffix?: string;
  prefix?: string;
  helperText?: string;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}) {
  return (
    <VStack style={styles.container} space="xs">
      <Text style={styles.label}>{label}</Text>
      <View style={styles.fieldWrapper}>
        {prefix ? <Text style={styles.prefixText}>{prefix}</Text> : null}
        <Input variant="outline" style={styles.input}>
          <InputField
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={AppColors.textSubtle}
            keyboardType={keyboardType ?? 'default'}
            autoCapitalize={autoCapitalize}
            style={styles.inputText}
          />
        </Input>
        {suffix ? <Text style={styles.suffixText}>{suffix}</Text> : null}
      </View>
      {helperText ? <Text style={styles.helperText}>{helperText}</Text> : null}
    </VStack>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 4,
  },
  label: {
    color: AppColors.brand,
    fontSize: 12,
    fontWeight: '700',
  },
  fieldWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: AppColors.border,
    backgroundColor: '#fafcfa',
    overflow: 'hidden',
    paddingHorizontal: 4,
  },
  prefixText: {
    color: AppColors.textMuted,
    fontSize: 13,
    fontWeight: '700',
    paddingLeft: 10,
  },
  input: {
    flex: 1,
    minHeight: 48,
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  inputText: {
    fontSize: 14,
    color: AppColors.brand,
    paddingHorizontal: 8,
  },
  suffixText: {
    color: AppColors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    paddingRight: 12,
  },
  helperText: {
    color: AppColors.textSubtle,
    fontSize: 11,
    marginTop: 1,
  },
});
