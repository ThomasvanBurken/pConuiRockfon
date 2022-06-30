import * as cf from '@egr/wcf/modules/cf';
import * as basket from '@egr/wcf/modules/eaiws/basket';
import { Viewer } from '@egr/wcf/modules/core/view/Viewer';
import { isNullOrEmpty } from '@egr/wcf/modules/utils/string';
import { Log } from '@egr/wcf/modules/utils';

import { ProgressUI } from '../progress';
import './index.css';
/**
 * Creates export data like screenshots or 3D files (DWG, 3DS,..).
 */
export class ExportUI {
    constructor(htmlContainer: HTMLElement, articleManager: cf.ArticleManager, viewer: Viewer) {
        htmlContainer.appendChild(this.createButton('Screenshot', this.onScreenshotClicked.bind(this, viewer)));
        htmlContainer.appendChild(this.createButton('3DS', this.onDownloadClicked.bind(this, articleManager, '3DS')));
        htmlContainer.appendChild(this.createButton('DWG', this.onDownloadClicked.bind(this, articleManager, 'DWG')));
        htmlContainer.appendChild(this.createButton('DXF', this.onDownloadClicked.bind(this, articleManager, 'DXF')));
        htmlContainer.appendChild(this.createButton('AR-Android (GLB)', this.onDownloadClicked.bind(this, articleManager, 'GLB')));
        htmlContainer.appendChild(this.createButton('AR-iOS (USDZ)', this.onDownloadClicked.bind(this, articleManager, 'USDZ')));
        // container.appendChild(this.createButton('SKP', this.onDownloadClicked.bind(this, articleManager, 'SKP'))); // works only on windows eaiws servers
    }

    private createButton(text: string, onClick: () => Promise<void>): HTMLButtonElement {
        const button: HTMLButtonElement = document.createElement('button');
        button.className = 'export-item';
        button.innerText = text;
        button.onclick = onClick;
        return button;
    }

    private async onScreenshotClicked(viewer: Viewer): Promise<void> {
        ProgressUI.beginLoading();
        const blob: Blob = await viewer.createScreenshot({ width: 800, height: 600, mimeType: 'image/jpeg' }, true);
        // create download
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
        const msSaveBlob: (blob: Blob, name: string) => void = (navigator as any).msSaveBlob;
        if (msSaveBlob != null) { // for IE
            msSaveBlob(blob, 'screenshot.jpg');
        } else {
            const link: HTMLAnchorElement = document.createElement('a');
            link.style.display = 'none';
            document.body.appendChild(link);

            const url: string = URL.createObjectURL(blob);
            link.href = url;
            link.download = 'screenshot.jpg';
            link.click();

            URL.revokeObjectURL(url);
            document.body.removeChild(link);
        }
        ProgressUI.endLoading();
    }

    private async onDownloadClicked(articleManager: cf.ArticleManager, format: '3DS' | 'DWG' | 'DXF' | 'SKP' | 'USDZ' | 'GLB'): Promise<void> {
        const url: string | undefined = await this.getExportUrl(articleManager, format);
        if (isNullOrEmpty(url)) {
            return;
        }
        switch (format) {
            case 'DWG':
            case 'DXF':
            case '3DS':
            case 'SKP':
                window.location.href = url;
                break;
            case 'GLB':
                this.startWebAR_Android(url);
                break;
            case 'USDZ':
                this.startWebAR_IOS(url);
                break;
        }
    }

    private async getExportUrl(articleManager: cf.ArticleManager, format: '3DS' | 'DWG' | 'DXF' | 'SKP' | 'USDZ' | 'GLB'): Promise<string | undefined> {
        ProgressUI.beginLoading();
        let exportOptions: Array<string> | null = null;
        switch (format) {
            case 'DWG':
                exportOptions = [
                    'format=DWG',
                    'hideSubArticles=false',
                    'no2D=true',
                    'textures=true',
                    'materials=true'
                ];
                break;

            case 'DXF':
                exportOptions = [
                    'format=DWG',
                    'dxf=true',
                    'hideSubArticles=false',
                    'no2D=true',
                    'textures=true',
                    'materials=true'
                ];
                break;

            case '3DS':
                exportOptions = [
                    'format=3DS',
                    'hideSubArticles=false',
                    'textures=true'
                ];
                break;

            case 'SKP':
                exportOptions = [
                    'format=SKP',
                    'hideSubArticles=false',
                    'no2D=true',
                    'textures=false',
                    'textureToColor=true'
                ];
                break;

            case 'GLB':
                exportOptions = [
                    'format=GLTF',
                    'ascii=false',
                    'texTrans=true',
                    'centerXZ=true'
                ];
                break;

            case 'USDZ':
                exportOptions = [
                    'format=USD',
                    'ascii=false',
                    'centerXZ=true'
                ];
                break;
        }
        try {
            const articles: Array<cf.MainArticleElement> = articleManager.getAllMainArticles();

            // export obx
            const obxUrl: string = await articleManager.exportObx(articles);

            // create temporary set article
            const folderId: string = await articleManager.session.basket.insertFolder(null, null, 'Set');
            const setId: string = await articleManager.session.basket.convertToSetArticle(folderId);

            // insert obx into set article
            const pastedIds: Array<string> = await articleManager.session.basket.paste(setId, null, obxUrl);

            // add to set article
            if (pastedIds != null) {
                await articleManager.session.basket.addToSetArticle(pastedIds);

                // export geometry
                const exportUrl: string = await articleManager.session.basket.getExportedGeometry(setId, exportOptions);

                // delete temporary set
                const options: basket.DeleteItemsOptions = new basket.DeleteItemsOptions();
                options.subItems = true;
                await articleManager.session.basket.deleteItems([setId], options);

                // delete temporary obx
                await articleManager.session.deleteFile(obxUrl);
                return exportUrl;
            }
        } catch (error) {
            Log.error('Failed to export geometry. Error: ', error);
        } finally {
            ProgressUI.endLoading();
        }
        return undefined;
    }

    private startWebAR_IOS(exportUrl: string): void {
        const link: HTMLAnchorElement = document.createElement('a');
        link.style.display = 'none';
        link.href = exportUrl;
        link.download = 'scene.usdz';
        document.body.appendChild(link);

        // ar links for IOS have to be marked with "ar" and need to contain an image
        link.rel = 'ar'; // required for IOS
        link.innerHTML = '<img src="w-cf/data/core/textures/fallback.png"/>';
        link.click();

        window.setTimeout(() => {
            document.body.removeChild(link);
        });
    }

    private startWebAR_Android(exportUrl: string): void {

        const location: string = self.location.toString();
        const locationUrl: URL = new URL(location);
        const modelUrl: URL = new URL(exportUrl, location);
        const scheme: string = modelUrl.protocol.replace(':', '');

        const intentParams = `?file=${encodeURIComponent(modelUrl.toString())}&mode=ar_only&resizable=true`;
        const intent = `intent://arvr.google.com/scene-viewer/1.0${intentParams}#Intent;scheme=${scheme};package=com.google.ar.core;action=android.intent.action.VIEW;S.browser_fallback_url=${encodeURIComponent(locationUrl.toString())};end;`;

        const link: HTMLAnchorElement = document.createElement('a');
        link.style.display = 'none';
        link.href = intent;
        document.body.appendChild(link);

        link.click();

        window.setTimeout(() => {
            document.body.removeChild(link);
        });
    }

}