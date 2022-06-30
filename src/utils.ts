export function isIOSBrowser(): boolean {
    return (
        navigator.userAgent.indexOf("iPad") > -1 ||
        navigator.userAgent.indexOf("iPhone") > -1 ||
        navigator.userAgent.indexOf("iPod") > -1
    );
}
export abstract class HtmlUtils {
    public static removeAllChildren(htmlElement: HTMLElement): void {
        while (htmlElement.lastChild) {
            htmlElement.removeChild(htmlElement.lastChild);
        }
    }
    public static getNotNullElementById(id: string): HTMLElement {
        const element = document.getElementById(id);
        if (element == null) {
            throw new Error(`Html element with id "${id}" not found`);
        }
        return element;
    }
}