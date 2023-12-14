import {Frame, VisionCameraProxy} from 'react-native-vision-camera';
import {Face} from '../types/types';

const plugin = VisionCameraProxy.initFrameProcessorPlugin('scanFaces');

/**
 * Scans faces.
 */
const scanFaces = (frame: Frame): Face[] => {
  'worklet';
  if (plugin == null) {
    throw new Error('Failed to load Frame Processor Plugin "scanFaces"!');
  }
  return plugin.call(frame) as unknown as Face[];
};

export default scanFaces;
