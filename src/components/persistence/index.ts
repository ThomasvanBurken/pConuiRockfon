import * as cf from '@egr/wcf/modules/cf';
import { ProgressUI } from '../progress';
import './index.css';

/**
 * Used for saving and loading a project.
 */
export class PersistenceUI {
    constructor(htmlContainer: HTMLElement, articleManager: cf.ArticleManager, onLoad: (file: Blob, fileType: 'obk' | 'pec') => Promise<void>) {
        const save: HTMLButtonElement = document.createElement('button');
        save.className = 'save';
        save.innerText = 'Save .obk';
        save.onclick = this.onSaveClicked.bind(this, articleManager);
        htmlContainer.appendChild(save);

        const load: HTMLInputElement = document.createElement('input');
        load.className = 'load';
        load.type = 'file';
        load.accept = '.obk,.pec';
        load.onchange = this.onLoadClicked.bind(this, onLoad);
        htmlContainer.appendChild(load);
    }

    private async onSaveClicked(articleManager: cf.ArticleManager): Promise<void> {
        ProgressUI.beginLoading();
        await articleManager.synchronizeSession(true); // so the server has all new data and we can save it in the next line
        const pathToSavedScene: string = await articleManager.session.session.saveSession(null);
        ProgressUI.endLoading();
        window.location.href = pathToSavedScene;
    }

    private async onLoadClicked(onLoad: (file: Blob, fileType: 'obk' | 'pec') => Promise<void>, event: Event): Promise<void> {
        if (event.target instanceof HTMLInputElement && event.target.files != null && event.target.files.length > 0) {
            const fileExtension: string = event.target.files[0].name.substr(event.target.files[0].name.length - 3).toLocaleLowerCase();
            if (fileExtension === 'obk' || fileExtension === 'pec') {
                await onLoad(event.target.files[0], fileExtension);
            } else {
                alert('no .obk/.pec file given');
            }
        }
    }
}