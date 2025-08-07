import { spawn } from 'child_process';
import Replicate from 'replicate';
import path from 'path';
import { promises as fsPromises } from 'fs';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

export interface BackgroundRemovalResult {
  success: boolean;
  cleanedImagePath?: string;
  cleanedImageUrl?: string;
  method: 'replicate' | 'opencv' | 'none';
  error?: string;
  processingTime?: number;
}

/**
 * Hybrid background removal pipeline:
 * 1. Try Replicate rembg model first
 * 2. Fall back to OpenCV if Replicate fails
 * 3. Always save cleaned image to /uploads/clean/
 */
export async function removeBackgroundHybrid(
  originalImageUrl: string, 
  originalImagePath: string
): Promise<BackgroundRemovalResult> {
  const startTime = Date.now();
  console.log(`🧼 [HYBRID-BG] Starting hybrid background removal pipeline...`);
  console.log(`📷 [HYBRID-BG] Original image URL: ${originalImageUrl}`);
  console.log(`📁 [HYBRID-BG] Original image path: ${originalImagePath}`);
  
  // Extract filename for clean image
  const filename = path.basename(originalImagePath);
  const cleanImageFilename = `clean_${filename}`;
  const cleanImagePath = path.join(process.cwd(), 'uploads/clean', cleanImageFilename);
  
  // Ensure clean directory exists
  await fsPromises.mkdir(path.dirname(cleanImagePath), { recursive: true });
  
  // Method 1: Try Replicate background removal first
  try {
    console.log(`🚀 [HYBRID-BG] Method 1: Attempting Replicate rembg model...`);
    const result = await tryReplicateBackgroundRemoval(originalImageUrl, cleanImagePath);
    
    if (result.success) {
      const processingTime = Date.now() - startTime;
      console.log(`✅ [HYBRID-BG] SUCCESS: Replicate background removal completed in ${processingTime}ms`);
      
      // Generate URL for cleaned image
      const baseUrl = process.env.REPLIT_DOMAINS || process.env.REPLIT_DEV_DOMAIN || 'localhost:5000';
      const protocol = baseUrl.includes('localhost') ? 'http' : 'https';
      const cleanedImageUrl = `${protocol}://${baseUrl}/uploads/clean/${cleanImageFilename}`;
      
      return {
        success: true,
        cleanedImagePath,
        cleanedImageUrl,
        method: 'replicate',
        processingTime
      };
    } else {
      console.warn(`⚠️ [HYBRID-BG] Replicate method failed: ${result.error}`);
    }
  } catch (error: any) {
    console.warn(`⚠️ [HYBRID-BG] Replicate method threw error: ${error.message}`);
  }
  
  // Method 2: Fall back to OpenCV background removal
  try {
    console.log(`🔄 [HYBRID-BG] Method 2: Falling back to OpenCV background removal...`);
    const result = await tryOpenCVBackgroundRemoval(originalImagePath, cleanImagePath);
    
    if (result.success) {
      const processingTime = Date.now() - startTime;
      console.log(`✅ [HYBRID-BG] SUCCESS: OpenCV background removal completed in ${processingTime}ms`);
      
      // Generate URL for cleaned image
      const baseUrl = process.env.REPLIT_DOMAINS || process.env.REPLIT_DEV_DOMAIN || 'localhost:5000';
      const protocol = baseUrl.includes('localhost') ? 'http' : 'https';
      const cleanedImageUrl = `${protocol}://${baseUrl}/uploads/clean/${cleanImageFilename}`;
      
      return {
        success: true,
        cleanedImagePath,
        cleanedImageUrl,
        method: 'opencv',
        processingTime
      };
    } else {
      console.error(`❌ [HYBRID-BG] OpenCV method also failed: ${result.error}`);
    }
  } catch (error: any) {
    console.error(`❌ [HYBRID-BG] OpenCV method threw error: ${error.message}`);
  }
  
  // Both methods failed
  const processingTime = Date.now() - startTime;
  console.error(`❌ [HYBRID-BG] FAILURE: All background removal methods failed after ${processingTime}ms`);
  
  return {
    success: false,
    method: 'none',
    error: 'Both Replicate and OpenCV background removal methods failed',
    processingTime
  };
}

/**
 * Try Replicate background removal with proper error handling
 */
async function tryReplicateBackgroundRemoval(
  imageUrl: string, 
  outputPath: string
): Promise<{success: boolean; error?: string}> {
  try {
    // Use the working rembg model
    const bgRemovalModel = "cjwbw/rembg:fb8af171cfa1616ddcf1242c093f9c46bcada5ad4cf6f2fbe8b81b330ec5c003";
    console.log(`🔮 [REPLICATE-BG] Calling model: ${bgRemovalModel}`);
    
    const bgRemovalOutput: any = await replicate.run(bgRemovalModel, {
      input: {
        image: imageUrl
      }
    });
    
    console.log(`📦 [REPLICATE-BG] Response type: ${typeof bgRemovalOutput}`);
    console.log(`📝 [REPLICATE-BG] Response constructor: ${bgRemovalOutput?.constructor?.name}`);
    
    // Handle different response formats
    if (bgRemovalOutput && typeof bgRemovalOutput === 'object' && bgRemovalOutput.constructor?.name === 'ReadableStream') {
      console.log(`📥 [REPLICATE-BG] Processing ReadableStream response...`);
      
      // Convert ReadableStream to buffer
      const reader = bgRemovalOutput.getReader();
      const chunks = [];
      
      let done = false;
      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          chunks.push(value);
        }
      }
      
      const buffer = Buffer.concat(chunks);
      
      if (buffer.length < 1024) {
        return { success: false, error: `Image too small: ${buffer.length} bytes` };
      }
      
      // Save the cleaned image
      await fsPromises.writeFile(outputPath, buffer);
      
      console.log(`💾 [REPLICATE-BG] Saved cleaned image: ${outputPath}`);
      console.log(`📊 [REPLICATE-BG] File size: ${buffer.length} bytes (${(buffer.length / 1024 / 1024).toFixed(2)} MB)`);
      
      return { success: true };
    } 
    else if (typeof bgRemovalOutput === 'string' && bgRemovalOutput.startsWith('https://')) {
      console.log(`📥 [REPLICATE-BG] Processing URL response: ${bgRemovalOutput}`);
      
      // Download from URL
      const response = await fetch(bgRemovalOutput);
      if (!response.ok) {
        return { success: false, error: `Failed to download from URL: ${response.status}` };
      }
      
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      if (buffer.length < 1024) {
        return { success: false, error: `Downloaded image too small: ${buffer.length} bytes` };
      }
      
      await fsPromises.writeFile(outputPath, buffer);
      
      console.log(`💾 [REPLICATE-BG] Downloaded and saved cleaned image: ${outputPath}`);
      console.log(`📊 [REPLICATE-BG] File size: ${buffer.length} bytes (${(buffer.length / 1024 / 1024).toFixed(2)} MB)`);
      
      return { success: true };
    }
    else if (Array.isArray(bgRemovalOutput) && bgRemovalOutput.length > 0) {
      const imageUrl = bgRemovalOutput[0];
      if (typeof imageUrl === 'string' && imageUrl.startsWith('https://')) {
        console.log(`📥 [REPLICATE-BG] Processing array URL response: ${imageUrl}`);
        return await tryReplicateBackgroundRemoval(imageUrl, outputPath);
      }
    }
    
    return { success: false, error: `Unexpected response format: ${JSON.stringify(bgRemovalOutput)}` };
    
  } catch (error: any) {
    console.error(`❌ [REPLICATE-BG] Error:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Try OpenCV background removal as fallback
 */
async function tryOpenCVBackgroundRemoval(
  inputPath: string,
  outputPath: string
): Promise<{success: boolean; error?: string}> {
  return new Promise((resolve) => {
    const pythonScript = path.join(process.cwd(), 'server/opencv-fallback.py');
    
    console.log(`🐍 [OPENCV-BG] Executing Python script: ${pythonScript}`);
    console.log(`📥 [OPENCV-BG] Input: ${inputPath}`);
    console.log(`📤 [OPENCV-BG] Output: ${outputPath}`);
    
    const pythonProcess = spawn('python3', [pythonScript, inputPath, outputPath], {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let stdout = '';
    let stderr = '';
    
    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
      console.log(`🐍 [OPENCV-BG] ${data.toString().trim()}`);
    });
    
    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
      console.error(`🐍 [OPENCV-BG] Error: ${data.toString().trim()}`);
    });
    
    pythonProcess.on('close', (code) => {
      console.log(`🐍 [OPENCV-BG] Process completed with code: ${code}`);
      
      if (code === 0 && stdout.includes('SUCCESS')) {
        resolve({ success: true });
      } else {
        const error = stderr || `Process exited with code ${code}`;
        resolve({ success: false, error });
      }
    });
    
    pythonProcess.on('error', (error) => {
      console.error(`🐍 [OPENCV-BG] Process error:`, error);
      resolve({ success: false, error: error.message });
    });
  });
}