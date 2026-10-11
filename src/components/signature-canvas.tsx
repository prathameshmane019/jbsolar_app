import { Button, ButtonText, HStack, Text } from '@gluestack-ui/themed';
import { File, Paths } from 'expo-file-system';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  type GestureResponderEvent,
  type LayoutChangeEvent,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { CheckIcon, CloseIcon, SignatureIcon } from '@/components/ui/icons';
import { AppColors } from '@/constants/theme';
import type { LocalAttachment } from '@/lib/files';

const canvasWidth = 320;
const canvasHeight = 170;

function pointPath(x: number, y: number, startsStroke: boolean, displayWidth: number): string {
  const pointX = Math.min(
    canvasWidth,
    Math.max(0, (x * canvasWidth) / Math.max(1, displayWidth)),
  ).toFixed(1);
  const pointY = Math.min(canvasHeight, Math.max(0, y)).toFixed(1);
  return `${startsStroke ? 'M' : 'L'} ${pointX} ${pointY}`;
}

type LiveStrokeHandle = { set: (path: string) => void };

/**
 * Owns the in-progress stroke. Only this tiny component re-renders while drawing,
 * so the rest of the tree (buttons, icons, placeholder) is untouched at ~60fps.
 */
const LiveStroke = forwardRef<LiveStrokeHandle>(function LiveStroke(_props, ref) {
  const [path, setPath] = useState('');
  useImperativeHandle(ref, () => ({ set: setPath }), []);
  if (!path) return null;
  return (
    <Path
      d={path}
      fill="none"
      stroke="#163b2d"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
});

export function SignatureCanvas({
  disabled = false,
  onSave,
  onDrawStart,
  onDrawEnd,
}: {
  disabled?: boolean;
  onSave: (attachment: LocalAttachment) => void;
  /** Fired when a stroke starts / ends — use it to freeze a parent ScrollView. */
  onDrawStart?: () => void;
  onDrawEnd?: () => void;
}) {
  const [strokes, setStrokes] = useState<string[]>([]); // finished strokes
  const [isDrawing, setIsDrawing] = useState(false); // flips only at stroke start / end

  // Refs are only touched inside touch handlers, rAF callbacks and effects — never while rendering.
  const liveRef = useRef<LiveStrokeHandle>(null);
  const pointsRef = useRef('');
  const rafRef = useRef<number | null>(null);
  const widthRef = useRef(canvasWidth);

  useEffect(
    () => () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    },
    [],
  );

  const cancelFlush = () => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  };

  // Push the in-progress stroke to <LiveStroke/> at most once per frame.
  const flush = () => {
    if (rafRef.current != null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      liveRef.current?.set(pointsRef.current);
    });
  };

  const handleTouchStart = (event: GestureResponderEvent) => {
    const { locationX: x, locationY: y } = event.nativeEvent;
    // "M x y L x y" so a single tap still draws a dot (round line cap)
    pointsRef.current = `${pointPath(x, y, true, widthRef.current)} ${pointPath(x, y, false, widthRef.current)}`;
    setIsDrawing(true);
    onDrawStart?.();
    flush();
  };

  const handleTouchMove = (event: GestureResponderEvent) => {
    if (!pointsRef.current) return;
    const { locationX: x, locationY: y } = event.nativeEvent;
    pointsRef.current += ` ${pointPath(x, y, false, widthRef.current)}`;
    flush();
  };

  const handleTouchEnd = () => {
    cancelFlush();
    const stroke = pointsRef.current;
    pointsRef.current = '';
    liveRef.current?.set('');
    if (stroke) setStrokes((current) => [...current, stroke]);
    setIsDrawing(false);
    onDrawEnd?.();
  };

  const onCanvasLayout = (event: LayoutChangeEvent) => {
    widthRef.current = event.nativeEvent.layout.width;
  };

  const hasDrawing = strokes.length > 0 || isDrawing;

  const saveSignature = () => {
    const allStrokes = strokes;
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

  const clearPad = () => {
    cancelFlush();
    pointsRef.current = '';
    liveRef.current?.set('');
    setIsDrawing(false);
    setStrokes([]);
  };

  return (
    <View style={styles.container}>
      <View
        onStartShouldSetResponder={() => !disabled}
        onResponderTerminationRequest={() => false} // don't let the ScrollView steal the touch
        onResponderGrant={handleTouchStart}
        onResponderMove={handleTouchMove}
        onResponderRelease={handleTouchEnd}
        onResponderTerminate={handleTouchEnd}
        onLayout={onCanvasLayout}
        style={[styles.canvas, disabled && styles.canvasDisabled]}
        accessibilityLabel="Customer signature drawing canvas"
        accessibilityRole="image"
      >
        {/* pointerEvents="none": touches must hit the canvas View, not the Svg child */}
        <Svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
          pointerEvents="none"
        >
          {strokes.map((path, index) => (
            <Path
              key={index}
              d={path}
              fill="none"
              stroke="#163b2d"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
          <LiveStroke ref={liveRef} />
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
          onPress={clearPad}
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
  container: { marginVertical: 4 },
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
  canvasDisabled: { opacity: 0.6, backgroundColor: '#f9fafb' },
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
  actions: { marginTop: 10 },
  clearButton: { flex: 1, minHeight: 44, borderRadius: 12, borderColor: AppColors.border },
  clearButtonText: { color: AppColors.textMuted, fontSize: 13, fontWeight: '600' },
  saveButton: { flex: 2, minHeight: 44, borderRadius: 12, backgroundColor: AppColors.brand },
  saveButtonText: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
});