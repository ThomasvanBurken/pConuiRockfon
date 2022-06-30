import { HtmlUtils } from '../../utils';
import './index.css';
/**
 * Used for showing a loading animation.
 */
export class ProgressUI {
    private static calls = 0;
    private static progressElement: HTMLElement = HtmlUtils.getNotNullElementById('progress');

    public static beginLoading(): void {
        this.calls++;
        if (this.calls === 1) {
            this.progressElement.style.display = 'block';
        }
    }

    public static endLoading(): void {
        this.calls--;
        if (this.calls === 0) {
            this.progressElement.style.display = 'none';
        }
    }
}