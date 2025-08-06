#!/usr/bin/env python3
"""
Python Quality Enhancement Service for STL Generation Pipeline
Provides background removal and mesh normalization using trimesh and OpenCV
"""

import sys
import os
import tempfile
import json
import subprocess
from pathlib import Path
import cv2
import numpy as np
from PIL import Image
import trimesh


def remove_background(input_path: str, output_path: str) -> bool:
    """
    Remove background from image using OpenCV-based background removal
    Fallback to simple threshold-based removal if advanced methods fail
    
    Args:
        input_path: Path to input image
        output_path: Path to save processed image
    
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        print(f"🧼 [BG-REMOVAL] Starting background removal for: {input_path}")
        
        # Read image
        image = cv2.imread(input_path)
        if image is None:
            print(f"❌ [BG-REMOVAL] Failed to read image: {input_path}")
            return False
            
        original_height, original_width = image.shape[:2]
        print(f"📏 [BG-REMOVAL] Image dimensions: {original_width}x{original_height}")
        
        # Method 1: Try GrabCut algorithm for background removal
        try:
            # Create mask for GrabCut
            mask = np.zeros(image.shape[:2], np.uint8)
            
            # Define rectangle around the center area (assuming subject is centered)
            height, width = image.shape[:2]
            rect = (width//8, height//8, width*3//4, height*3//4)
            
            # Initialize GrabCut
            bgd_model = np.zeros((1, 65), np.float64)
            fgd_model = np.zeros((1, 65), np.float64)
            
            # Apply GrabCut
            cv2.grabCut(image, mask, rect, bgd_model, fgd_model, 5, cv2.GC_INIT_WITH_RECT)
            
            # Create final mask
            mask2 = np.where((mask == 2) | (mask == 0), 0, 1).astype('uint8')
            
            # Apply mask to create transparent background
            result = image.copy()
            result = cv2.cvtColor(result, cv2.COLOR_BGR2BGRA)
            result[:, :, 3] = mask2 * 255
            
            # Save result
            cv2.imwrite(output_path, result)
            
            print(f"✅ [BG-REMOVAL] GrabCut method successful")
            return True
            
        except Exception as grabcut_error:
            print(f"⚠️ [BG-REMOVAL] GrabCut failed: {grabcut_error}")
            
        # Method 2: Simple threshold-based background removal (fallback)
        try:
            # Convert to grayscale for thresholding
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            
            # Apply Gaussian blur
            blurred = cv2.GaussianBlur(gray, (5, 5), 0)
            
            # Apply adaptive threshold
            _, thresh = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
            
            # Find contours
            contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            # Find largest contour (assumed to be main subject)
            if contours:
                largest_contour = max(contours, key=cv2.contourArea)
                
                # Create mask from largest contour
                mask = np.zeros(gray.shape, np.uint8)
                cv2.drawContours(mask, [largest_contour], -1, 255, -1)
                
                # Apply morphological operations to clean up mask
                kernel = np.ones((3, 3), np.uint8)
                mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
                mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)
                
                # Apply mask to create transparent background
                result = cv2.cvtColor(image, cv2.COLOR_BGR2BGRA)
                result[:, :, 3] = mask
                
                # Save result
                cv2.imwrite(output_path, result)
                
                print(f"✅ [BG-REMOVAL] Threshold method successful")
                return True
            else:
                print(f"⚠️ [BG-REMOVAL] No contours found for threshold method")
                
        except Exception as threshold_error:
            print(f"❌ [BG-REMOVAL] Threshold method failed: {threshold_error}")
            
        # Method 3: Simple center-crop with white background (last resort)
        try:
            # Convert to RGBA
            result = cv2.cvtColor(image, cv2.COLOR_BGR2BGRA)
            
            # Create circular mask centered on image
            height, width = result.shape[:2]
            center = (width // 2, height // 2)
            radius = min(width, height) // 3
            
            mask = np.zeros((height, width), np.uint8)
            cv2.circle(mask, center, radius, 255, -1)
            
            # Apply mask
            result[:, :, 3] = mask
            
            # Save result
            cv2.imwrite(output_path, result)
            
            print(f"✅ [BG-REMOVAL] Center-crop method successful (fallback)")
            return True
            
        except Exception as crop_error:
            print(f"❌ [BG-REMOVAL] All methods failed: {crop_error}")
            return False
            
    except Exception as e:
        print(f"❌ [BG-REMOVAL] Background removal failed: {e}")
        return False


def normalize_mesh_scale(glb_path: str, stl_path: str, target_size_mm: float = 100.0) -> dict:
    """
    Normalize mesh scale using trimesh:
    - Center mesh at origin
    - Scale largest axis to target size (default 100mm)
    - Export as STL
    
    Args:
        glb_path: Path to input GLB file
        stl_path: Path to output STL file
        target_size_mm: Target size for largest axis in mm
    
    Returns:
        dict: Processing details and file info
    """
    try:
        print(f"🔧 [MESH-NORM] Starting mesh normalization for: {glb_path}")
        
        # Load GLB file
        mesh = trimesh.load(glb_path)
        
        # Handle case where trimesh returns a Scene instead of a Mesh
        if hasattr(mesh, 'geometry'):
            print(f"📦 [MESH-NORM] GLB contains scene with {len(mesh.geometry)} geometries")
            # Combine all geometries into a single mesh
            geometries = []
            for name, geom in mesh.geometry.items():
                if hasattr(geom, 'vertices') and len(geom.vertices) > 0:
                    geometries.append(geom)
                    print(f"📐 [MESH-NORM] Geometry '{name}': {len(geom.vertices)} vertices, {len(geom.faces)} faces")
            
            if not geometries:
                raise ValueError("No valid geometries found in GLB file")
                
            # Combine geometries
            mesh = trimesh.util.concatenate(geometries)
            print(f"📦 [MESH-NORM] Combined mesh: {len(mesh.vertices)} vertices, {len(mesh.faces)} faces")
        
        elif hasattr(mesh, 'vertices'):
            print(f"📐 [MESH-NORM] Single mesh: {len(mesh.vertices)} vertices, {len(mesh.faces)} faces")
        else:
            raise ValueError("Unable to extract mesh data from GLB file")
        
        # Get original bounding box
        bbox = mesh.bounding_box
        original_extents = bbox.extents
        print(f"📏 [MESH-NORM] Original extents: {original_extents}")
        
        # Find the largest axis
        max_extent = max(original_extents)
        print(f"📏 [MESH-NORM] Largest axis: {max_extent:.3f} units")
        
        # Calculate scale factor to normalize to target size
        scale_factor = target_size_mm / max_extent
        print(f"🔢 [MESH-NORM] Scale factor: {scale_factor:.3f} (target: {target_size_mm}mm)")
        
        # Center mesh at origin
        mesh.vertices -= mesh.centroid
        print(f"🎯 [MESH-NORM] Centered mesh at origin")
        
        # Scale mesh
        mesh.vertices *= scale_factor
        print(f"📏 [MESH-NORM] Scaled mesh by factor {scale_factor:.3f}")
        
        # Verify new dimensions
        new_bbox = mesh.bounding_box
        new_extents = new_bbox.extents
        new_max_extent = max(new_extents)
        print(f"📏 [MESH-NORM] New extents: {new_extents}")
        print(f"📏 [MESH-NORM] New max extent: {new_max_extent:.3f}mm")
        
        # Ensure mesh is watertight for better 3D printing
        if not mesh.is_watertight:
            print(f"🔧 [MESH-NORM] Mesh is not watertight, attempting to fix...")
            try:
                mesh.fill_holes()
                if mesh.is_watertight:
                    print(f"✅ [MESH-NORM] Mesh made watertight")
                else:
                    print(f"⚠️ [MESH-NORM] Could not make mesh watertight")
            except Exception as fix_error:
                print(f"⚠️ [MESH-NORM] Error fixing mesh: {fix_error}")
        else:
            print(f"✅ [MESH-NORM] Mesh is already watertight")
        
        # Export as STL
        mesh.export(stl_path)
        print(f"💾 [MESH-NORM] Exported normalized STL to: {stl_path}")
        
        # Get file size
        stl_size = os.path.getsize(stl_path)
        print(f"📊 [MESH-NORM] STL file size: {stl_size} bytes ({stl_size/1024:.1f} KB)")
        
        return {
            "success": True,
            "original_extents": original_extents.tolist(),
            "new_extents": new_extents.tolist(),
            "scale_factor": scale_factor,
            "target_size_mm": target_size_mm,
            "new_max_extent_mm": new_max_extent,
            "vertex_count": len(mesh.vertices),
            "face_count": len(mesh.faces),
            "is_watertight": mesh.is_watertight,
            "stl_file_size": stl_size
        }
        
    except Exception as e:
        print(f"❌ [MESH-NORM] Mesh normalization failed: {e}")
        return {
            "success": False,
            "error": str(e)
        }


def main():
    """
    Main entry point for the Python quality service
    """
    if len(sys.argv) < 2:
        print("Usage: python3 python-quality-service.py <command> [args...]")
        print("Commands:")
        print("  remove-bg <input_path> <output_path>")
        print("  normalize-mesh <glb_path> <stl_path> [target_size_mm]")
        sys.exit(1)
    
    command = sys.argv[1]
    
    if command == "remove-bg":
        if len(sys.argv) != 4:
            print("Usage: python3 python-quality-service.py remove-bg <input_path> <output_path>")
            sys.exit(1)
        
        input_path = sys.argv[2]
        output_path = sys.argv[3]
        
        success = remove_background(input_path, output_path)
        result = {"success": success}
        print(json.dumps(result))
        sys.exit(0 if success else 1)
    
    elif command == "normalize-mesh":
        if len(sys.argv) < 4 or len(sys.argv) > 5:
            print("Usage: python3 python-quality-service.py normalize-mesh <glb_path> <stl_path> [target_size_mm]")
            sys.exit(1)
        
        glb_path = sys.argv[2]
        stl_path = sys.argv[3]
        target_size_mm = float(sys.argv[4]) if len(sys.argv) == 5 else 100.0
        
        result = normalize_mesh_scale(glb_path, stl_path, target_size_mm)
        print(json.dumps(result))
        sys.exit(0 if result["success"] else 1)
    
    else:
        print(f"Unknown command: {command}")
        sys.exit(1)


if __name__ == "__main__":
    main()