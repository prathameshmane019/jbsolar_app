import { Button, ButtonText, HStack, Text } from '@gluestack-ui/themed';
import { File, Paths } from 'expo-file-system';
import { useMemo, useState } from 'react';
import { PanResponder, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { CheckIcon, CloseIcon, SignatureIcon } from '@/components/ui/icons';
import { AppColors } from '@/constants/theme';
import type { LocalAttachment } from '@/lib/files';

const canvasWidth = 320;
const canvasHeight = 170;

function pointPath(
  x: number,
  y: number,
  startsStroke: boolean,
  displayWidth: number,
): string {
  const pointX = Math.min(
    canvasWidth,
    Math.max(0, (x * canvasWidth) / Math.max(1, displayWidth)),
  ).toFixed(1);
  const pointY = Math.min(canvasHeight, Math.max(0, y)).toFixed(1);
  return `${startsStroke ? 'M' : 'L'} ${pointX} ${pointY}`;
}

export function SignatureCanvas({
  disabled,
  onSave,
}: {
  disabled: boolean;
  onSave: (attachment: LocalAttachment) => void;
}) {
  const [strokes, setStrokes] = useState<string[]>([]);
  const [activeStroke, setActiveStroke] = useState('');
  const [displayWidth, setDisplayWidth] = useState(canvasWidth);
  const onCanvasLayout = (event: LayoutChangeEvent) =>
    setDisplayWidth(event.nativeEvent.layout.width);

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !disabled,
        onMoveShouldSetPanResponder: () => !disabled,
        onPanResponderGrant: (event) => {
          setActiveStroke(
            pointPath(
              event.nativeEvent.locationX,
              event.nativeEvent.locationY,
              true,
              displayWidth,
            ),
          );
        },
        onPanResponderMove: (event) => {
          const point = pointPath(
            event.nativeEvent.locationX,
            event.nativeEvent.locationY,
            false,
            displayWidth,
          );
          setActiveStroke((current) => (current ? `${current} ${point}` : ''));
        },
        onPanResponderRelease: () => {
          if (activeStroke) {
            setStrokes((current) => [...current, activeStroke]);
          }
          setActiveStroke('');
        },
        onPanResponderTerminate: () => setActiveStroke(''),
      }),
    [activeStroke, disabled, displayWidth],
  );

  const hasDrawing = strokes.length > 0 || Boolean(activeStroke);

  const saveSignature = () => {
    const allStrokes = [...strokes, activeStroke].filter(Boolean);
    if (!allStrokes.length) return;

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${canvasWidth}" height="${canvasHeight}" viewBox="0 0 ${canvasWidth} ${canvasHeight}"><rect width="100%" height="100%" fill="#ffffff"/><g fill="none" stroke="#163b2d" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">${allStrokes
      .map((path) => `<path d="${path}"/>`)
      .join('')}</g></svg>`;
    const name = `customer-signature-${Date.now()}.svg`;
    const file = new File(Paths.cache, name);
    file.create();
    file.write(svg);

    onSave({
      uri: file.uri,
      name,
      contentType: 'image/svg+xml',
      size: file.size,
      width: canvasWidth,
      height: canvasHeight,
      optimized: true,
    });
  };

  return (
    <View style={styles.container}>
      <View
        {...responder.panHandlers}
        onLayout={onCanvasLayout}
        style={[styles.canvas, disabled && styles.canvasDisabled]}
        accessibilityLabel="Customer signature drawing canvas"
        accessibilityRole="image"
      >
        <Svg width="100%" height="100%" viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}>
          {[...strokes, activeStroke]
            .filter(Boolean)
            .map((path, index) => (
              <Path
                key={`${index}-${path.length}`}
                d={path}
                fill="none"
                stroke="#163b2d"
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
        </Svg>
        {!hasDrawing ? (
          <View pointerEvents="none" style={styles.placeholderContainer}>
            <SignatureIcon size={24} color={AppColors.textSubtle} strokeWidth={1.8} />
            <Text style={styles.placeholderText}>Sign with finger inside this box</Text>
            <View style={styles.guideline} />
          </View>
        ) : null}
      </View>

      <HStack style={styles.actions} space="sm">
        <Button
          variant="outline"
          isDisabled={disabled || !hasDrawing}
          onPress={() => {
            setStrokes([]);
            setActiveStroke('');
          }}
          style={styles.clearButton}
        >
          <HStack alignItems="center" space="xs">
            <CloseIcon size={14} color={AppColors.textMuted} strokeWidth={2.4} />
            <ButtonText style={styles.clearButtonText}>Clear Pad</ButtonText>
          </HStack>
        </Button>

        <Button
          isDisabled={disabled || !hasDrawing}
          onPress={saveSignature}
          style={styles.saveButton}
        >
          <HStack alignItems="center" space="xs">
            <CheckIcon size={16} color="#c5e86c" strokeWidth={2.4} />
            <ButtonText style={styles.saveButtonText}>Confirm & Save Signature</ButtonText>
          </HStack>
        </Button>
      </HStack>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
  },
  canvas: {
    height: 170,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: AppColors.border,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
    position: 'relative',
  },
  canvasDisabled: {
    opacity: 0.6,
    backgroundColor: '#f9fafb',
  },
  placeholderContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: AppColors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
  },
  guideline: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    height: 1,
    backgroundColor: '#e5e7eb',
  },
  actions: {
    marginTop: 10,
  },
  clearButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    borderColor: AppColors.border,
  },
  clearButtonText: {
    color: AppColors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  saveButton: {
    flex: 2,
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: AppColors.brand,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
});
