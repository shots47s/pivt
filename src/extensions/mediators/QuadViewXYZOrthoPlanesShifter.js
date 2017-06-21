import { PlaneShifter } from 'PlaneShifter';

const THREE = require('three');

export default function QuadViewXYZPlaneShifter(scene, layout, materialManager, planeParams) {
  const perspCam = layout.getBottomRight();
  materialManager.onMaterialChange((mat, dimensions) => {
    this.planeshifter = new PlaneShifter(
      scene.getPlaneSystem(),
      perspCam.getTHREECamera(),
      {
        mouse: perspCam.getMousePosReference(),
      },
    );
    this.planeshifter.on('startInteraction', () => {
      perspCam.setEnabled(false);
    });
    this.planeshifter.on('stopInteraction', () => {
      perspCam.setEnabled(true);
      planeParams.updateFromScene();
    });
    const { x, y, z } = dimensions;
    this.planeshifter.setBoundingBox(
      new THREE.Box3(
        new THREE.Vector3(-x / 2, -y / 2, -z / 2),
        new THREE.Vector3(x / 2, y / 2, z / 2)),
    );
  });
}