import Replicate from 'replicate';
import fs from 'fs';
import { promises as fsPromises } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// GLB to STL conversion with proper Three.js parsing and mesh validation
async function convertGLBtoSTL(glbBuffer: Buffer): Promise<Buffer> {
  try {
    console.log(`🔄 Converting GLB to STL (${glbBuffer.length} bytes)`);
    
    // Parse GLB with Three.js GLTF Loader
    const gltf = await parseGLBWithThreeJS(glbBuffer);
    
    // Validate meshes
    const meshes = extractMeshes(gltf);
    console.log(`🔍 [MESH-VALIDATION] Found ${meshes.length} mesh(es) in GLB`);
    
    if (meshes.length === 0) {
      console.error('❌ [MESH-VALIDATION] No meshes found in GLB - cannot generate STL');
      throw new Error('GLB contains no valid meshes for STL conversion');
    }
    
    // Count total vertices across all meshes
    let totalVertices = 0;
    let totalTriangles = 0;
    
    meshes.forEach((mesh, index) => {
      const geometry = mesh.geometry;
      const vertexCount = geometry.attributes.position ? geometry.attributes.position.count : 0;
      const triangleCount = geometry.index ? geometry.index.count / 3 : vertexCount / 3;
      
      totalVertices += vertexCount;
      totalTriangles += triangleCount;
      
      console.log(`📐 [MESH-VALIDATION] Mesh ${index + 1}: ${vertexCount} vertices, ~${Math.floor(triangleCount)} triangles`);
    });
    
    console.log(`📊 [MESH-VALIDATION] Total: ${totalVertices} vertices, ~${Math.floor(totalTriangles)} triangles`);
    
    if (totalVertices === 0) {
      console.error('❌ [MESH-VALIDATION] All meshes have zero vertices - cannot generate STL');
      throw new Error('GLB meshes contain no vertex data for STL conversion');
    }
    
    // Convert validated meshes to STL
    const stlBuffer = convertMeshesToBinarySTL(meshes);
    
    console.log(`✅ STL conversion completed (${stlBuffer.length} bytes) from ${meshes.length} mesh(es)`);
    return stlBuffer;
    
  } catch (error) {
    console.error('❌ GLB to STL conversion failed:', error);
    throw error; // Re-throw to mark order as failed instead of using fallback
  }
}

// Create a detailed STL file based on GLB input
function createDetailedSTL(originalSize: number, timestamp: number): Buffer {
  // Calculate triangle count based on original file size for realistic appearance
  const triangleCount = Math.max(12, Math.min(1000, Math.floor(originalSize / 1000)));
  
  const header = Buffer.alloc(80, 0);
  header.write(`Formily 3D Model - Generated ${new Date(timestamp).toISOString()}`, 0, 'ascii');
  
  const triangleCountBuffer = Buffer.alloc(4);
  triangleCountBuffer.writeUInt32LE(triangleCount, 0);
  
  const triangles = [];
  
  // Generate triangles for a more complex shape (like a simple sculpture base)
  for (let i = 0; i < triangleCount; i++) {
    const triangle = Buffer.alloc(50); // 50 bytes per triangle
    let offset = 0;
    
    // Normal vector (randomized but valid)
    const nx = (Math.random() - 0.5) * 2;
    const ny = (Math.random() - 0.5) * 2;
    const nz = Math.max(0.1, Math.random()); // Prefer upward normals
    triangle.writeFloatLE(nx, offset); offset += 4;
    triangle.writeFloatLE(ny, offset); offset += 4;
    triangle.writeFloatLE(nz, offset); offset += 4;
    
    // Three vertices with variation based on position
    for (let j = 0; j < 3; j++) {
      const angle = (i * 3 + j) * 2 * Math.PI / triangleCount;
      const radius = 5 + Math.sin(i * 0.1) * 2;
      const height = Math.cos(i * 0.05) * 3;
      
      triangle.writeFloatLE(Math.cos(angle) * radius, offset); offset += 4;
      triangle.writeFloatLE(Math.sin(angle) * radius, offset); offset += 4;
      triangle.writeFloatLE(height, offset); offset += 4;
    }
    
    // Attribute byte count (0)
    triangle.writeUInt16LE(0, offset);
    
    triangles.push(triangle);
  }
  
  return Buffer.concat([header, triangleCountBuffer, ...triangles]);
}

// Create a minimal valid STL file as fallback
function createPlaceholderSTL(): Buffer {
  const stlHeader = Buffer.alloc(80, 0); // 80-byte header
  const triangleCount = Buffer.alloc(4);
  triangleCount.writeUInt32LE(2, 0); // 2 triangles for a simple quad

  // Two triangles forming a simple rectangle
  const triangle1 = Buffer.from([
    // Normal vector (0, 0, 1)
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x80, 0x3f,
    // Vertex 1 (0, 0, 0)
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    // Vertex 2 (1, 0, 0)
    0x00, 0x00, 0x80, 0x3f, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    // Vertex 3 (0, 1, 0)
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x80, 0x3f, 0x00, 0x00, 0x00, 0x00,
    // Attribute byte count
    0x00, 0x00
  ]);

  const triangle2 = Buffer.from([
    // Normal vector (0, 0, 1)
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x80, 0x3f,
    // Vertex 1 (1, 0, 0)
    0x00, 0x00, 0x80, 0x3f, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    // Vertex 2 (1, 1, 0)
    0x00, 0x00, 0x80, 0x3f, 0x00, 0x00, 0x80, 0x3f, 0x00, 0x00, 0x00, 0x00,
    // Vertex 3 (0, 1, 0)
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x80, 0x3f, 0x00, 0x00, 0x00, 0x00,
    // Attribute byte count
    0x00, 0x00
  ]);

  return Buffer.concat([stlHeader, triangleCount, triangle1, triangle2]);
}

// Ensure directory exists
async function ensureDirectoryExists(dirPath: string): Promise<void> {
  try {
    await fsPromises.mkdir(dirPath, { recursive: true });
  } catch (error: any) {
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }
}

// Download file from URL and return as Buffer
async function downloadFile(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.statusText}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

// Save STL file and return public URL
async function saveSTLFile(stlBuffer: Buffer, filename: string): Promise<string> {
  console.log(`💾 [SAVE-STL] Starting file save process`);
  console.log(`📊 [SAVE-STL] Buffer size: ${stlBuffer.length} bytes`);
  console.log(`📄 [SAVE-STL] Target filename: ${filename}`);
  
  // Create uploads directory if it doesn't exist
  const uploadsDir = path.join(process.cwd(), 'uploads', 'stl');
  console.log(`📁 [SAVE-STL] Target directory: ${uploadsDir}`);
  
  if (!fs.existsSync(uploadsDir)) {
    console.log(`📁 [SAVE-STL] Directory does not exist, creating...`);
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log(`✅ [SAVE-STL] Directory created successfully`);
  } else {
    console.log(`✅ [SAVE-STL] Directory already exists`);
  }

  const filePath = path.join(uploadsDir, filename);
  console.log(`🗂️ [SAVE-STL] Full file path: ${filePath}`);
  console.log(`🔍 [DEBUG] Path components:`);
  console.log(`   - uploadsDir: "${uploadsDir}"`);
  console.log(`   - filename: "${filename}"`);
  console.log(`   - resolved path: "${filePath}"`);
  
  console.log(`💾 [SAVE-STL] Writing file to disk...`);
  await fsPromises.writeFile(filePath, stlBuffer);
  
  // Verify file was written successfully
  try {
    const stats = await fsPromises.stat(filePath);
    console.log(`✅ [SAVE-STL] File verification successful`);
    console.log(`📊 [SAVE-STL] File size on disk: ${stats.size} bytes`);
    console.log(`📅 [SAVE-STL] File created: ${stats.birthtime.toISOString()}`);
    console.log(`📅 [SAVE-STL] File modified: ${stats.mtime.toISOString()}`);
  } catch (verifyError: any) {
    console.error(`❌ [SAVE-STL] File verification failed:`, verifyError);
    throw new Error(`STL file verification failed: ${verifyError.message}`);
  }

  // Return public URL
  const baseUrl = process.env.REPLIT_DOMAINS || process.env.REPLIT_DEV_DOMAIN || 'localhost:5000';
  const protocol = baseUrl.includes('localhost') ? 'http' : 'https';
  const publicUrl = `${protocol}://${baseUrl}/api/download-stl/${filename}`;
  
  console.log(`🔗 [SAVE-STL] Public URL constructed: ${publicUrl}`);
  console.log(`✅ [SAVE-STL] File save process completed successfully`);
  
  return publicUrl;
}

export interface STLGenerationParams {
  orderId: string;
  imageUrl: string;
  modelType: string;
  engravingText?: string;
  fontStyle?: string;
  color?: string;
  quality?: string;
  specifications?: any;
}

export interface STLGenerationResult {
  stlFileUrl: string;
  details: {
    filename: string;
    fileSize: number;
    modelType: string;
    quality: string;
    processingTime: number;
    features: {
      hasEngraving: boolean;
      engravingText: string | null;
      fontStyle: string;
      color: string;
    };
    metadata: {
      generatedAt: string;
      service: string;
      orderId: string;
      replicateVersion?: string;
      meshNormalization?: {
        scaleFactor?: number;
        targetSizeMm?: number;
        vertexCount?: number;
        faceCount?: number;
        isWatertight?: boolean;
      };
      qualityGate?: {
        passed: boolean;
        fileSizeKB: number;
      };
    };
  };
}

export async function generateSTLWithReplicate(params: STLGenerationParams): Promise<STLGenerationResult> {
  const startTime = Date.now();
  console.log(`🤖 Starting enhanced STL generation with quality improvements...`);
  console.log(`📋 Parameters:`, JSON.stringify(params, null, 2));

  try {
    // Step 1: Validate image URL
    console.log(`🔍 [STL-GEN] Starting STL generation for order: ${params.orderId}`);
    console.log(`📷 [STL-GEN] Validating image URL: ${params.imageUrl}`);
    console.log(`🎯 [STL-GEN] Model type: ${params.modelType}`);
    
    // Step 2: Background removal preprocessing
    console.log(`🧼 [STL-GEN] Applying background removal preprocessing...`);
    const { removeImageBackground } = await import('./quality-enhancement-service');
    
    // Extract local file path from image URL
    let localImagePath = params.imageUrl;
    if (params.imageUrl.includes('/uploads/')) {
      const urlPath = new URL(params.imageUrl).pathname;
      localImagePath = path.join(process.cwd(), urlPath.substring(1)); // Remove leading slash
    }
    
    console.log(`📁 [STL-GEN] Local image path: ${localImagePath}`);
    
    const backgroundRemovalResult = await removeImageBackground(localImagePath);
    let imageUrlForTripoSR = params.imageUrl; // Fallback to original
    
    if (backgroundRemovalResult.success && backgroundRemovalResult.cleanImagePath) {
      // Use cleaned image for TripoSR
      const cleanRelativePath = path.relative(path.join(process.cwd(), 'uploads'), backgroundRemovalResult.cleanImagePath);
      const replicateUrl = process.env.REPLIT_DOMAINS || process.env.REPLIT_DEV_DOMAIN;
      const baseUrl = replicateUrl || 'localhost:5000';
      const protocol = baseUrl.includes('localhost') ? 'http' : 'https';
      imageUrlForTripoSR = `${protocol}://${baseUrl}/uploads/${cleanRelativePath}`;
      
      console.log(`✅ [STL-GEN] Using cleaned image for TripoSR: ${imageUrlForTripoSR}`);
    } else {
      console.log(`⚠️ [STL-GEN] Background removal failed, using original image: ${params.imageUrl}`);
    }
    
    // Step 3: Call Replicate TripoSR model
    const modelVersion = "camenduru/tripo-sr:e0d3fe8abce3ba86497ea3530d9eae59af7b2231b6c82bedfc32b0732d35ec3a";
    console.log(`🚀 [STL-GEN] Calling Replicate TripoSR model: ${modelVersion}`);
    console.log(`⏱️ [STL-GEN] Request timestamp: ${new Date().toISOString()}`);
    
    const output = await replicate.run(modelVersion, {
      input: {
        image_path: imageUrlForTripoSR, // Use cleaned image
        do_remove_background: false // We already did background removal
      }
    });

    console.log(`✅ [STL-GEN] Replicate API response received`);
    console.log(`📦 [STL-GEN] Response type: ${typeof output}`);
    console.log(`📝 [STL-GEN] Raw response:`, JSON.stringify(output, null, 2));

    // Step 3: Handle GLB file from TripoSR (can be URL or ReadableStream)
    let glbUrl: string;
    if (typeof output === 'string') {
      glbUrl = output;
      console.log(`🔗 [STL-GEN] GLB URL extracted from string response`);
    } else if (Array.isArray(output) && output.length > 0) {
      glbUrl = output[0];
      console.log(`🔗 [STL-GEN] GLB URL extracted from array response (index 0)`);
    } else if (output && typeof output === 'object' && 'glb' in output) {
      glbUrl = (output as any).glb;
      console.log(`🔗 [STL-GEN] GLB URL extracted from object.glb`);
    } else if (output && output instanceof ReadableStream) {
      // TripoSR returns GLB file as ReadableStream
      console.log(`📦 [STL-GEN] Received GLB file as ReadableStream - converting to local file`);
      
      const reader = output.getReader();
      const chunks = [];
      let done = false;
      
      while (!done) {
        const { value, done: streamDone } = await reader.read();
        done = streamDone;
        if (value) {
          chunks.push(value);
        }
      }
      
      const glbBuffer = Buffer.concat(chunks);
      console.log(`📊 [STL-GEN] GLB stream size: ${glbBuffer.length} bytes (${(glbBuffer.length / 1024 / 1024).toFixed(2)} MB)`);
      
      // Save temporary GLB file and use path for conversion
      const tempFilename = `temp_${params.orderId}_${Date.now()}.glb`;
      const tempDir = path.join(process.cwd(), 'uploads/temp');
      await ensureDirectoryExists(tempDir);
      const tempPath = path.join(tempDir, tempFilename);
      
      await fsPromises.writeFile(tempPath, glbBuffer);
      console.log(`💾 [STL-GEN] GLB file saved temporarily: ${tempPath}`);
      
      // Step 4: Enhanced GLB to STL conversion with mesh normalization
      console.log(`🔧 [STL-GEN] Using enhanced GLB to STL conversion with trimesh normalization`);
      
      const conversionStartTime = Date.now();
      const timestamp = Date.now();
      const filename = `${params.orderId}-${params.modelType}-${timestamp}.stl`;
      
      // Setup paths for normalized STL generation
      const stlDir = path.join(process.cwd(), 'uploads/stl');
      await ensureDirectoryExists(stlDir);
      const finalStlPath = path.join(stlDir, filename);
      
      console.log(`📁 [STL-GEN] Final STL path: ${finalStlPath}`);
      
      // Import quality enhancement services
      const { normalizeMeshScale, validateSTLQuality } = await import('./quality-enhancement-service');
      
      // Use trimesh to normalize mesh scale and export STL
      const normalizationResult = await normalizeMeshScale(tempPath, finalStlPath, 100); // 100mm target
      
      if (!normalizationResult.success) {
        console.error(`❌ [STL-GEN] Mesh normalization failed: ${normalizationResult.error}`);
        throw new Error(`Mesh normalization failed: ${normalizationResult.error}`);
      }
      
      console.log(`✅ [STL-GEN] Mesh normalization completed successfully`);
      console.log(`📊 [STL-GEN] Scale factor: ${normalizationResult.scaleFactor}`);
      console.log(`📏 [STL-GEN] Normalized size: ${normalizationResult.newMaxExtentMm}mm`);
      console.log(`💧 [STL-GEN] Watertight: ${normalizationResult.isWatertight}`);
      
      // Step 5: Quality gate validation
      console.log(`⚠️ [STL-GEN] Applying quality gate validation...`);
      const qualityResult = await validateSTLQuality(finalStlPath);
      
      if (!qualityResult.passed) {
        console.error(`🚫 [STL-GEN] STL file failed quality gate: ${qualityResult.reason}`);
        console.error(`🚫 [STL-GEN] File size: ${qualityResult.fileSizeKB.toFixed(1)} KB`);
        
        // Delete the failed STL file
        try {
          await fsPromises.unlink(finalStlPath);
          console.log(`🗑️ [STL-GEN] Deleted failed STL file: ${finalStlPath}`);
        } catch (deleteError) {
          console.error(`⚠️ [STL-GEN] Could not delete failed STL file:`, deleteError);
        }
        
        throw new Error(qualityResult.reason || 'STL file failed quality validation');
      }
      
      console.log(`✅ [STL-GEN] STL file passed quality gate (${qualityResult.fileSizeKB.toFixed(1)} KB)`);
      
      const conversionTime = Date.now() - conversionStartTime;
      console.log(`⏱️ [STL-GEN] Total enhanced conversion time: ${conversionTime}ms`);
      
      // Generate STL file URL
      const baseUrl = process.env.REPLIT_DOMAINS || process.env.REPLIT_DEV_DOMAIN || 'localhost:5000';
      const protocol = baseUrl.includes('localhost') ? 'http' : 'https';
      const stlFileUrl = `${protocol}://${baseUrl}/api/download-stl/${filename}`;
      
      // Calculate final processing time
      const processingTime = Date.now() - startTime;
      
      return {
        stlFileUrl,
        details: {
          filename,
          fileSize: normalizationResult.stlFileSize || 0,
          modelType: params.modelType,
          quality: params.quality || 'standard',
          processingTime,
          features: {
            hasEngraving: Boolean(params.engravingText),
            engravingText: params.engravingText || null,
            fontStyle: params.fontStyle || 'arial',
            color: params.color || 'black'
          },
          metadata: {
            generatedAt: new Date().toISOString(),
            service: 'Enhanced TripoSR + Trimesh',
            orderId: params.orderId,
            replicateVersion: modelVersion,
            meshNormalization: {
              scaleFactor: normalizationResult.scaleFactor,
              targetSizeMm: normalizationResult.targetSizeMm,
              vertexCount: normalizationResult.vertexCount,
              faceCount: normalizationResult.faceCount,
              isWatertight: normalizationResult.isWatertight
            },
            qualityGate: {
              passed: qualityResult.passed,
              fileSizeKB: qualityResult.fileSizeKB
            }
          }
        }
      };
    } else {
      console.error(`❌ [STL-GEN] Unexpected Replicate output format:`, output);
      throw new Error(`Unexpected output format from Replicate: ${JSON.stringify(output)}`);
    }

    if (!glbUrl || !glbUrl.startsWith('http')) {
      console.error(`❌ [STL-GEN] Invalid GLB URL received: ${glbUrl}`);
      throw new Error(`Invalid GLB URL received: ${glbUrl}`);
    }

    console.log(`🔗 [STL-GEN] Valid GLB file URL: ${glbUrl}`);

    // Step 4: Download GLB file
    console.log(`📥 [STL-GEN] Downloading GLB file from: ${glbUrl}`);
    const downloadStartTime = Date.now();
    
    const glbBuffer = await downloadFile(glbUrl);
    const downloadTime = Date.now() - downloadStartTime;
    
    console.log(`✅ [STL-GEN] GLB file downloaded successfully`);
    console.log(`📊 [STL-GEN] GLB file size: ${glbBuffer.length} bytes (${(glbBuffer.length / 1024 / 1024).toFixed(2)} MB)`);
    console.log(`⏱️ [STL-GEN] Download time: ${downloadTime}ms`);

    // Save GLB file temporarily for trimesh processing
    const tempFilename = `temp_${params.orderId}_${Date.now()}.glb`;
    const tempDir = path.join(process.cwd(), 'uploads/temp');
    await ensureDirectoryExists(tempDir);
    const tempPath = path.join(tempDir, tempFilename);
    
    await fsPromises.writeFile(tempPath, glbBuffer);
    console.log(`💾 [STL-GEN] GLB file saved temporarily: ${tempPath}`);

    // Step 5: Enhanced GLB to STL conversion with mesh normalization
    console.log(`🔧 [STL-GEN] Using enhanced GLB to STL conversion with trimesh normalization`);
    
    const conversionStartTime = Date.now();
    const timestamp = Date.now();
    const filename = `${params.orderId}-${params.modelType}-${timestamp}.stl`;
    
    // Setup paths for normalized STL generation
    const stlDir = path.join(process.cwd(), 'uploads/stl');
    await ensureDirectoryExists(stlDir);
    const finalStlPath = path.join(stlDir, filename);
    
    console.log(`📁 [STL-GEN] Final STL path: ${finalStlPath}`);
    
    // Import quality enhancement services
    const { normalizeMeshScale, validateSTLQuality } = await import('./quality-enhancement-service');
    
    // Use trimesh to normalize mesh scale and export STL
    const normalizationResult = await normalizeMeshScale(tempPath, finalStlPath, 100); // 100mm target
    
    if (!normalizationResult.success) {
      console.error(`❌ [STL-GEN] Mesh normalization failed: ${normalizationResult.error}`);
      throw new Error(`Mesh normalization failed: ${normalizationResult.error}`);
    }
    
    console.log(`✅ [STL-GEN] Mesh normalization completed successfully`);
    console.log(`📊 [STL-GEN] Scale factor: ${normalizationResult.scaleFactor}`);
    console.log(`📏 [STL-GEN] Normalized size: ${normalizationResult.newMaxExtentMm}mm`);
    console.log(`💧 [STL-GEN] Watertight: ${normalizationResult.isWatertight}`);
    
    // Step 6: Quality gate validation
    console.log(`⚠️ [STL-GEN] Applying quality gate validation...`);
    const qualityResult = await validateSTLQuality(finalStlPath);
    
    if (!qualityResult.passed) {
      console.error(`🚫 [STL-GEN] STL file failed quality gate: ${qualityResult.reason}`);
      console.error(`🚫 [STL-GEN] File size: ${qualityResult.fileSizeKB.toFixed(1)} KB`);
      
      // Delete the failed STL file
      try {
        await fsPromises.unlink(finalStlPath);
        console.log(`🗑️ [STL-GEN] Deleted failed STL file: ${finalStlPath}`);
      } catch (deleteError) {
        console.error(`⚠️ [STL-GEN] Could not delete failed STL file:`, deleteError);
      }
      
      throw new Error(qualityResult.reason || 'STL file failed quality validation');
    }
    
    console.log(`✅ [STL-GEN] STL file passed quality gate (${qualityResult.fileSizeKB.toFixed(1)} KB)`);
    
    const conversionTime = Date.now() - conversionStartTime;
    console.log(`⏱️ [STL-GEN] Total enhanced conversion time: ${conversionTime}ms`);
    
    // Generate STL file URL
    const baseUrl = process.env.REPLIT_DOMAINS || process.env.REPLIT_DEV_DOMAIN || 'localhost:5000';
    const protocol = baseUrl.includes('localhost') ? 'http' : 'https';
    const stlFileUrl = `${protocol}://${baseUrl}/api/download-stl/${filename}`;
    console.log(`✅ [STL-GEN] STL file saved successfully`);
    console.log(`🔗 [STL-GEN] STL file available at: ${stlFileUrl}`);

    const processingTime = Date.now() - startTime;
    // Remove this line since we're not using stlBuffer anymore - file size comes from normalizationResult

    // Create detailed response with enhanced metadata
    const result: STLGenerationResult = {
      stlFileUrl,
      details: {
        filename,
        fileSize: normalizationResult.stlFileSize || 0,
        modelType: params.modelType,
        quality: params.quality || 'standard',
        processingTime,
        features: {
          hasEngraving: Boolean(params.engravingText),
          engravingText: params.engravingText || null,
          fontStyle: params.fontStyle || 'arial',
          color: params.color || 'black'
        },
        metadata: {
          generatedAt: new Date().toISOString(),
          service: 'Enhanced TripoSR + Trimesh',
          orderId: params.orderId,
          replicateVersion: modelVersion,
          meshNormalization: {
            scaleFactor: normalizationResult.scaleFactor,
            targetSizeMm: normalizationResult.targetSizeMm,
            vertexCount: normalizationResult.vertexCount,
            faceCount: normalizationResult.faceCount,
            isWatertight: normalizationResult.isWatertight
          },
          qualityGate: {
            passed: qualityResult.passed,
            fileSizeKB: qualityResult.fileSizeKB
          }
        }
      }
    };

    console.log(`✅ STL generation completed successfully in ${processingTime}ms`);
    return result;

  } catch (error: any) {
    console.error(`❌ Replicate STL generation failed:`, error);
    
    // Enhanced error handling with specific error types
    if (error.message?.includes('no valid meshes') || error.message?.includes('no vertex data') || error.message?.includes('GLB parsing failed')) {
      console.error('🚫 [MESH-VALIDATION] Order will be marked as failed due to invalid mesh data');
      throw new Error('The AI-generated 3D model contains no valid geometry data. This can happen with complex or unclear images. Please try uploading a clearer photo with better lighting and contrast.');
    } else if (error.message?.includes('No valid triangles found')) {
      console.error('🚫 [MESH-VALIDATION] Order will be marked as failed due to invalid triangle data');
      throw new Error('The 3D model could not be converted to STL format due to invalid geometry. Please try again with a different image.');
    } else if (error.message?.includes('STL file too small') || error.message?.includes('quality validation')) {
      console.error('🚫 [QUALITY-GATE] Order will be marked as failed due to quality gate failure');
      throw new Error(error.message); // Pass through the quality gate error message
    } else if (error.message?.includes('Mesh normalization failed')) {
      console.error('🚫 [MESH-NORM] Order will be marked as failed due to mesh normalization failure');
      throw new Error('The 3D model could not be properly scaled and centered. This may indicate issues with the model geometry. Please try again with a different image.');
    } else if (error.message?.includes('authentication') || error.message?.includes('Authorization')) {
      throw new Error('Replicate authentication failed. Please check REPLICATE_API_TOKEN.');
    } else if (error.message?.includes('Payment Required') || error.message?.includes('Insufficient credit')) {
      throw new Error('Replicate account has insufficient credit. Please add credits at https://replicate.com/account/billing');
    } else if (error.message?.includes('quota') || error.message?.includes('limit')) {
      throw new Error('Replicate API quota exceeded. Please check your account limits.');
    } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
      throw new Error('Network error while connecting to Replicate. Please try again.');
    } else if (error.message?.includes('404') || error.message?.includes('not found')) {
      throw new Error('Replicate model not found. The TripoSR model may be temporarily unavailable.');
    } else {
      throw new Error(`STL generation failed: ${error.message}`);
    }
  }
}

// Parse GLB buffer using Three.js GLTF Loader
async function parseGLBWithThreeJS(glbBuffer: Buffer): Promise<any> {
  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader();
    
    // Convert buffer to ArrayBuffer for Three.js
    const arrayBuffer = glbBuffer.buffer.slice(
      glbBuffer.byteOffset,
      glbBuffer.byteOffset + glbBuffer.byteLength
    );
    
    loader.parse(arrayBuffer, '', (gltf) => {
      console.log('✅ [GLB-PARSE] Successfully parsed GLB with Three.js');
      resolve(gltf);
    }, (error) => {
      console.error('❌ [GLB-PARSE] Failed to parse GLB:', error);
      reject(new Error(`GLB parsing failed: ${error.message}`));
    });
  });
}

// Extract all meshes from parsed GLTF scene
function extractMeshes(gltf: any): THREE.Mesh[] {
  const meshes: THREE.Mesh[] = [];
  
  if (gltf.scene) {
    gltf.scene.traverse((child: any) => {
      if (child instanceof THREE.Mesh) {
        meshes.push(child);
        console.log(`🔍 [MESH-EXTRACT] Found mesh: ${child.name || 'unnamed'}`);
      }
    });
  }
  
  return meshes;
}

// Convert Three.js meshes to binary STL format
function convertMeshesToBinarySTL(meshes: THREE.Mesh[]): Buffer {
  console.log(`🔧 [STL-CONVERT] Converting ${meshes.length} mesh(es) to binary STL`);
  
  // Collect all triangles from all meshes
  const allTriangles: Array<{
    normal: THREE.Vector3;
    vertices: [THREE.Vector3, THREE.Vector3, THREE.Vector3];
  }> = [];
  
  meshes.forEach((mesh, meshIndex) => {
    const geometry = mesh.geometry;
    
    if (!geometry.attributes.position) {
      console.warn(`⚠️ [STL-CONVERT] Mesh ${meshIndex + 1} has no position attribute, skipping`);
      return;
    }
    
    const positions = geometry.attributes.position.array;
    const hasIndex = geometry.index !== null;
    const indices = hasIndex ? geometry.index!.array : null;
    
    const triangleCount = hasIndex ? indices!.length / 3 : positions.length / 9;
    console.log(`🔄 [STL-CONVERT] Processing mesh ${meshIndex + 1}: ${triangleCount} triangles`);
    
    for (let i = 0; i < triangleCount; i++) {
      let i0, i1, i2;
      
      if (hasIndex) {
        i0 = indices![i * 3] * 3;
        i1 = indices![i * 3 + 1] * 3;
        i2 = indices![i * 3 + 2] * 3;
      } else {
        i0 = i * 9;
        i1 = i * 9 + 3;
        i2 = i * 9 + 6;
      }
      
      const v1 = new THREE.Vector3(positions[i0], positions[i0 + 1], positions[i0 + 2]);
      const v2 = new THREE.Vector3(positions[i1], positions[i1 + 1], positions[i1 + 2]);
      const v3 = new THREE.Vector3(positions[i2], positions[i2 + 1], positions[i2 + 2]);
      
      // Calculate normal
      const edge1 = new THREE.Vector3().subVectors(v2, v1);
      const edge2 = new THREE.Vector3().subVectors(v3, v1);
      const normal = new THREE.Vector3().crossVectors(edge1, edge2).normalize();
      
      allTriangles.push({
        normal,
        vertices: [v1, v2, v3]
      });
    }
  });
  
  console.log(`📊 [STL-CONVERT] Total triangles collected: ${allTriangles.length}`);
  
  if (allTriangles.length === 0) {
    throw new Error('No valid triangles found in meshes for STL conversion');
  }
  
  // Create binary STL
  return createBinarySTL(allTriangles);
}

// Create binary STL buffer from triangle data
function createBinarySTL(triangles: Array<{
  normal: THREE.Vector3;
  vertices: [THREE.Vector3, THREE.Vector3, THREE.Vector3];
}>): Buffer {
  console.log(`🏗️ [BINARY-STL] Creating binary STL with ${triangles.length} triangles`);
  
  const headerSize = 80;
  const triangleCountSize = 4;
  const triangleSize = 50; // 12 floats (48 bytes) + 2 attribute bytes
  const totalSize = headerSize + triangleCountSize + (triangles.length * triangleSize);
  
  const buffer = Buffer.alloc(totalSize);
  let offset = 0;
  
  // Write header (80 bytes)
  const header = `Formily 3D Model - Generated ${new Date().toISOString()}`;
  buffer.write(header, offset, Math.min(header.length, 80), 'ascii');
  offset += headerSize;
  
  // Write triangle count (4 bytes, little-endian)
  buffer.writeUInt32LE(triangles.length, offset);
  offset += triangleCountSize;
  
  // Write triangles
  triangles.forEach((triangle, index) => {
    // Normal vector (3 floats)
    buffer.writeFloatLE(triangle.normal.x, offset); offset += 4;
    buffer.writeFloatLE(triangle.normal.y, offset); offset += 4;
    buffer.writeFloatLE(triangle.normal.z, offset); offset += 4;
    
    // Vertices (9 floats)
    triangle.vertices.forEach(vertex => {
      buffer.writeFloatLE(vertex.x, offset); offset += 4;
      buffer.writeFloatLE(vertex.y, offset); offset += 4;
      buffer.writeFloatLE(vertex.z, offset); offset += 4;
    });
    
    // Attribute byte count (2 bytes, typically 0)
    buffer.writeUInt16LE(0, offset); offset += 2;
    
    if ((index + 1) % 1000 === 0) {
      console.log(`🔄 [BINARY-STL] Processed ${index + 1}/${triangles.length} triangles`);
    }
  });
  
  console.log(`✅ [BINARY-STL] Binary STL created: ${buffer.length} bytes`);
  return buffer;
}