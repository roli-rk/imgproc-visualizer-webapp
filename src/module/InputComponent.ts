export class InputComponent extends HTMLElement {
    private _object: any = null;

    // Definiere die "object"-Property
    set object(value: any) {
        this._object = value;
        console.log(value);
        this.render();
    }

    get object() {
        return this._object;
    }

    constructor() {
        super();
    }

    // Names of the attributes to be observed
    static get observedAttributes() {
        return ['object'];
    }

    // Beim ersten Anfügen an den DOM wird gerendert
    connectedCallback() {
        this.render();
    }

    attributeChangedCallback(name: string, oldValue: string, newValue: string) {
        console.log(name);
        console.log(newValue);
        if (oldValue !== newValue) {
            if (name === 'object') {
                this.object = newValue;
            }
            this.render();
        }
    }

    render() {
        // Beispielhafte Darstellung des Objekts
        this.innerHTML = `
        <div>
          <p>Object: ${JSON.stringify(this._object)}</p>
          <input type="text" value="${this._object ? this._object.name : ''}" />
        </div>
      `;
        const input = this.querySelector('input');
        if (input) {
            input.addEventListener('input', (e: Event) => {
                const target = e.target as HTMLInputElement;
                this.dispatchEvent(
                    new CustomEvent('objectChange', {
                        detail: { ...this._object, name: target.value },
                    })
                );
            });
        }
    }
}
