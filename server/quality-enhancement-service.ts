/**
 * Quality Enhancement Service for STL Generation Pipeline
 * Provides background removal, mesh normalization, and quality gates
 */

import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { promises as fsPromises } from 'fs';

const PYTHON_SERVICE_PATH = path.join(__dirname, 'python-quality-service.py');
const MIN_STL_SIZE_KB = 10; // Minimum STL file size in KB

export interface BackgroundRemovalResult {
  success: boolean;
  cleanImagePath?: string;
  originalImagePath?: string;
  error?: string;
}

export interface MeshNormalizationResult {
  success: boolean;
  originalExtents?: number[];
  newExtents?: number[];
  scaleFactor?: number;
  targetSizeMm?: number;
  newMaxExtentMm?: number;
  vertexCount?: number;
  faceCount?: number;
  isWatertight?: boolean;
  stlFileSize?: number;
  error?: string;
}

export interface QualityGateResult {
  passed: boolean;
  fileSizeKB: number;
  reason?: string;
}

/**
 * Remove background from uploaded image before sending to TripoSR
 * Saves cleaned image to /uploads/clean/ directory
 */
export async function removeImageBackground(originalImagePath: string): Promise<BackgroundRemovalResult> {
  try {
    console.log(`🧼 [BG-REMOVAL] Starting background removal for: ${originalImagePath}`);
    
    // Create clean directory if it doesn't exist
    const cleanDir = path.join(process.cwd(), 'uploads', 'clean');
    await ensureDirectoryExists(cleanDir);
    
    // Generate clean image path
    const originalFilename = path.basename(originalImagePath);
    const fileExt = path.extname(originalFilename);
    const baseName = path.basename(originalFilename, fileExt);
    const cleanFilename = `clean_${baseName}${fileExt}`;
    const cleanImagePath = path.join(cleanDir, cleanFilename);
    
    console.log(`📁 [BG-REMOVAL] Clean image will be saved to: ${cleanImagePath}`);
    
    // Call Python background removal service
    const result = await callPythonService('remove-bg', [originalImagePath, cleanImagePath]);
    
    if (result.success) {
      // Verify the cleaned file was created and has reasonable size
      const cleanStats = await fsPromises.stat(cleanImagePath);
      console.log(`✅ [BG-REMOVAL] Background removed successfully`);
      console.log(`📊 [BG-REMOVAL] Clean image size: ${cleanStats.size} bytes (${(cleanStats.size / 1024 / 1024).toFixed(2)} MB)`);
      
      return {
        success: true,
        cleanImagePath,
        originalImagePath
      };
    } else {
      console.error(`❌ [BG-REMOVAL] Background removal failed`);
      return {
        success: false,
        originalImagePath,
        error: 'Background removal failed'
      };
    }
    
  } catch (error: any) {
    console.error(`❌ [BG-REMOVAL] Error in background removal:`, error);
    return {
      success: false,
      originalImagePath,
      error: error.message
    };
  }
}

/**
 * Normalize mesh scale using trimesh:
 * - Center mesh at origin
 * - Scale largest axis to exactly 100mm
 * - Export STL using normalized scale
 */
export async function normalizeMeshScale(
  glbPath: string, 
  stlPath: string, 
  targetSizeMm: number = 100
): Promise<MeshNormalizationResult> {
  try {
    console.log(`🔧 [MESH-NORM] Starting mesh normalization`);
    console.log(`📥 [MESH-NORM] GLB input: ${glbPath}`);
    console.log(`📤 [MESH-NORM] STL output: ${stlPath}`);
    console.log(`🎯 [MESH-NORM] Target size: ${targetSizeMm}mm`);
    
    // Ensure output directory exists
    const stlDir = path.dirname(stlPath);
    await ensureDirectoryExists(stlDir);
    
    // Call Python mesh normalization service
    const result = await callPythonService('normalize-mesh', [glbPath, stlPath, targetSizeMm.toString()]);
    
    if (result.success) {
      console.log(`✅ [MESH-NORM] Mesh normalization completed successfully`);
      console.log(`📊 [MESH-NORM] Scale factor: ${result.scaleFactor}`);
      console.log(`📏 [MESH-NORM] New max extent: ${result.newMaxExtentMm}mm`);
      console.log(`📊 [MESH-NORM] Vertices: ${result.vertexCount}, Faces: ${result.faceCount}`);
      console.log(`💧 [MESH-NORM] Watertight: ${result.isWatertight}`);
      
      return result as MeshNormalizationResult;
    } else {
      console.error(`❌ [MESH-NORM] Mesh normalization failed: ${result.error}`);
      return {
        success: false,
        error: result.error || 'Mesh normalization failed'
      };
    }
    
  } catch (error: any) {
    console.error(`❌ [MESH-NORM] Error in mesh normalization:`, error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Quality gate: Check if STL file meets minimum requirements
 * Rejects files smaller than 10KB as they likely contain no meaningful geometry
 */
export async function validateSTLQuality(stlPath: string): Promise<QualityGateResult> {
  try {
    console.log(`⚠️ [QUALITY-GATE] Validating STL file: ${stlPath}`);
    
    // Check if file exists
    if (!fs.existsSync(stlPath)) {
      console.error(`❌ [QUALITY-GATE] STL file does not exist: ${stlPath}`);
      return {
        passed: false,
        fileSizeKB: 0,
        reason: 'STL file not found'
      };
    }
    
    // Get file size
    const stats = await fsPromises.stat(stlPath);
    const fileSizeKB = stats.size / 1024;
    
    console.log(`📊 [QUALITY-GATE] STL file size: ${stats.size} bytes (${fileSizeKB.toFixed(1)} KB)`);
    
    // Check minimum size requirement
    if (fileSizeKB < MIN_STL_SIZE_KB) {
      console.error(`🚫 [QUALITY-GATE] STL file too small: ${fileSizeKB.toFixed(1)} KB < ${MIN_STL_SIZE_KB} KB minimum`);
      console.error(`🚫 [QUALITY-GATE] This indicates the 3D model contains insufficient geometry data`);
      
      return {
        passed: false,
        fileSizeKB,
        reason: `STL file too small (${fileSizeKB.toFixed(1)} KB < ${MIN_STL_SIZE_KB} KB). The 3D model likely contains insufficient geometry data for 3D printing.`
      };
    }
    
    console.log(`✅ [QUALITY-GATE] STL file passed quality validation`);
    return {
      passed: true,
      fileSizeKB
    };
    
  } catch (error: any) {
    console.error(`❌ [QUALITY-GATE] Error validating STL quality:`, error);
    return {
      passed: false,
      fileSizeKB: 0,
      reason: `Quality validation error: ${error.message}`
    };
  }
}

/**
 * Helper function to call Python service and parse JSON response
 */
async function callPythonService(command: string, args: string[]): Promise<any> {
  return new Promise((resolve, reject) => {
    const pythonArgs = [PYTHON_SERVICE_PATH, command, ...args];
    console.log(`🐍 [PYTHON-SERVICE] Calling: python3 ${pythonArgs.join(' ')}`);
    
    const python = spawn('python3', pythonArgs);
    
    let stdout = '';
    let stderr = '';
    
    python.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    python.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    python.on('close', (code) => {
      console.log(`🐍 [PYTHON-SERVICE] Process exited with code ${code}`);
      
      if (stderr) {
        console.log(`🐍 [PYTHON-SERVICE] Python output:`, stderr);
      }
      
      if (code === 0) {
        try {
          // Parse the last line as JSON (the actual result)
          const lines = stdout.trim().split('\n');
          const jsonLine = lines[lines.length - 1];
          const result = JSON.parse(jsonLine);
          resolve(result);
        } catch (parseError) {
          console.error(`❌ [PYTHON-SERVICE] Failed to parse JSON response:`, parseError);
          console.error(`📝 [PYTHON-SERVICE] Raw stdout:`, stdout);
          reject(new Error(`Failed to parse Python service response: ${parseError}`));
        }
      } else {
        reject(new Error(`Python service failed with exit code ${code}: ${stderr || stdout}`));
      }
    });
    
    python.on('error', (error) => {
      console.error(`❌ [PYTHON-SERVICE] Python process error:`, error);
      reject(error);
    });
  });
}

/**
 * Helper function to ensure directory exists
 */
async function ensureDirectoryExists(dirPath: string): Promise<void> {
  try {
    await fsPromises.mkdir(dirPath, { recursive: true });
  } catch (error: any) {
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }
}

/**
 * Get the URL for a clean image (for serving via API)
 */
export function getCleanImageUrl(cleanImagePath: string, req?: any): string {
  const relativePath = path.relative(path.join(process.cwd(), 'uploads'), cleanImagePath);
  const replicateUrl = process.env.REPLIT_DOMAINS || process.env.REPLIT_DEV_DOMAIN;
  const baseUrl = replicateUrl || (req?.get('host')) || 'localhost:5000';
  const protocol = baseUrl.includes('localhost') ? 'http' : 'https';
  return `${protocol}://${baseUrl}/uploads/${relativePath}`;
}