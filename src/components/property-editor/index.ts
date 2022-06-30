import { MultiPropertyProvider, Property, PropertyChangedResult, PropertyClass, PropertyValue } from '@egr/wcf/modules/core/prop';
import { isNullOrEmpty } from '@egr/wcf/modules/utils/string';
import { HtmlUtils } from '../../utils';
import { ProgressUI } from '../progress';
import './index.css';
/**
 * For configuring articles.
 * Shows article properties and their options to the user. So he can change properties of an article.
 */
export class PropertyEditorUI {
    private activeProperty: Property | null; // the current by the user clicked property, null if no property is clicked
    private propertyProvider: MultiPropertyProvider; // current selected element, which provides the properties (will be updated by the core)
    private htmlContainer: HTMLElement;

    constructor(htmlContainer: HTMLElement, propertyProvider: MultiPropertyProvider) {
        this.propertyProvider = propertyProvider;
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        this.propertyProvider.eventPropertiesChanged.addListener(this.onPropertiesChanged.bind(this));
        this.htmlContainer = htmlContainer;
    }
    private async onPropertiesChanged(result?: PropertyChangedResult): Promise<void> {
        if (result !== PropertyChangedResult.Nothing) {
            this.activeProperty = null;
            await this.updatePropertyEditor();
        }
    }

    /**
     * Gets properties/classes/choices of the current property provider and creates ui for those.
     */
    private async updatePropertyEditor(): Promise<void> {
        HtmlUtils.removeAllChildren(this.htmlContainer);
        try {
            const propertyClasses: Array<PropertyClass> = await this.propertyProvider.getPropertyClasses();
            const properties: Array<Property> = await this.propertyProvider.getProperties();
            // create a default class which will be used for properties, which belong to no class
            const defaultClass: PropertyClass = new PropertyClass();
            defaultClass.key = '';
            defaultClass.name = 'Properties';
            propertyClasses.push(defaultClass);

            propertyClasses.forEach((propertyClass: PropertyClass) => {
                const propertiesOfClass: Array<Property> = properties.filter((property) => {
                    // if the property has no class, assign "" so it gets the default class we created before
                    const className: string = property.class != null ? property.class : '';
                    return className === propertyClass.key;
                });
                if (propertiesOfClass.length > 0) {
                    const htmlPropertyClass: HTMLElement = this.createPropertyClass(propertyClass);
                    this.htmlContainer.appendChild(htmlPropertyClass);
                    propertiesOfClass.forEach((property) => { htmlPropertyClass.appendChild(this.createPropertyItem(property)) });
                }
            });
        } catch (e) {
            console.error('failed to get properties', e);
            this.htmlContainer.innerText = 'Migration of article might be required.';
        }
    }

    /**
     * Property classes are like a category for properties.
     */
    private createPropertyClass(propertyClass: PropertyClass): HTMLElement {
        const propClassHtml: HTMLDivElement = document.createElement('div');
        if (propertyClass.name != null) {
            propClassHtml.innerText = propertyClass.name;
        }
        propClassHtml.className = 'property-class';
        return propClassHtml;
    }

    private createPropertyItem(property: Property): HTMLElement {
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

    /**
     * If user clicks a property we show the possible choices or let the user directly input a value (depending on the property type).
     * We store the current clicked property in activeProperty.
     * If it will be clicked again, we remove the choices.
     */
    private async onPropertyClick(property: Property, mouseEvent: MouseEvent): Promise<void> {
        ProgressUI.beginLoading();
        this.removeAllPropertyChoices();
        if (this.activeProperty !== property) {
            if (property.choiceList) {
                const propertyChoices: Array<PropertyValue> | null = await property.getChoices();
                if (propertyChoices != null) {
                    propertyChoices.forEach((propertyValue: PropertyValue) => {
                        if (mouseEvent.target instanceof HTMLElement) {
                            mouseEvent.target.appendChild(this.createPropertyChoice(property, propertyValue));
                        }
                    });
                }
            } else {
                const userInput: string | null = prompt(property.getName());
                if (userInput != null) {
                    await property.setValue(userInput);
                }
            }
            this.activeProperty = property;
        } else {
            this.activeProperty = null;
        }
        ProgressUI.endLoading();
    }

    private removeAllPropertyChoices(): void {
        const propertyChoices: HTMLCollectionOf<Element> = document.getElementsByClassName('property-choice');
        let propertyChoice: Element | null = propertyChoices.item(0);
        while (propertyChoice != null) {
            propertyChoice.remove();
            propertyChoice = propertyChoices.item(0);
        }
    }

    private createPropertyChoice(
        property: Property,
        propertyValue: PropertyValue,
    ): HTMLElement {
        const propertyChoice: HTMLDivElement = document.createElement('div');
        propertyChoice.className = 'property-choice' + (property.getValue()?.value === propertyValue.value ? ' selected' : '');
        propertyChoice.onclick = async () => {
            ProgressUI.beginLoading();
            await property.setValue(propertyValue.value);
            ProgressUI.endLoading();
        };
        if (!isNullOrEmpty(propertyValue.largeIcon)) {
            const icon: HTMLImageElement = document.createElement('img');
            icon.src = propertyValue.largeIcon;
            propertyChoice.appendChild(icon);
        }
        if (!isNullOrEmpty(propertyValue.text)) {
            const label: HTMLDivElement = document.createElement('div');
            label.innerText = propertyValue.text;
            propertyChoice.appendChild(label);
        }
        return propertyChoice;
    }
}