package com.visioncamerafacedetector;


import static java.lang.Math.ceil;

import android.annotation.SuppressLint;
import android.graphics.PointF;
import android.graphics.Rect;
import android.media.Image;
import android.util.Log;
import java.util.Map;
import java.util.List;

import androidx.camera.core.ImageProxy;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.WritableNativeArray;
import com.facebook.react.bridge.WritableNativeMap;
import com.google.android.gms.tasks.Task;
import com.google.android.gms.tasks.Tasks;
import com.google.mlkit.vision.common.InputImage;
import com.google.mlkit.vision.face.Face;
import com.google.mlkit.vision.face.FaceContour;
import com.google.mlkit.vision.face.FaceDetection;
import com.google.mlkit.vision.face.FaceDetector;


import com.google.mlkit.vision.face.FaceDetectorOptions;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import com.mrousavy.camera.frameprocessor.Frame;
import com.mrousavy.camera.frameprocessor.FrameProcessorPlugin;
import com.mrousavy.camera.types.Orientation;

public class VisionCameraFaceDetectorPlugin extends FrameProcessorPlugin {
  VisionCameraFaceDetectorPlugin(@Nullable Map<String, Object> options) {
    super(options);
  }

  private static final String TAG = "VisionCameraFaceDetectorPlugin";

  FaceDetectorOptions setup =
    new FaceDetectorOptions.Builder()
      .setPerformanceMode(FaceDetectorOptions.PERFORMANCE_MODE_FAST)
      // .setContourMode(FaceDetectorOptions.CONTOUR_MODE_ALL)
      .setClassificationMode(FaceDetectorOptions.CLASSIFICATION_MODE_ALL)
      .setLandmarkMode(FaceDetectorOptions.LANDMARK_MODE_ALL)
      .setMinFaceSize(0.15f)
      .build();

  FaceDetector faceDetector = FaceDetection.getClient(setup);

  private WritableMap processBoundingBox(Rect boundingBox) {
    WritableMap bounds = Arguments.createMap();

    bounds.putDouble("x", boundingBox.centerX());
    bounds.putDouble("y", boundingBox.centerY());
    bounds.putDouble("top", boundingBox.top);
    bounds.putDouble("left", boundingBox.left);
    bounds.putDouble("right", boundingBox.right);
    bounds.putDouble("bottom", boundingBox.bottom);
    bounds.putDouble("width", boundingBox.width());
    bounds.putDouble("height", boundingBox.height());

    return bounds;
  }

  // private WritableMap  processFaceContours(Face face) {
  //   // All faceContours
  //   int[] faceContoursTypes =
  //     new int[] {
  //       FaceContour.FACE,
  //       FaceContour.LEFT_CHEEK,
  //       FaceContour.LEFT_EYE,
  //       FaceContour.LEFT_EYEBROW_BOTTOM,
  //       FaceContour.LEFT_EYEBROW_TOP,
  //       FaceContour.LOWER_LIP_BOTTOM,
  //       FaceContour.LOWER_LIP_TOP,
  //       FaceContour.NOSE_BOTTOM,
  //       FaceContour.NOSE_BRIDGE,
  //       FaceContour.RIGHT_CHEEK,
  //       FaceContour.RIGHT_EYE,
  //       FaceContour.RIGHT_EYEBROW_BOTTOM,
  //       FaceContour.RIGHT_EYEBROW_TOP,
  //       FaceContour.UPPER_LIP_BOTTOM,
  //       FaceContour.UPPER_LIP_TOP
  //     };

  //   String[] faceContoursTypesStrings = {
  //       "FACE",
  //       "LEFT_CHEEK",
  //       "LEFT_EYE",
  //       "LEFT_EYEBROW_BOTTOM",
  //       "LEFT_EYEBROW_TOP",
  //       "LOWER_LIP_BOTTOM",
  //       "LOWER_LIP_TOP",
  //       "NOSE_BOTTOM",
  //       "NOSE_BRIDGE",
  //       "RIGHT_CHEEK",
  //       "RIGHT_EYE",
  //       "RIGHT_EYEBROW_BOTTOM",
  //       "RIGHT_EYEBROW_TOP",
  //       "UPPER_LIP_BOTTOM",
  //       "UPPER_LIP_TOP"
  //     };

  //   WritableMap faceContoursTypesMap = new WritableNativeMap();

  //     for (int i = 0; i < faceContoursTypesStrings.length; i++) {
  //       FaceContour contour = face.getContour(FaceContour.LEFT_EYE);
  //       List<PointF> points = contour.getPoints();
  //       WritableNativeArray pointsArray = new WritableNativeArray();

  //         for (int j = 0; j < points.size(); j++) {
  //           WritableMap currentPointsMap = new WritableNativeMap();

  //           currentPointsMap.putDouble("x", points.get(j).x);
  //           currentPointsMap.putDouble("y", points.get(j).y);

  //           pointsArray.pushMap(currentPointsMap);
  //         }
  //         faceContoursTypesMap.putArray(faceContoursTypesStrings[contour.getFaceContourType() - 1], pointsArray);
  //     }

  //   return faceContoursTypesMap;
  // }

  @Nullable
  @Override
  public Object callback(@NonNull Frame frame, @Nullable Map<String, Object> params) {
    @SuppressLint("UnsafeOptInUsageError")
    Image mediaImage = frame.getImage();

    if (mediaImage != null) {
      InputImage image = InputImage.fromMediaImage(mediaImage, Orientation.PORTRAIT.toDegrees());
      Task<List<Face>> task = faceDetector.process(image);
      WritableNativeArray array = new WritableNativeArray();
      try {
        List<Face> faces = Tasks.await(task);
        Log.d(TAG, "Faces: " + faces);
        for (Face face : faces) {
          WritableMap map =  new WritableNativeMap();
          Log.d(TAG, "Face: " + face);

          map.putDouble("rollAngle", face.getHeadEulerAngleZ()); // Head is rotated to the left rotZ degrees
          map.putDouble("pitchAngle", face.getHeadEulerAngleX()); // Head is rotated to the right rotX degrees
          map.putDouble("yawAngle", face.getHeadEulerAngleY());  // Head is tilted sideways rotY degrees
          map.putDouble("leftEyeOpenProbability", face.getLeftEyeOpenProbability());
          map.putDouble("rightEyeOpenProbability", face.getRightEyeOpenProbability());
          map.putDouble("smilingProbability", face.getSmilingProbability());
          

          // WritableMap contours = processFaceContours(face);
          WritableMap bounds = processBoundingBox(face.getBoundingBox());

          map.putMap("bounds", bounds);
          // map.putMap("contours", contours);

          array.pushMap(map);
        }
        Log.d(TAG, "callback: " + array.toString());
        return array;
      } catch (Exception e) {
        Log.e(TAG, "Exception: " + e.getMessage());
        return e.getMessage();
      }
    }

    return null;
  }

}
