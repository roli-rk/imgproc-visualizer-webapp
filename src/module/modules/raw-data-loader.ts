import { DataLoader } from '../../data-loader/data-loader';
import html from './raw-data-loader.html';

const exampleData = [
    {
        name: 'Cardiac CT',
        dataType: 'Uint16',
        modality: 'ct',
        width: 512,
        height: 512,
        depth: 337,
        voxelSize: {
            x: 0.390625,
            y: 0.390625,
            z: 0.4,
        },
    },
    {
        name: 'Head MRT',
        dataType: 'Uint16',
        modality: 'mrt',
        width: 512,
        height: 512,
        depth: 144,
        voxelSize: {
            x: 0.5,
            y: 0.5,
            z: 1,
        },
    },
    {
        name: 'Foot CT',
        dataType: 'Uint8',
        modality: 'ct',
        width: 256,
        height: 256,
        depth: 256,
        voxelSize: {
            x: 1,
            y: 1,
            z: 1,
        },
    },
];

export default class RawDataLoader extends DataLoader {
    private blob?: Blob = undefined;
    constructor() {
        super('Raw Data Loader');
        // const shadow = this.attachShadow({ mode: 'open' });

        // // HTML-Inhalt des Components
        // const template = document.createElement('template');
        // template.innerHTML = `
        //     <style>
        //         .loader {
        //             border: 16px solid #f3f3f3;
        //             border-radius: 50%;
        //             border-top: 16px solid #3498db;
        //             width: 120px;
        //             height: 120px;
        //             -webkit-animation: spin 2s linear infinite; /* Safari */
        //             animation: spin 2s linear infinite;
        //         }

        //         /* Safari */
        //         @-webkit-keyframes spin {
        //             0% { -webkit-transform: rotate(0deg); }
        //             100% { -webkit-transform: rotate(360deg); }
        //         }

        //         @keyframes spin {
        //             0% { transform: rotate(0deg); }
        //             100% { transform: rotate(360deg); }
        //         }
        //     </style>
        //     <div class="loader"></div>
        // `;

        // // Template-Inhalt ins Shadow DOM kopieren
        // shadow.appendChild(template.content.cloneNode(true));
        // customElements.define('my-loader', RawDataLoader);
    }

    protected async loadFile(): Promise<Blob | undefined> {
        return await this.blob;
    }
    protected releaseInDataLoadChild(): void {
        throw new Error('Method not implemented.');
    }
    protected setDataProperties(): void {
        if (this.imageDataOutputs?.[0].data && this.index != undefined) {
            Object.assign(this.imageDataOutputs[0].data, {
                ...exampleData[0],
            });
        }
    }
    protected setInnerModule(): void {
        if (this.innerModule) {
            this.innerModule.innerHTML = this.innerModule.innerHTML + html;

            const fileInput = document.querySelector(
                'input'
            ) as HTMLInputElement;
            fileInput.addEventListener('change', async (event) => {
                const file = (event.target as HTMLInputElement).files?.[0];
                if (file) {
                    const response = await this.readFileAsBlob(file);
                    this.blob = response;
                    this.setImageData();

                    console.log(this.imageDataOutputs?.[0]);
                } else {
                    console.error('No file selected');
                }
            });
        }
    }

    private readFileAsBlob(file: File): Promise<Blob> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = () => {
                if (reader.result) {
                    const blob = new Blob([reader.result]);
                    resolve(blob);
                } else {
                    reject(new Error('File read error'));
                }
            };
            reader.onerror = () => {
                reject(new Error('Error reading file'));
            };
            reader.readAsArrayBuffer(file);
        });
    }
}
