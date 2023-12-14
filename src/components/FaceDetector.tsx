import {
  Dimensions,
  Face,
  faceBoundsAdjustToView,
  scanFaces,
  sortFormatsByResolution,
} from '@mat2718/vision-camera-face-detector';
import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  Button,
  StyleProp,
  StyleSheet,
  TouchableOpacity,
  View,
  ViewStyle,
  useWindowDimensions,
} from 'react-native';

import {
  Camera,
  CameraProps,
  Frame,
  PhotoFile,
  TakePhotoOptions,
  useCameraDevice,
  useFrameProcessor,
} from 'react-native-vision-camera';
import {useSharedValue} from 'react-native-worklets-core';

type Props = {
  /**
   * If true, the bounding box will be drawn around the face detected.
   */
  enableBoundingBox?: boolean;
  // enableAutoCapture?: boolean;
  /**
   * If true, the bounding box will be drawn around all faces detected.
   */
  boundingBoxMultipleFaces?: boolean;
  /**
   * The color of the bounding box.
   */
  boundingBoxColor?: string;
  /**
   * The width of the bounding box.
   */
  boundingBoxWidth?: number;
  /**
   * The corner radius of the bounding box.
   */
  boundingBoxCornerRadius?: number;
  /**
   * The vertical padding of the bounding box.
   */
  boundingBoxVerticalPadding?: number;
  /**
   * The horizontal padding of the bounding box.
   */
  boundingBoxHorizontalPadding?: number;
  /**
   * The options to use when taking a photo.
   */
  takePhotoOptions?: TakePhotoOptions;
  /**
   * The style of the component.
   */
  style?: StyleProp<ViewStyle>;
  // onFacesDetected?: (faces: Face[]) => void;
  /**
   * The component to use as the photo capture button.
   */
  photoCaptureButton?: React.ReactNode;
  /**
   * pass the photo to the parent component
   * @param photoBase64
   * @returns
   */
  photoCaptureOnPress?: (photoBase64: PhotoFile) => void;
  /**
   * The style of the photo capture button.
   */
  photoCaptureButtonStyle?: StyleProp<ViewStyle>;
  /**
   * If true, the photo skip button will be displayed.
   */
  photoSkipButtonEnabled?: boolean;
  /**
   * The component to use as the photo skip button.
   */
  photoSkipButton?: React.ReactNode;
  /**
   * callback function to skip the photo
   * @returns
   */
  photoSkipOnPress?: () => void;
  /**
   * The style of the photo skip button.
   */
  photoSkipButtonStyle?: StyleProp<ViewStyle>;
  /**
   * The component to use as the torch button.
   */
  torchButton?: React.ReactNode;
  /**
   * all options for the camera
   */
  cameraProps?: CameraProps;
};

const FaceDetector = ({
  enableBoundingBox,
  boundingBoxMultipleFaces,
  boundingBoxColor,
  boundingBoxWidth,
  boundingBoxCornerRadius,
  boundingBoxVerticalPadding,
  boundingBoxHorizontalPadding,
  takePhotoOptions,
  style,
  photoCaptureButton,
  photoCaptureOnPress,
  photoCaptureButtonStyle,
  photoSkipButton,
  photoSkipOnPress,
  photoSkipButtonStyle,
  photoSkipButtonEnabled,
  // torchButton,
  // camera options
  cameraProps,
}: Props) => {
  //*****************************************************************************************
  //  setting up the state
  //*****************************************************************************************
  // Permissions
  const [hasPermission, setHasPermission] = React.useState(false);
  // camera states
  const device = useCameraDevice('front');
  const camera = useRef<Camera>(null);
  // const [faces, setFaces] = useState<Face[]>([]);
  const {height: screenHeight, width: screenWidth} = useWindowDimensions();
  const landscapeMode = screenWidth > screenHeight;
  const [frameDimensions, setFrameDimensions] = useState<Dimensions>();
  const [isActive, setIsActive] = useState(true);
  // photoCaptured is used to prevent attemptPhotoCapture() from being called again before it's completed
  const [photoCaptured, setPhotoCaptured] = useState(false);

  //*****************************************************************************************
  // Comp Logic
  //*****************************************************************************************

  /* A cleanup function that is called when the component is unmounted. */
  useEffect(() => {
    return () => {
      setIsActive(false);
    };
  }, []);

  // which format should we use
  const formats = useMemo(
    () => device?.formats.sort(sortFormatsByResolution),
    [device?.formats],
  );

  //figure our what happens if it is undefined?
  const [format, setFormat] = useState(
    formats && formats.length > 0 ? formats[0] : undefined,
  );

  /* Setting the frame dimensions and faces. */
  const handleFrameDimensions = Worklets.createRunInJsFn((frame: Frame) => {
    const isRotated = !landscapeMode;
    setFrameDimensions(
      isRotated
        ? {
            width: frame.height,
            height: frame.width,
          }
        : {
            width: frame.width,
            height: frame.height,
          },
    );
  });

  const faces = useSharedValue<Face[]>([]);

  /* Setting the format to the first format in the formats array. */
  useEffect(() => {
    setFormat(formats && formats.length > 0 ? formats[0] : undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [device]);

  /* Using the useFrameProcessor hook to process the video frames. */
  const frameProcessor = useFrameProcessor(
    frame => {
      'worklet';
      const scannedFaces = scanFaces(frame);
      faces.value = scannedFaces;
      handleFrameDimensions(frame);
    },
    [faces],
  );

  /* Using the useMemo hook to create a style object. */
  const boundingStyle = useMemo<StyleProp<ViewStyle>>(
    () => ({
      position: 'absolute',
      top: 0,
      left: 0,
      width: screenWidth,
      height: screenHeight,
    }),
    [screenWidth, screenHeight],
  );

  useEffect(() => {
    (async () => {
      const status = await Camera.requestCameraPermission();
      setHasPermission(status === 'granted');
    })();
  }, []);

  /**
   * If the camera is defined, take a photo, if the photo is defined, read the file and return the
   * base64 string, if the photo is not defined, return an error, if the camera is not defined, return
   * an error, if the photo has already been captured, return an error, if no face is detected, return
   * an error.
   * @param {Face[]} [faceBounds] - Face[]
   * @returns A promise that resolves with a base64 string of the photo taken.
   */
  const attemptPhotoCapture = async (faceBounds?: Face[]) => {
    if (faceBounds && faceBounds.length > 0) {
      if (!photoCaptured) {
        setPhotoCaptured(true);
        if (camera?.current) {
          const photo = await camera.current.takePhoto(takePhotoOptions);
          if (photo && photoCaptureOnPress) {
            try {
              photoCaptureOnPress(photo);
              return Promise.resolve(photo);
            } catch (err: any) {
              console.error(err.message);
              setPhotoCaptured(false);
              return Promise.reject(err);
            }
          } else {
            setPhotoCaptured(false);
            return Promise.reject('PhotoCaptureOnPress or photo is undefined');
          }
        } else {
          setPhotoCaptured(false);
          return Promise.reject('Camera is undefined');
        }
      } else {
        setPhotoCaptured(false);
        return Promise.reject('Photo already captured');
      }
    } else {
      setPhotoCaptured(false);
      return Promise.reject('No face detected');
    }
  };

  //*****************************************************************************************
  // stylesheet
  //*****************************************************************************************

  const styles = StyleSheet.create({
    boundingBox: {
      borderRadius: boundingBoxCornerRadius,
      borderWidth: boundingBoxWidth,
      borderColor: boundingBoxColor,
      position: 'absolute',
    },
    fixToText: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
  });

  //********************************************************************
  // Components
  //********************************************************************

  return device != null && hasPermission ? (
    <>
      <View style={style}>
        <Camera
          style={cameraProps?.style ?? StyleSheet.absoluteFill}
          device={cameraProps?.device ?? device}
          torch={cameraProps?.torch}
          isActive={cameraProps?.isActive ?? isActive}
          ref={camera}
          photo={cameraProps?.photo}
          video={cameraProps?.video}
          audio={cameraProps?.audio}
          zoom={cameraProps?.zoom}
          enableZoomGesture={cameraProps?.enableZoomGesture}
          format={cameraProps?.format ?? format}
          fps={cameraProps?.fps ?? 10}
          lowLightBoost={cameraProps?.lowLightBoost}
          videoStabilizationMode={cameraProps?.videoStabilizationMode}
          enableDepthData={cameraProps?.enableDepthData}
          enablePortraitEffectsMatteDelivery={
            cameraProps?.enablePortraitEffectsMatteDelivery
          }
          enableHighQualityPhotos={cameraProps?.enableHighQualityPhotos}
          onError={cameraProps?.onError}
          onInitialized={cameraProps?.onInitialized}
          frameProcessor={cameraProps?.frameProcessor ?? frameProcessor}
        />
        <View style={boundingStyle} testID="faceDetectionBoxView">
          {frameDimensions &&
            (() => {
              if (enableBoundingBox) {
                const {adjustRect} = faceBoundsAdjustToView(
                  frameDimensions,
                  {
                    width: landscapeMode ? screenHeight : screenWidth,
                    height: landscapeMode ? screenWidth : screenHeight,
                  },
                  landscapeMode,
                  boundingBoxVerticalPadding,
                  boundingBoxHorizontalPadding,
                );
                if (boundingBoxMultipleFaces) {
                  /* Returning a view for each face detected. */
                  return faces
                    ? faces.value.map((i, index) => {
                        const {left, ...others} = adjustRect(i.bounds);

                        return (
                          <View
                            key={index}
                            style={[
                              styles.boundingBox,
                              {
                                ...others,
                                ['right']: left,
                              },
                            ]}
                          />
                        );
                      })
                    : undefined;
                } else {
                  /* This is checking if there are any faces detected. If there are, it will return the
                first face detected. If there are no faces detected, it will return undefined. */
                  if (faces && faces.value.length > 0) {
                    const {left, ...others} = adjustRect(faces.value[0].bounds);
                    return (
                      <View
                        style={[
                          styles.boundingBox,
                          {
                            ...others,
                            left: left,
                          },
                        ]}
                      />
                    );
                  } else {
                    return undefined;
                  }
                }
              } else {
                return undefined;
              }
            })()}
        </View>
        {photoCaptureButton || photoSkipButton ? (
          <View style={styles.fixToText}>
            {photoCaptureButton ? (
              <TouchableOpacity
                onPress={() => attemptPhotoCapture(faces.value)}>
                {photoCaptureButton}
              </TouchableOpacity>
            ) : (
              <View style={photoCaptureButtonStyle}>
                <Button
                  title="Capture"
                  onPress={() => attemptPhotoCapture(faces.value)}
                />
              </View>
            )}
            {photoSkipButtonEnabled ? (
              photoSkipButton ? (
                <TouchableOpacity onPress={photoSkipOnPress}>
                  {photoSkipButton}
                </TouchableOpacity>
              ) : (
                <View style={photoSkipButtonStyle}>
                  <Button title="skip" onPress={photoSkipOnPress} />
                </View>
              )
            ) : undefined}
          </View>
        ) : undefined}
      </View>
    </>
  ) : (
    <></>
  );
};

export default FaceDetector;
