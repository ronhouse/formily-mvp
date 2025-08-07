#!/usr/bin/env python3
"""
OpenCV-based background removal fallback for Formily
Used when Replicate background removal fails
"""

import cv2
import numpy as np
import sys
import os
from pathlib import Path

def remove_background_opencv(input_path, output_path):
    """
    Remove background using OpenCV with multiple techniques
    Returns success status and error message if any
    """
    try:
        print(f"🔧 [OPENCV-BG] Processing image: {input_path}")
        
        # Read the input image
        img = cv2.imread(input_path)
        if img is None:
            return False, f"Could not load image: {input_path}"
        
        print(f"📊 [OPENCV-BG] Image shape: {img.shape}")
        
        # Method 1: GrabCut algorithm (works well for subjects against uniform backgrounds)
        mask = np.zeros(img.shape[:2], np.uint8)
        bgdModel = np.zeros((1, 65), np.float64)
        fgdModel = np.zeros((1, 65), np.float64)
        
        # Define rectangle around the main subject (center 80% of image)
        height, width = img.shape[:2]
        margin_x = int(width * 0.1)
        margin_y = int(height * 0.1)
        rect = (margin_x, margin_y, width - 2*margin_x, height - 2*margin_y)
        
        # Apply GrabCut
        cv2.grabCut(img, mask, rect, bgdModel, fgdModel, 5, cv2.GC_INIT_WITH_RECT)
        
        # Create mask where sure and likely foreground pixels are 1
        mask2 = np.where((mask == 2) | (mask == 0), 0, 1).astype('uint8')
        
        # Method 2: Edge detection and morphology for refinement
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        edges = cv2.Canny(gray, 50, 150)
        
        # Morphological operations to close gaps
        kernel = np.ones((3,3), np.uint8)
        edges = cv2.morphologyEx(edges, cv2.MORPH_CLOSE, kernel)
        edges = cv2.dilate(edges, kernel, iterations=1)
        
        # Combine GrabCut mask with edge information
        combined_mask = cv2.bitwise_or(mask2, (edges > 0).astype(np.uint8))
        
        # Method 3: Color-based segmentation for additional refinement
        # Convert to HSV for better color segmentation
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        
        # Define range for background colors (adjust based on common backgrounds)
        # White background
        lower_white = np.array([0, 0, 200])
        upper_white = np.array([180, 30, 255])
        white_mask = cv2.inRange(hsv, lower_white, upper_white)
        
        # Light gray background
        lower_gray = np.array([0, 0, 180])
        upper_gray = np.array([180, 50, 220])
        gray_mask = cv2.inRange(hsv, lower_gray, upper_gray)
        
        # Combine background masks
        bg_mask = cv2.bitwise_or(white_mask, gray_mask)
        
        # Invert to get foreground
        fg_from_color = cv2.bitwise_not(bg_mask)
        fg_from_color = cv2.morphologyEx(fg_from_color, cv2.MORPH_CLOSE, kernel)
        
        # Final mask combination
        final_mask = cv2.bitwise_or(combined_mask, fg_from_color)
        
        # Smooth the mask
        final_mask = cv2.medianBlur(final_mask, 5)
        
        # Create output image with transparent background
        result = img.copy()
        
        # Create alpha channel
        alpha = final_mask * 255
        
        # Convert to RGBA
        result_rgba = cv2.cvtColor(result, cv2.COLOR_BGR2BGRA)
        result_rgba[:, :, 3] = alpha
        
        # Ensure output directory exists
        output_dir = os.path.dirname(output_path)
        os.makedirs(output_dir, exist_ok=True)
        
        # Save the result
        success = cv2.imwrite(output_path, result_rgba)
        
        if success:
            file_size = os.path.getsize(output_path)
            print(f"✅ [OPENCV-BG] Background removal successful")
            print(f"💾 [OPENCV-BG] Output saved: {output_path}")
            print(f"📊 [OPENCV-BG] Output size: {file_size} bytes ({file_size/1024/1024:.2f} MB)")
            return True, None
        else:
            return False, "Failed to save processed image"
            
    except Exception as e:
        print(f"❌ [OPENCV-BG] Error: {str(e)}")
        return False, str(e)

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python opencv-fallback.py <input_path> <output_path>")
        sys.exit(1)
    
    input_path = sys.argv[1]
    output_path = sys.argv[2]
    
    success, error = remove_background_opencv(input_path, output_path)
    
    if success:
        print("SUCCESS")
        sys.exit(0)
    else:
        print(f"ERROR: {error}")
        sys.exit(1)