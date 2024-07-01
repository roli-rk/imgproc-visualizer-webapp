import { DataLoader } from '../../data-loader/data-loader';
import rawFilePathCardiac from '../../assets/cardiac_0.raw';
import rawFilePathMrt from '../../assets/mrt.raw';
import rawFilePathFoot from '../../assets/foot_256x256x256_uint8.raw';

// Foot-Data: https://github.com/lebarba/WebGLVolumeRendering/blob/5de6351a17d53645919232804dded6de7a060c61/Web/foot.raw, visited 02.01.23
const exampleData = [
    {
        name: 'Cardiac CT',
        path: rawFilePathCardiac,
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
        path: rawFilePathMrt,
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
        path: rawFilePathFoot,
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

// set inner HTML of the module with setting the variable this.innerHTML from class Module.ts
export default class ExampleData extends DataLoader {
    private select: HTMLSelectElement | undefined;
    constructor() {
        super('Example Data Loader');
        this.index = 0;
    }

    protected setInnerModule(): void {
        this.select = document.createElement('select');
        this.select.innerHTML = `
            ${exampleData
                .map(
                    (element) => `
            <option value="${element.name}">${element.name}</option>
            `
                )
                .join('')}
        `;

        this.innerModule?.appendChild(this.select);
        this.onSelectionChange();
    }

    protected async loadFile(): Promise<Blob | undefined> {
        if (this.index != undefined) {
            const response = await fetch(exampleData[this.index].path).then(
                (res) => res.blob()
            );
            return response;
        }
    }

    protected setDataProperties(): void {
        if (this.imageDataOutputs?.[0].data && this.index != undefined) {
            Object.assign(this.imageDataOutputs[0].data, {
                ...exampleData[this.index],
            });
        }
    }

    protected releaseInDataLoadChild(): void {
        delete this.select;
    }

    private onSelectionChange(): void {
        this.select?.addEventListener('change', (event) => {
            let selectedIndex = (event.target as HTMLSelectElement)
                .selectedIndex;
            this.index = selectedIndex;
            this.setImageData();
        });
    }
}
