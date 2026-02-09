import { Dimensions, PixelRatio, Platform } from 'react-native';

const { width, height } = Dimensions.get('window');

// Guideline sizes are based on standard ~5" screen mobile device
// (iPhone 11 Pro / X / 12 Mini / 13 Mini approx)
// 375 x 812 is a common standard design frame in Figma
const guidelineBaseWidth = 375;
const guidelineBaseHeight = 812;

/**
 * Scale based on width (good for padding, margin, width, fontSize)
 */
const scale = (size: number) => (width / guidelineBaseWidth) * size;

/**
 * Scale based on height (good for safe area spacing, vertical margins)
 */
const verticalScale = (size: number) => (height / guidelineBaseHeight) * size;

/**
 * Moderate scale: linearly interpolates between the original size and the scaled size.
 * Useful for font sizes to avoid becoming too large on tablets or too small on small devices.
 * default factor = 0.5
 */
const moderateScale = (size: number, factor = 0.5) => {
    return size + (scale(size) - size) * factor;
};

/**
 * Pixel perfect helper (optional simplified export)
 */
export const normalize = (size: number, based = 'width') => {
    const newSize = based === 'height' ?
        size * (height / guidelineBaseHeight) :
        size * (width / guidelineBaseWidth);

    if (Platform.OS === 'ios') {
        return Math.round(PixelRatio.roundToNearestPixel(newSize));
    } else {
        return Math.round(PixelRatio.roundToNearestPixel(newSize)) - 2;
    }
}

export { scale, verticalScale, moderateScale };
