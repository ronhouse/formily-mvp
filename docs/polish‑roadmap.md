# Polishing Roadmap: STL Output Quality

## ⧍ Action Items
1. Normalize model size (e.g. max dimension = 100 mm)
2. Remove photo background before STL generation
3. Add STL quality gate — minimum mesh size threshold
4. Render preview snapshot from `.glb` before `.stl`
5. Optimize mesh smoothing & remove artifacts
6. Offer `.glb` download for full-color viewing

# ✨ STL Generation Polish Roadmap

## A. Normalize Model Scale
- [x] Auto-scale model to fit within bounding box (100mm max dimension)
- [x] Center model at origin
- [ ] Set consistent unit scaling across all STL exports

## B. Background Removal Improvements
- [x] Implement hybrid system using Replicate (rembg) and OpenCV
- [ ] Investigate why Replicate model fails or is deprecated
- [ ] Enable background preview or image validation post-cleaning

## C. STL Quality Checks
- [ ] Add minimum STL file size validation (e.g. 10KB)
- [ ] Set order status to `failed` with message if STL fails or file is invalid
- [ ] Add test validator to open STL in headless viewer (optional)

## D. User Preview (Optional)
- [ ] Render `.glb` snapshot for preview before STL download
- [ ] Allow user to rotate/zoom model on confirmation screen
- [ ] Save `.glb` thumbnails for support/debugging

## E. Future Enhancement Ideas
- [ ] Add printable base to improve slicer success
- [ ] Clean mesh artifacts and simplify geometry
- [ ] Offer option to add pedestal or labels (for trophies/memorials)

## Notes:
Phase 5 will be a full automation rebuild using n8n to modularize all these steps into discrete, debuggable actions.
