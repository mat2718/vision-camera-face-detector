import {Frame, VisionCameraProxy} from 'react-native-vision-camera';

const plugin = VisionCameraProxy.initFrameProcessorPlugin('scanFaces');

/**
 * Scans faces.
 */
const scanFaces = (frame: Frame) => {
  if (plugin == null) {
    throw new Error('Failed to load Frame Processor Plugin "scanFaces"!');
  }
  return plugin.call(frame);
};

export default scanFaces;
