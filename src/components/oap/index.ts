import { ProgressUI } from '../progress';
import './index.css';
import { MultiPropertyProvider, Property, PropertyChangedResult, PropertyValue } from '@egr/wcf/modules/core/prop';
import { SceneElement } from '@egr/wcf/modules/core/mdl';
import { AppCallbacks } from '@egr/wcf/modules/core';
import { isNullOrEmpty } from '@egr/wcf/modules/utils/string';
import { HtmlUtils } from '../../utils';
/**
 * This class handles OAP (OFML aided planning).
 * If an OAP-Icon is clicked by the user, a popup at this location will be created.
 * To see this class in action, the OAP-feature must be present in the OFML-data.
 * @see https://www.easterngraphics.com/en/newsletter/2018-01-en.html#c13090
 */
export class OapUI {
    private htmlContainer: HTMLElement;
    constructor(htmlContainer: HTMLElement, propertyProvider: MultiPropertyProvider, appCallbacks: AppCallbacks) {
        propertyProvider.eventPropertiesChanged.addListener(this.onPropertiesChanged.bind(this));

        // setup core oap callback functions
        appCallbacks.showPropertyEditor = this.showPropertyEditorPopup.bind(this);
        appCallbacks.showActionChoice = this.showActionsPopup.bind(this);
        appCallbacks.beginAsyncOperation = () => ProgressUI.beginLoading();
        appCallbacks.endAsyncOperation = () => ProgressUI.endLoading();
        appCallbacks.showMedia = this.showMediaPopup.bind(this);
        this.htmlContainer = htmlContainer;
    }

    /**
     * We remove the popup if the properties changed. Because the values in popup might not be valid anymore.
     */
    private onPropertiesChanged(result?: PropertyChangedResult): void {
        if (result !== PropertyChangedResult.Nothing) {
            this.removeOapPopup();
        }
    }

    private removeOapPopup(): void {
        HtmlUtils.removeAllChildren(this.htmlContainer);
    }

    /**
     * Shows the property choices of an oap property at the position of the oap configure icon.
     * It like a tiny property editor at the icon position.
     */
    private async showPropertyEditorPopup(
        sceneElement: SceneElement,
        getPropertiesCallback: () => Promise<Array<Property>>,
        options: AppCallbacks.ShowPropertyEditorOptions
    ): Promise<void> {
        this.removeOapPopup();
        if (options.originReference != null) {
            this.htmlContainer.style.top = options.originReference.top.toString() + 'px';
            this.htmlContainer.style.left = options.originReference.left.toString() + 'px';
        }
        this.htmlContainer.appendChild(this.createHeader(options))
        const propertiesContainer: HTMLDivElement = document.createElement('div');
        propertiesContainer.className = 'oap-properties';
        this.htmlContainer.appendChild(propertiesContainer);

        const properties: Array<Property> = await getPropertiesCallback();
        if (properties.length === 1 && properties[0].choiceList) { // if we have only one property, we show the property choices directly
            const choices: Array<PropertyValue> | null = await properties[0].getChoices();
            if (choices != null) {
                choices.forEach((choice) => {
                    propertiesContainer.appendChild(this.createPropertyChoice(properties[0], choice))
                });
            }
        } else {
            for (const property of properties) {
                propertiesContainer.appendChild(this.createProperty(property));
            }
        }
    }

    private createProperty(property: Property): HTMLElement {
        const propertyHtml: HTMLDivElement = document.createElement('div');
        const propertyValue: PropertyValue | null = property.getValue();
        propertyHtml.innerText = property.getName() + ': ' + (propertyValue?.text ?? '');
        propertyHtml.className = 'property';
        if (property.editable && property.visible) {
            propertyHtml.onclick = this.onPropertyClick.bind(this, property);
        }
        // save information in dataset css
        propertyHtml.dataset.editable = property.editable ? 'true' : 'false';
        propertyHtml.dataset.visible = property.visible ? 'true' : 'false';
        propertyHtml.dataset.choiceList = property.choiceList ? 'true' : 'false';
        return propertyHtml;
    }

    private async onPropertyClick(property: Property): Promise<void> {
        if (property.choiceList) {
            ProgressUI.beginLoading();
            HtmlUtils.removeAllChildren(this.htmlContainer);
            this.htmlContainer.appendChild(this.createHeader({ title: property.getName() }));
            const propertyChoices: Array<PropertyValue> | null = await property.getChoices();
            if (propertyChoices != null) {
                propertyChoices.forEach((propertyValue: PropertyValue) => {
                    this.htmlContainer.appendChild(this.createPropertyChoice(property, propertyValue));
                });
            }
            ProgressUI.endLoading();
        } else {
            const userInput: string | null = prompt(property.getName());
            if (userInput != null) {
                await property.setValue(userInput);
            }
        }
    }

    private createPropertyChoice(
        property: Property,
        propertyValue: PropertyValue,
    ): HTMLElement {
        const propertyChoiceHtml: HTMLDivElement = document.createElement('div');
        const currentPropertyValue: PropertyValue | null = property.getValue();
        propertyChoiceHtml.className = 'property-choice' + ((currentPropertyValue?.value === propertyValue.value) ? ' selected' : '');
        propertyChoiceHtml.onclick = async () => {
            ProgressUI.beginLoading();
            await property.setValue(propertyValue.value);
            ProgressUI.endLoading();
        };
        if (!isNullOrEmpty(propertyValue.largeIcon)) {
            const icon: HTMLImageElement = document.createElement('img');
            icon.src = propertyValue.largeIcon;
            propertyChoiceHtml.appendChild(icon);
        }
        if (!isNullOrEmpty(propertyValue.text)) {
            const label: HTMLDivElement = document.createElement('div');
            label.innerText = propertyValue.text;
            propertyChoiceHtml.appendChild(label);
        }
        return propertyChoiceHtml;
    }

    /**
     * Shows a popup for the oap actions at the position of the oap action icon.
     */
    private showActionsPopup(
        actions: Array<AppCallbacks.ChoiceAction>,
        options: AppCallbacks.ShowActionChoiceOptions
    ): void {
        this.removeOapPopup();
        if (options.originReference != null) {
            this.htmlContainer.style.top = options.originReference.top.toString() + 'px';
            this.htmlContainer.style.left = options.originReference.left.toString() + 'px';
        }
        this.htmlContainer.appendChild(this.createHeader(options))
        const actionsHtml: HTMLDivElement = document.createElement('div');
        actionsHtml.className = 'oap-actions ' + options.displayMode; // tile or list view
        this.htmlContainer.appendChild(actionsHtml);
        actions.forEach((action) => this.createActionChoice(action, actionsHtml, options.tileSize));
    }
    private createHeader(options: { title?: string, goBack?: () => void }): HTMLElement {
        const header: HTMLElement = document.createElement('header');
        if (options.goBack != null) {
            const back: HTMLElement = document.createElement('div');
            back.innerText = '<';
            back.className = 'back';
            back.onclick = () => {
                options.goBack?.();
            };
            header.appendChild(back);
        }
        const title: HTMLElement = document.createElement('div');
        title.innerText = options.title ?? '';
        title.className = 'title';
        header.appendChild(title);
        const close: HTMLElement = document.createElement('div');
        close.innerText = 'X';
        close.className = 'close';
        close.onclick = () => { this.removeOapPopup(); };
        header.appendChild(close);
        return header;
    }

    /**
     * Creates an html element for an action choice.
     */
    private createActionChoice(
        action: AppCallbacks.ChoiceAction,
        parentPropertyItem: HTMLDivElement,
        tileSize: 'small' | 'medium' | 'large' | undefined
    ): void {
        const actionChoice: HTMLDivElement = document.createElement('div');
        actionChoice.className = 'oap-action' + (tileSize !== undefined ? ' ' + tileSize : '');
        actionChoice.onclick = async () => {
            await action.execute();
        };
        if (action.image != null) {
            parentPropertyItem.appendChild(actionChoice);
            const icon: HTMLImageElement = document.createElement('img');
            icon.className = 'oap-action-icon';
            icon.src = action.image;
            actionChoice.appendChild(icon);
        }
        if (action.text != null) {
            const label: HTMLDivElement = document.createElement('div');
            label.innerText = action.text;
            label.className = 'oap-action-label';
            actionChoice.appendChild(label);
        }
    }
    /**
    * Shows a popup for the oap actions at the position of the oap action icon.
    */
    private showMediaPopup(
        media: AppCallbacks.Media,
        options: AppCallbacks.ShowMediaOptions
    ): void {
        this.removeOapPopup();
        this.htmlContainer.className = 'oap-media';
        if (options.originReference != null) {
            this.htmlContainer.style.top = options.originReference.top.toString() + 'px';
            this.htmlContainer.style.left = options.originReference.left.toString() + 'px';
        }
        if (media.type === 'YouTube') {
            const youTube: HTMLIFrameElement = document.createElement('iframe');
            youTube.width = '560px';
            youTube.height = '315px';
            youTube.allowFullscreen = true;
            youTube.frameBorder = '0';
            youTube.src = `https://www.youtube.com/embed/${media.id}?&autoplay=1`;
            this.htmlContainer.appendChild(youTube);

            // add icon to close iFrame
            const closeIcon: HTMLDivElement = document.createElement('div');
            closeIcon.innerText = 'X';
            closeIcon.onclick = () => this.removeOapPopup();
            closeIcon.className = 'close';
            this.htmlContainer.appendChild(closeIcon);
        }
    }
}