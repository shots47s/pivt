import * as THREE from 'three';
import {
  Image3DToMosaicFilter,
  Image3DGenericDecoder,
} from 'pixpipejs';
import { MessageBox } from 'element-ui';

import MaterialBufferLoader from './MaterialBufferLoader';

import BufferManager from '../../BufferManager';

const bufferManager = BufferManager.getInstance();


/**
 * PlanesMaterialManager sets the material of the planes in the OrthoPlanes scene.
 * PlanesMaterialManager also offers a method for creating a shader that samples
 * an MNI volume loaded into the list of file buffers.
 */
export default class PlanesMaterialManager {
  constructor(view) {
    this.sidebarWidget = MaterialBufferLoader;
    this.scene = view.scene;
    this.materialChangeCallbacks = [];
    this.texturesCreatedCallbacks = [];
    this.volumeTextures = [];
  }
  getCurrentVolumeTextures() {
    return this.volumeTextures;
  }
  getDimensions() {
    if (this.dimensions) {
      return this.dimensions;
    }
    return { x: 1.0, y: 1.0, z: 1.0, diagonal: Math.sqrt(3) };
  }
  getPlaneMaterial() {
    return this.scene.planeMaterial;
  }
  /**
   * set the OrthoPlane plane materials and call the material loaded callbacks
   * with the dimensions of the material.
   * @param {THREE.Material} material
   * @param {Object} dimensions
   */
  setShaderMaterial(material, dimensions) {
    this.dimensions = dimensions;
    const planeSize = 2 * dimensions.diagonal;
    this.scene.planeMaterial = material.clone();
    this.scene.planeGeometry = new THREE.PlaneGeometry(planeSize, planeSize);
    this.scene.initializePlanes();
    this.materialChangeCallbacks.forEach((f) => {
      if (f instanceof Function) {
        f(this.scene.planeMaterial, dimensions, this.mniVolume);
      }
    });
  }
  /**
   * Using a buffer in the file buffer list, use pixpipe Image3DGenericDecoder
   * to decode the buffer and then use Image3DToMosaicFilter to convert the
   * Image3D into a mosiac. Use the mosiac to generates textures
   * which can be sampled in a webGL shader.
   * When the textures are created call the texturesCreatedCallbacks handlers.
   * If the loading fails or completes, the passed callback is called.
   * @param  {Object}   bufferMeta bufferMeta holding the volume data.
   * @param  {Function} callback   completion/failure callback.
   */
  createTextureFromBuffer(bufferMeta) {
    const { buffer, name, checksum } = bufferMeta;
    const decoder = new Image3DGenericDecoder();
    return new Promise((resolve) => {
      decoder.addInput(buffer);
      decoder.update();
      if (!decoder.getNumberOfOutputs()) {
        MessageBox.alert(`Cannot decode ${name} into a buffer.`, 'Decoding Error', {
          confirmButtonText: 'OK',
        });
        resolve();
        return;
      }
      const mniVol = decoder.getOutput();
      if (!mniVol) {
        MessageBox.alert(`Cannot decode ${name} into a buffer.`, 'Decoding Error', {
          confirmButtonText: 'OK',
        });
        resolve();
        return;
      }
      const mosaicFilter = new Image3DToMosaicFilter();
      // genericDecoder ouputs a pixpipe.MniVolume, which iherit pixpipe.Image3D
      // making it compatible with pixpipe.Image3DToMosaicFilter
      mosaicFilter.addInput(mniVol);
      // which axis do we want the picture of?
      const space = 'zspace';
      mosaicFilter.setMetadata('axis', space);

      // if time series, take it all
      mosaicFilter.setMetadata('time', -1);
      // run the filter
      mosaicFilter.update();
      if (!mosaicFilter.getNumberOfOutputs()) {
        MessageBox.alert('Could not turn decoded buffer into mosiac textures.', 'Texture Error', {
          confirmButtonText: 'OK',
        });
        resolve();
        return;
      }
      // display the output in multiple canvas if needed
      this.volumeTextures = [];
      for (let nbOut = 0; nbOut < mosaicFilter.getNumberOfOutputs(); nbOut += 1) {
        const outputMosaic = mosaicFilter.getOutput(nbOut);
        outputMosaic.setMetadata('min', mniVol.getMetadata('voxel_min'));
        outputMosaic.setMetadata('max', mniVol.getMetadata('voxel_max'));
        const data = outputMosaic.getDataAsUInt8Array();
        const texture = new THREE.DataTexture(
          data,
          outputMosaic.getWidth(),
          outputMosaic.getHeight(),
          THREE.LuminanceFormat,
          THREE.UnsignedByteType,
        );
        texture.needsUpdate = true;
        this.volumeTextures.push(texture);
      }
      const sliceMatrixSize = {};
      sliceMatrixSize.x = mosaicFilter.getMetadata('gridWidth');
      sliceMatrixSize.y = mosaicFilter.getMetadata('gridHeight');
      this.dimensions = {};
      this.dimensions.x = mniVol.getMetadata('xspace').space_length;
      this.dimensions.y = mniVol.getMetadata('yspace').space_length;
      this.dimensions.z = mniVol.getMetadata('zspace').space_length;
      this.dimensions.t = mniVol.getTimeLength();
      const { x, y, z } = this.dimensions;
      this.dimensions.diagonal = Math.sqrt((x * x) + (y * y) + (z * z));
      this.scene.setBoundingBox(
        new THREE.Box3(
          new THREE.Vector3(-x / 2, -y / 2, -z / 2),
          new THREE.Vector3(x / 2, y / 2, z / 2),
        ),
      );
      this.mniVolume = mniVol;
      this.texturesCreatedCallbacks.forEach((f) => {
        f(this.dimensions, sliceMatrixSize, this.volumeTextures);
      });
      this.bufferChecksum = checksum;
      resolve();
    });
  }
  serialize() {
    return { checksum: this.bufferChecksum };
  }
  deserialize(json) {
    console.log(json);
    const buffer = bufferManager.getByChecksum(json.checksum);
    if (buffer) {
      return this.createTextureFromBuffer(buffer);
    }
    return Promise.resolve();
  }
  onTexturesCreated(callback) {
    if (callback instanceof Function) {
      this.texturesCreatedCallbacks.push(callback);
    }
  }
  onMaterialChange(callback) {
    if (callback instanceof Function) {
      this.materialChangeCallbacks.push(callback);
    }
  }
}
