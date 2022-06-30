import { ShadowMapping, ShadowPlane } from '@egr/wcf/modules/core/rendering';
import * as core from '@egr/wcf/modules/core';
import * as tool from '@egr/wcf/modules/core/tool';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import './index.css';
import { CameraControl } from '@egr/wcf/modules/core/view/CameraControl';
/**
 * This components creates the views and the controls of the viewer.
 */

export interface ViewerOptions {
    disableCameraPanning: boolean;
    limitCameraDistanceByElementRadius: boolean;
}
export class ViewerUI {
    private coreApp: core.Application;
    private options: ViewerOptions;

    /**
     * @param multiView If true, four views will be created instead of one.
     */
    constructor(coreApp: core.Application, options: ViewerOptions) {
        this.coreApp = coreApp;
        this.options = options;
        if (this.options.disableCameraPanning) {
            const cameraControl = coreApp.viewer.view.cameraControl;
            cameraControl.panningEnabled = false;
            cameraControl.setFixedTarget(Vector3.Zero());
            cameraControl.dblClickZoomToFitOptions.adjustFixedTarget = false;
            // cameraControl.orbitInertia = 0.95; // uncomment if you want some movement after the user releases mouse button
        }
        // add user interaction with the articles in the 3d view
        const defaultTool: tool.SelectionDefault = new tool.SelectionDefault(this.coreApp);
        defaultTool.deselectionEnabled = false;
        defaultTool.showMainElementSelection = false;
        defaultTool.showElementInteractors = true;
        this.coreApp.tools.defaultTool = defaultTool;
        this.coreApp.tools.startDefaultTool();

        // add shadows
        this.coreApp.rendering.addShadowGenerator(new ShadowPlane(this.coreApp)); // shadows on the floor
        this.coreApp.rendering.addShadowGenerator(new ShadowMapping(this.coreApp)); // (directional) shadows on the objects
        // this.coreApp.viewer.ssaoQuality = "Off"; // screenSpaceAmbientOcclusion shadows, can be lowered/increased/disabled (check performance!), only available with webGL2
    }

    /**
     * If we have multiple articles in the scene (i.e. by loading a .pec), then we need to show the user which one is currently selected by a bounding box.
     */
    public allowMainArticleSelection(value: boolean): void {
        if (this.coreApp.tools.defaultTool instanceof tool.SelectionDefault) {
            this.coreApp.tools.defaultTool.showMainElementSelection = value;
            this.coreApp.tools.defaultTool.deselectionEnabled = value;
        }
    }

    /**
     * Should by called after inserting new elements.
     */
    public resetCamera(): void {
        if (this.options.disableCameraPanning) {
            this.coreApp.viewer.view.cameraControl.setFixedTarget(this.getCenterOfSceneElement());
        }
        if (this.options.limitCameraDistanceByElementRadius) {
            const radiusMultiplier = 3; // should be changed to value you want
            const maxZoomRadius: number = this.getRadiusOfSceneElement() * radiusMultiplier; // maxZoomRadius can also be a fixed value, but we take size of element into count
            this.coreApp.viewer.view.cameraControl.setNavigationArea(maxZoomRadius, this.getCenterOfSceneElement());
        }
        this.coreApp.viewer.view.cameraControl.setPosition(CameraControl.DEFAULT_CAMERA_POSITION);
        this.coreApp.viewer.view.cameraControl.zoomToFitElements(null);
        this.coreApp.viewer.requestRenderFrame();
    }
    private getCenterOfSceneElement(): Vector3 {
        if (this.coreApp.model.elements.length > 0 && this.coreApp.model.elements[0].boundingBox.isValid()) {
            return this.coreApp.model.elements[0].boundingBox.getCenter();
        }
        return Vector3.Zero();
    }
    private getRadiusOfSceneElement(): number {
        if (this.coreApp.model.elements.length > 0 && this.coreApp.model.elements[0].boundingBox.isValid()) {
            return this.coreApp.model.elements[0].boundingBox.getRadius();
        }
        return 20; // 20 meter, if nothing is in the scene
    }
}