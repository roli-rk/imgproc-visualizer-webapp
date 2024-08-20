export default class Loader extends HTMLElement {
    constructor() {
        super();

        // Shadow DOM erstellen und anhängen
        const shadow = this.attachShadow({ mode: 'open' });

        // HTML-Inhalt des Components
        const template = document.createElement('template');
        template.innerHTML = `
            <style>
                .module {
                    border: 1px solid #ccc;
                    padding: 10px;
                    margin: 10px;
                }
                .myButton {
                    background-color: #008CBA;
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    text-align: center;
                    text-decoration: none;
                    display: inline-block;
                    font-size: 16px;
                    margin: 4px 2px;
                    cursor: pointer;
                    border-radius: 8px;
                }
            </style>
            <div class="module">
                <button class="myButton">Click me</button>
            </div>
        `;

        // Template-Inhalt ins Shadow DOM kopieren
        shadow.appendChild(template.content.cloneNode(true));
    }

    connectedCallback() {
        const button = this.shadowRoot?.querySelector('.myButton');
        if (button) {
            button.addEventListener('click', this.handleClick.bind(this));
        }
    }

    disconnectedCallback() {
        const button = this.shadowRoot?.querySelector('.myButton');
        if (button) {
            button.removeEventListener('click', this.handleClick.bind(this));
        }
    }

    handleClick(event: Event) {
        console.log('Button clicked!', event);
    }
}
