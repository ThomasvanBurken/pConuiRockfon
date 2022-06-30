import * as cf from '@egr/wcf/modules/cf';
import * as basket from '@egr/wcf/modules/eaiws/basket';
import { ProgressUI } from '../progress';
import './index.css';
/**
 * Shows commercial information about the current articles in the scene, like article number, price, sub articles etc.
 */
export class BasketUI {
    private articleManager: cf.ArticleManager;
    private onItemClicked: (item: cf.ArticleElement, event: MouseEvent) => void; // callback if user clicks on a basket item
    private htmlContainer: HTMLElement;
    constructor(
        htmlContainer: HTMLElement,
        articleManager: cf.ArticleManager,
        onItemClicked: (item: cf.ArticleElement, event: MouseEvent) => void
    ) {
        this.articleManager = articleManager;
        this.onItemClicked = onItemClicked;
        this.htmlContainer = htmlContainer;
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        articleManager.eventArticleChanged.addListener(this.updateBasket.bind(this)); // if a property of an article was changed, we need to update the basket
    }

    /**
     * Gets articles items from basket service and displays them.
     */
    public async updateBasket(): Promise<void> {
        this.clearHtmlContainer();
        // create new basket html elements
        const mainArticles: Array<cf.MainArticleElement> = this.articleManager.getAllMainArticles();
        for (const mainArticle of mainArticles) {
            this.htmlContainer.append(await this.createBasketItem(mainArticle));
        }
    }

    private clearHtmlContainer(): void {
        while (this.htmlContainer.lastChild) {
            this.htmlContainer.removeChild(this.htmlContainer.lastChild);
        }
    }

    /**
     * Creates a html element for a basket article and its sub articles.
     */
    private async createBasketItem(article: cf.ArticleElement): Promise<HTMLElement> {
        const item: HTMLDivElement = document.createElement('div');
        item.onclick = this.onItemClicked.bind(this, article);
        item.className = 'basket-item';
        const itemProperties: basket.ItemProperties = await article.getItemProperties();
        if (itemProperties.article != null) {
            item.innerHTML = `
                <div class="manufacturer">${itemProperties.article.manufacturerId ?? 'undefined'}</div>
                <div class="series">${itemProperties.article.seriesId ?? 'undefined'}</div>
                <div class="baseArticleNumber">${itemProperties.article.baseArticleNumber ?? 'undefined'}</div>
                <div class="short-text">${itemProperties.article.shortText ?? 'undefined'}</div>
                <div class="long-text">${itemProperties.article.longText ?? 'undefined'}</div>
                <div class="feature-text">${itemProperties.article.featureText ?? 'undefined'}</div>
                <div class="price">${itemProperties.article.salesPrice ?? 'undefined'} ${itemProperties.article.salesCurrency ?? 'undefined'}</div>
            `;
        }
        // sub articles
        const subArticles: Array<cf.SubArticleElement> = article.getSubArticles(false);
        if (subArticles.length > 0) {
            const subItems: HTMLDivElement = document.createElement('div');
            subItems.className = 'basket-sub-items';
            item.appendChild(subItems);
            for (const subArticle of subArticles) {
                subItems.appendChild(await this.createBasketItem(subArticle));
            }
        }

        // handle migration of older articles (.obk, .pec)
        if (article instanceof cf.MainArticleElement) {
            const ofmlState: basket.OFMLUpdateState = await article.getOfmlUpdateState();
            item.dataset.updateState = ofmlState;
            if (ofmlState === 'Migratable' || ofmlState === 'Updatable') {
                const migrationButton: HTMLButtonElement = document.createElement('button');
                migrationButton.innerText = ofmlState === 'Migratable' ? 'Migrate article' : 'Update article';
                migrationButton.onclick = async () => {
                    ProgressUI.beginLoading();
                    await article.updateOfmlArticle(true, true);
                    ProgressUI.endLoading();
                };
                item.appendChild(migrationButton);
            }
        }
        return item;
    }
}